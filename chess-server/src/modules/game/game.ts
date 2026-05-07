import { Chess } from 'chess.js'
import type { Socket } from 'socket.io'
import { sql } from '../../db/client.js'
import { GAME_EVENTS } from './game.events.js'

export interface Player {
  socket: Socket
  userId: string
  username: string
}

interface MoveRecord {
  from: string
  to: string
  san: string
  fen: string
  color: string
  whiteMs: number
  blackMs: number
}

function parseTimeControl(tc: string): { limitMs: number; incrementMs: number } {
  const parts = tc.split('+')
  const base = Math.max(1, parseInt(parts[0], 10) || 5)
  const inc = Math.max(0, parseInt(parts[1], 10) || 0)
  return { limitMs: base * 60 * 1000, incrementMs: inc * 1000 }
}

export class Game {
  readonly id: string
  white: Player
  black: Player
  readonly timeControl: string
  private board = new Chess()
  private ply = 0
  private over = false
  private readonly incrementMs: number
  private whiteMsLeft: number
  private blackMsLeft: number
  private lastMoveAt = 0
  private moveHistory: MoveRecord[] = []
  private abandonTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(id: string, white: Player, black: Player, timeControl: string) {
    this.id = id
    this.white = white
    this.black = black
    this.timeControl = timeControl
    const { limitMs, incrementMs } = parseTimeControl(timeControl)
    this.incrementMs = incrementMs
    this.whiteMsLeft = limitMs
    this.blackMsLeft = limitMs
  }

  async init() {
    try {
      await sql`
        INSERT INTO games (id, white_user_id, black_user_id, mode, status, started_at)
        VALUES (${this.id}, ${this.white.userId}, ${this.black.userId}, 'online', 'active', now())
      `
    } catch (err) {
      console.error('[game] Failed to create game record:', err)
    }

    this.lastMoveAt = Date.now()
    const timePayload = { whiteMs: this.whiteMsLeft, blackMs: this.blackMsLeft }
    const sharedPayload = {
      gameId: this.id,
      timeControl: this.timeControl,
      whiteUsername: this.white.username,
      blackUsername: this.black.username,
      ...timePayload,
    }
    this.white.socket.emit(GAME_EVENTS.GAME_INIT, { color: 'white', ...sharedPayload })
    this.black.socket.emit(GAME_EVENTS.GAME_INIT, { color: 'black', ...sharedPayload })
  }

  async makeMove(socket: Socket, from: string, to: string, promotion = 'q') {
    if (this.over) return

    const isWhiteTurn = this.board.turn() === 'w'
    const mover = isWhiteTurn ? this.white : this.black
    if (socket.id !== mover.socket.id) {
      socket.emit(GAME_EVENTS.GAME_ERROR, { message: 'Not your turn' })
      return
    }

    let result
    try {
      result = this.board.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' })
    } catch {
      socket.emit(GAME_EVENTS.GAME_ERROR, { message: 'Illegal move' })
      return
    }

    const elapsed = Date.now() - this.lastMoveAt
    if (isWhiteTurn) {
      this.whiteMsLeft = Math.max(0, this.whiteMsLeft - elapsed) + this.incrementMs
    } else {
      this.blackMsLeft = Math.max(0, this.blackMsLeft - elapsed) + this.incrementMs
    }
    this.lastMoveAt = Date.now()

    if ((isWhiteTurn && this.whiteMsLeft <= 0) || (!isWhiteTurn && this.blackMsLeft <= 0)) {
      await this.finishByFlag(isWhiteTurn ? 'white' : 'black')
      return
    }

    this.ply++
    const fen = this.board.fen()
    const san = result.san
    const uci = from + to + (result.promotion ?? '')
    const color = result.color
    const moveNumber = Math.ceil(this.ply / 2)

    this.moveHistory.push({ from, to, san, fen, color, whiteMs: this.whiteMsLeft, blackMs: this.blackMsLeft })

    try {
      await sql`
        INSERT INTO moves (game_id, move_number, color, ply, san, uci, fen_after)
        VALUES (${this.id}, ${moveNumber}, ${color}, ${this.ply}, ${san}, ${uci}, ${fen})
      `
      await sql`
        UPDATE games
        SET current_fen = ${fen}, move_count = ${this.ply}, last_move_at = now()
        WHERE id = ${this.id}
      `
    } catch (err) {
      console.error('[game] Failed to persist move:', err)
    }

    const moveEvent = { from, to, san, fen, whiteMs: this.whiteMsLeft, blackMs: this.blackMsLeft }
    this.white.socket.emit(GAME_EVENTS.MOVE_MADE, moveEvent)
    this.black.socket.emit(GAME_EVENTS.MOVE_MADE, moveEvent)

    if (this.board.isGameOver()) {
      await this.finishByBoardState()
    }
  }

  async flag(socket: Socket) {
    if (this.over) return
    const isWhite = socket.id === this.white.socket.id
    const elapsed = Date.now() - this.lastMoveAt
    const remainingMs = isWhite ? this.whiteMsLeft - elapsed : this.blackMsLeft - elapsed
    if (remainingMs > 5000) {
      socket.emit(GAME_EVENTS.GAME_ERROR, { message: 'Clock has not expired' })
      return
    }
    await this.finishByFlag(isWhite ? 'white' : 'black')
  }

  async resign(socket: Socket) {
    if (this.over) return
    this.over = true
    const isWhite = socket.id === this.white.socket.id
    const winner = isWhite ? 'black' : 'white'
    await this.persistResult(isWhite ? 'black_wins' : 'white_wins', 'resignation')
    this.white.socket.emit(GAME_EVENTS.GAME_OVER, { winner, reason: 'resignation' })
    this.black.socket.emit(GAME_EVENTS.GAME_OVER, { winner, reason: 'resignation' })
  }

  async abandon(socket: Socket) {
    if (this.over) return
    this.over = true
    const isWhite = socket.id === this.white.socket.id
    const winner = isWhite ? 'black' : 'white'
    await this.persistResult(isWhite ? 'black_wins' : 'white_wins', 'abandoned')
    const opponent = isWhite ? this.black : this.white
    opponent.socket.emit(GAME_EVENTS.GAME_OVER, { winner, reason: 'opponent_disconnected' })
  }

  scheduleAbandon(socket: Socket, onFinished: () => void, delayMs = 60_000) {
    const socketId = socket.id
    const timer = setTimeout(async () => {
      this.abandonTimers.delete(socketId)
      await this.abandon(socket)
      onFinished()
    }, delayMs)
    this.abandonTimers.set(socketId, timer)
  }

  cancelAbandon(socketId: string) {
    const timer = this.abandonTimers.get(socketId)
    if (timer !== undefined) {
      clearTimeout(timer)
      this.abandonTimers.delete(socketId)
    }
  }

  reconnectPlayer(newSocket: Socket, userId: string): boolean {
    let isWhite: boolean
    let oldSocketId: string
    if (this.white.userId === userId) {
      isWhite = true
      oldSocketId = this.white.socket.id
      this.white = { ...this.white, socket: newSocket }
    } else if (this.black.userId === userId) {
      isWhite = false
      oldSocketId = this.black.socket.id
      this.black = { ...this.black, socket: newSocket }
    } else {
      return false
    }

    this.cancelAbandon(oldSocketId)

    const color = isWhite ? 'white' : 'black'
    const last = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1] : null

    newSocket.emit(GAME_EVENTS.GAME_INIT, {
      color,
      gameId: this.id,
      timeControl: this.timeControl,
      whiteUsername: this.white.username,
      blackUsername: this.black.username,
      whiteMs: this.whiteMsLeft,
      blackMs: this.blackMsLeft,
      fen: this.board.fen(),
      moves: this.moveHistory.map(m => ({ san: m.san, fen: m.fen, color: m.color })),
      turn: this.board.turn() === 'w' ? 'white' : 'black',
      isCheck: this.board.inCheck(),
      lastMove: last ? [last.from, last.to] : null,
    })
    return true
  }

  getPlayerUserIds(): [string, string] {
    return [this.white.userId, this.black.userId]
  }

  isOver() { return this.over }

  hasPlayer(socketId: string) {
    return this.white.socket.id === socketId || this.black.socket.id === socketId
  }

  hasUserId(userId: string) {
    return this.white.userId === userId || this.black.userId === userId
  }

  private async finishByFlag(loser: 'white' | 'black') {
    this.over = true
    const winner = loser === 'white' ? 'black' : 'white'
    await this.persistResult(winner === 'white' ? 'white_wins' : 'black_wins', 'timeout')
    this.white.socket.emit(GAME_EVENTS.GAME_OVER, { winner, reason: 'timeout' })
    this.black.socket.emit(GAME_EVENTS.GAME_OVER, { winner, reason: 'timeout' })
  }

  private async finishByBoardState() {
    this.over = true
    let winner: 'white' | 'black' | 'draw'
    let result: string
    let termination: string

    if (this.board.isCheckmate()) {
      const loserTurn = this.board.turn()
      winner = loserTurn === 'w' ? 'black' : 'white'
      result = winner === 'white' ? 'white_wins' : 'black_wins'
      termination = 'checkmate'
    } else {
      winner = 'draw'
      result = 'draw'
      if (this.board.isStalemate()) termination = 'stalemate'
      else if (this.board.isInsufficientMaterial()) termination = 'insufficient_material'
      else if (this.board.isThreefoldRepetition()) termination = 'threefold_repetition'
      else termination = 'fifty_move_rule'
    }

    await this.persistResult(result, termination)
    this.white.socket.emit(GAME_EVENTS.GAME_OVER, { winner, reason: termination })
    this.black.socket.emit(GAME_EVENTS.GAME_OVER, { winner, reason: termination })
  }

  private async persistResult(result: string, termination: string) {
    try {
      await sql`
        UPDATE games
        SET status      = 'completed',
            result      = ${result}::game_result,
            termination = ${termination}::game_termination,
            completed_at = now()
        WHERE id = ${this.id}
      `
    } catch (err) {
      console.error('[game] Failed to persist result:', err)
    }
  }
}

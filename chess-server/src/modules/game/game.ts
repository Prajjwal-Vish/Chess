import { Chess } from 'chess.js'
import type { Socket } from 'socket.io'
import { sql } from '../../db/client.js'
import { GAME_EVENTS } from './game.events.js'

export interface Player {
  socket: Socket
  userId: string
}

export class Game {
  readonly id: string
  readonly white: Player
  readonly black: Player
  private board = new Chess()
  private ply = 0
  private over = false

  constructor(id: string, white: Player, black: Player) {
    this.id = id
    this.white = white
    this.black = black
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

    this.white.socket.emit(GAME_EVENTS.GAME_INIT, { color: 'white', gameId: this.id })
    this.black.socket.emit(GAME_EVENTS.GAME_INIT, { color: 'black', gameId: this.id })
  }

  async makeMove(socket: Socket, from: string, to: string) {
    if (this.over) return

    const isWhiteTurn = this.board.turn() === 'w'
    const mover = isWhiteTurn ? this.white : this.black
    if (socket.id !== mover.socket.id) {
      socket.emit(GAME_EVENTS.GAME_ERROR, { message: 'Not your turn' })
      return
    }

    let result
    try {
      result = this.board.move({ from, to, promotion: 'q' })
    } catch {
      socket.emit(GAME_EVENTS.GAME_ERROR, { message: 'Illegal move' })
      return
    }

    this.ply++
    const fen = this.board.fen()
    const san = result.san
    const uci = from + to + (result.promotion ?? '')
    const color = result.color
    const moveNumber = Math.ceil(this.ply / 2)

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

    // Send opponent's move to the other player only — sender already applied it locally
    const opponent = socket.id === this.white.socket.id ? this.black : this.white
    opponent.socket.emit(GAME_EVENTS.MOVE_MADE, { from, to, san, fen })

    if (this.board.isGameOver()) {
      await this.finishByBoardState()
    }
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

  isOver() { return this.over }

  hasPlayer(socketId: string) {
    return this.white.socket.id === socketId || this.black.socket.id === socketId
  }
}

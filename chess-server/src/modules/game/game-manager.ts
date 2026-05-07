import type { Socket } from 'socket.io'
import { nanoid } from 'nanoid'
import { Game } from './game.js'
import { GAME_EVENTS } from './game.events.js'

interface PendingUser {
  socket: Socket
  userId: string
  username: string
}

export class GameManager {
  private games = new Map<string, Game>()
  private pendingUsers = new Map<string, PendingUser>() // keyed by timeControl
  private playerGames = new Map<string, string>()        // userId → gameId

  async addUser(socket: Socket, userId: string, username: string, timeControl: string) {
    const existing = this.pendingUsers.get(timeControl)

    if (existing?.socket.id === socket.id) return

    if (existing) {
      this.pendingUsers.delete(timeControl)

      const [white, black] =
        Math.random() < 0.5
          ? [{ socket: existing.socket, userId: existing.userId, username: existing.username },
             { socket, userId, username }]
          : [{ socket, userId, username },
             { socket: existing.socket, userId: existing.userId, username: existing.username }]

      const game = new Game(nanoid(12), white, black, timeControl)
      this.games.set(game.id, game)
      this.playerGames.set(white.userId, game.id)
      this.playerGames.set(black.userId, game.id)
      await game.init()
    } else {
      this.pendingUsers.set(timeControl, { socket, userId, username })
      socket.emit(GAME_EVENTS.WAITING)
    }
  }

  async handleMove(socket: Socket, from: string, to: string, promotion?: string) {
    const game = this.findGame(socket.id)
    if (!game) {
      socket.emit(GAME_EVENTS.GAME_ERROR, { message: 'No active game' })
      return
    }
    await game.makeMove(socket, from, to, promotion)
    if (game.isOver()) this.cleanupGame(game.id)
  }

  async handleFlag(socket: Socket) {
    const game = this.findGame(socket.id)
    if (!game) return
    await game.flag(socket)
    if (game.isOver()) this.cleanupGame(game.id)
  }

  async handleResign(socket: Socket) {
    const game = this.findGame(socket.id)
    if (!game) return
    await game.resign(socket)
    this.cleanupGame(game.id)
  }

  async handleDisconnect(socket: Socket) {
    // Remove from pending queue if waiting
    for (const [tc, pending] of this.pendingUsers) {
      if (pending.socket.id === socket.id) {
        this.pendingUsers.delete(tc)
        return
      }
    }
    // Schedule a 60-second grace period before forfeiting
    const game = this.findGame(socket.id)
    if (game) {
      game.scheduleAbandon(socket, () => {
        this.cleanupGame(game.id)
      })
    }
  }

  async handleReconnect(socket: Socket, userId: string, gameId: string) {
    const registeredGameId = this.playerGames.get(userId)
    if (!registeredGameId || registeredGameId !== gameId) {
      socket.emit(GAME_EVENTS.GAME_ERROR, { message: 'Game not found or already over' })
      return
    }
    const game = this.games.get(gameId)
    if (!game || game.isOver()) {
      this.playerGames.delete(userId)
      socket.emit(GAME_EVENTS.GAME_ERROR, { message: 'Game not found or already over' })
      return
    }
    const ok = game.reconnectPlayer(socket, userId)
    if (!ok) {
      socket.emit(GAME_EVENTS.GAME_ERROR, { message: 'Player not in game' })
    }
  }

  private cleanupGame(gameId: string) {
    const game = this.games.get(gameId)
    if (game) {
      const [u1, u2] = game.getPlayerUserIds()
      this.playerGames.delete(u1)
      this.playerGames.delete(u2)
    }
    this.games.delete(gameId)
  }

  private findGame(socketId: string): Game | undefined {
    for (const game of this.games.values()) {
      if (game.hasPlayer(socketId)) return game
    }
  }
}

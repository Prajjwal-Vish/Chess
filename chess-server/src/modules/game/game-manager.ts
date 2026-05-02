import type { Socket } from 'socket.io'
import { nanoid } from 'nanoid'
import { Game } from './game.js'
import { GAME_EVENTS } from './game.events.js'

export class GameManager {
  private games = new Map<string, Game>()
  private pendingUser: { socket: Socket; userId: string } | null = null

  async addUser(socket: Socket, userId: string) {
    // Guard: same socket already pending (e.g. double init_game)
    if (this.pendingUser?.socket.id === socket.id) return

    if (this.pendingUser) {
      const { socket: p1, userId: p1Id } = this.pendingUser
      this.pendingUser = null

      // Randomly assign colors
      const [white, black] =
        Math.random() < 0.5
          ? [{ socket: p1, userId: p1Id }, { socket, userId }]
          : [{ socket, userId }, { socket: p1, userId: p1Id }]

      const game = new Game(nanoid(12), white, black)
      this.games.set(game.id, game)
      await game.init()
    } else {
      this.pendingUser = { socket, userId }
      socket.emit(GAME_EVENTS.WAITING)
    }
  }

  async handleMove(socket: Socket, from: string, to: string) {
    const game = this.findGame(socket.id)
    if (!game) {
      socket.emit(GAME_EVENTS.GAME_ERROR, { message: 'No active game' })
      return
    }
    await game.makeMove(socket, from, to)
    if (game.isOver()) this.games.delete(game.id)
  }

  async handleResign(socket: Socket) {
    const game = this.findGame(socket.id)
    if (!game) return
    await game.resign(socket)
    this.games.delete(game.id)
  }

  async handleDisconnect(socket: Socket) {
    if (this.pendingUser?.socket.id === socket.id) {
      this.pendingUser = null
      return
    }
    const game = this.findGame(socket.id)
    if (game) {
      await game.abandon(socket)
      this.games.delete(game.id)
    }
  }

  private findGame(socketId: string): Game | undefined {
    for (const game of this.games.values()) {
      if (game.hasPlayer(socketId)) return game
    }
  }
}

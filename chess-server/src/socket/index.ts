import { Server } from 'socket.io'
import type { FastifyInstance } from 'fastify'
import { GameManager } from '../modules/game/game-manager.js'
import { GAME_EVENTS } from '../modules/game/game.events.js'

export function setupSocket(app: FastifyInstance) {
  const allowedOrigins = [
    process.env.CLIENT_URL ?? 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174',
  ]

  // WebSocket-only: skip polling so Fastify's HTTP handler doesn't intercept
  // the /socket.io/? polling requests and return 404s before engine.io can handle them.
  const io = new Server(app.server, {
    cors: { origin: allowedOrigins, credentials: true },
    transports: ['websocket'],
  })

  const gameManager = new GameManager()

  // Authenticate every connection via the JWT access token.
  // JWT is signed as { sub: userId, username } — use payload.sub for userId.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Unauthorized'))
    try {
      const payload = app.jwt.verify<{ sub: string; username: string }>(token)
      socket.data.userId = payload.sub
      socket.data.username = payload.username ?? 'Anonymous'
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    const username = socket.data.username as string

    socket.on(GAME_EVENTS.INIT_GAME, (payload?: { timeControl?: string }) => {
      const tc = typeof payload?.timeControl === 'string' ? payload.timeControl : '5+0'
      gameManager.addUser(socket, userId, username, tc).catch(console.error)
    })

    socket.on(GAME_EVENTS.RECONNECT_GAME, (payload?: { gameId?: string }) => {
      const gameId = typeof payload?.gameId === 'string' ? payload.gameId : null
      if (!gameId) {
        socket.emit(GAME_EVENTS.GAME_ERROR, { message: 'Missing gameId' })
        return
      }
      gameManager.handleReconnect(socket, userId, gameId).catch(console.error)
    })

    socket.on(GAME_EVENTS.MOVE, (payload: { from: string; to: string; promotion?: string }) => {
      if (typeof payload?.from === 'string' && typeof payload?.to === 'string') {
        gameManager.handleMove(socket, payload.from, payload.to, payload.promotion).catch(console.error)
      }
    })

    socket.on(GAME_EVENTS.FLAG, () => {
      gameManager.handleFlag(socket).catch(console.error)
    })

    socket.on(GAME_EVENTS.RESIGN, () => {
      gameManager.handleResign(socket).catch(console.error)
    })

    socket.on('disconnect', () => {
      gameManager.handleDisconnect(socket).catch(console.error)
    })
  })

  return io
}

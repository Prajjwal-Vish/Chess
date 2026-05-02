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
  // JWT is signed as { sub: userId, username } — use payload.sub, not payload.id.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Unauthorized'))
    try {
      const payload = app.jwt.verify<{ sub: string }>(token)
      socket.data.userId = payload.sub
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string

    socket.on(GAME_EVENTS.INIT_GAME, () => {
      gameManager.addUser(socket, userId).catch(console.error)
    })

    socket.on(GAME_EVENTS.MOVE, (payload: { from: string; to: string }) => {
      if (typeof payload?.from === 'string' && typeof payload?.to === 'string') {
        gameManager.handleMove(socket, payload.from, payload.to).catch(console.error)
      }
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

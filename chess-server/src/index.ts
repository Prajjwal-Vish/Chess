import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import { sql, pool } from './db/client.js'
import { authRoutes } from './modules/auth/auth.routes.js'

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        colorize: true
      }
    }
  }
})

await app.register(helmet, { contentSecurityPolicy: false })

await app.register(cors, {
  origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
  credentials: true,
})

await app.register(cookie)

await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'fallback-secret-change-in-prod',
  sign: { expiresIn: '15m' }
})

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
})

// Allow empty bodies on POST requests
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  if (!body || (body as string).trim() === '') {
    done(null, {})
    return
  }
  try {
    done(null, JSON.parse(body as string))
  } catch (err) {
    done(err as Error, undefined)
  }
})

// ── Routes ─────────────────────────────────────────────────
await app.register(authRoutes)

// ── Health check ───────────────────────────────────────────
app.get('/health', async () => {
  try {
    await pool.query('SELECT 1')
    return { status: 'ok', db: 'connected', timestamp: new Date().toISOString() }
  } catch {
    return { status: 'ok', db: 'disconnected', timestamp: new Date().toISOString() }
  }
})

// ── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) ?? 3001

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`Server running on http://localhost:${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
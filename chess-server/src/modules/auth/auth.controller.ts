import type { FastifyRequest, FastifyReply } from 'fastify'
import {
  registerUser,
  loginUser,
  saveRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from './auth.service.js'

// ── Register ───────────────────────────────────────────────

export async function register(req: FastifyRequest, reply: FastifyReply) {
  const { username, email, password } = req.body as {
    username: string
    email: string
    password: string
  }

  // Basic validation
  if (!username || !email || !password) {
    return reply.status(400).send({ error: 'All fields are required' })
  }
  if (username.length < 3 || username.length > 30) {
    return reply.status(400).send({ error: 'Username must be 3-30 characters' })
  }
  if (password.length < 8) {
    return reply.status(400).send({ error: 'Password must be at least 8 characters' })
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return reply.status(400).send({ error: 'Username can only contain letters, numbers, underscores' })
  }

  try {
    const user = await registerUser({ username, email, password })
    const refreshToken = await saveRefreshToken(user.id, req.headers['user-agent'])
    const accessToken = await reply.jwtSign({ sub: user.id, username: user.username })

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return reply.status(201).send({
      user,
      accessToken,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed'
    if (message.includes('already taken')) {
      return reply.status(409).send({ error: message })
    }
    return reply.status(500).send({ error: 'Registration failed' })
  }
}

// ── Login ──────────────────────────────────────────────────

export async function login(req: FastifyRequest, reply: FastifyReply) {
  const { email, password } = req.body as {
    email: string
    password: string
  }

  if (!email || !password) {
    return reply.status(400).send({ error: 'Email and password are required' })
  }

  try {
    const user = await loginUser({ email, password })
    const refreshToken = await saveRefreshToken(user.id, req.headers['user-agent'])
    const accessToken = await reply.jwtSign({ sub: user.id, username: user.username })

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 60 * 60 * 24 * 7,
    })

    return reply.send({ user, accessToken })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed'
    if (message.includes('Invalid email or password')) {
      return reply.status(401).send({ error: message })
    }
    return reply.status(500).send({ error: 'Login failed' })
  }
}

// ── Refresh token ──────────────────────────────────────────

export async function refresh(req: FastifyRequest, reply: FastifyReply) {
  const oldToken = req.cookies?.refreshToken

  if (!oldToken) {
    return reply.status(401).send({ error: 'No refresh token' })
  }

  try {
    const { user, newRefreshToken } = await rotateRefreshToken(oldToken)
    const accessToken = await reply.jwtSign({ sub: user.id, username: user.username })

    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 60 * 60 * 24 * 7,
    })

    return reply.send({ user, accessToken })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token refresh failed'
    return reply.status(401).send({ error: message })
  }
}

// ── Logout ─────────────────────────────────────────────────

export async function logout(req: FastifyRequest, reply: FastifyReply) {
  const token = req.cookies?.refreshToken

  if (token) {
    await revokeRefreshToken(token)
  }

  reply.clearCookie('refreshToken', { path: '/auth/refresh' })
  return reply.status(204).send()
}

// ── Me (get current user) ──────────────────────────────────

export async function me(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
    const payload = req.user as { sub: string; username: string }

    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.rating, u.created_at,
              p.display_name, p.avatar_url, p.bio, p.country_code,
              p.games_played, p.games_won, p.games_drawn, p.games_lost
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [payload.sub]
    )

    if (!result.rows[0]) {
      return reply.status(404).send({ error: 'User not found' })
    }

    return reply.send({ user: result.rows[0] })
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}

// pool import needed for the me() handler
import { pool } from '../../db/client.js'
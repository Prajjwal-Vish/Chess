import bcrypt from 'bcrypt'
import { pool } from '../../db/client.js'
import { createHash, randomBytes } from 'crypto'

const SALT_ROUNDS = 12

// ── Types ──────────────────────────────────────────────────

export interface RegisterInput {
  username: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  username: string
  email: string
  rating: number
}

// ── Helpers ────────────────────────────────────────────────

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function generateRefreshToken(): string {
  return randomBytes(40).toString('hex')
}

// ── Service functions ──────────────────────────────────────

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  const { username, email, password } = input

  // Check if email already exists
  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email, username]
  )

  if (existing.rows.length > 0) {
    throw new Error('Email or username already taken')
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, rating`,
      [username, email, password_hash]
    )
    const user = userResult.rows[0]

    // Create empty profile
    await client.query(
      `INSERT INTO user_profiles (user_id, display_name)
       VALUES ($1, $2)`,
      [user.id, username]
    )

    await client.query('COMMIT')
    return user
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function loginUser(input: LoginInput): Promise<AuthUser> {
  const { email, password } = input

  const result = await pool.query(
    `SELECT id, username, email, rating, password_hash, is_active
     FROM users WHERE email = $1`,
    [email]
  )

  const user = result.rows[0]

  if (!user) {
    throw new Error('Invalid email or password')
  }

  if (!user.is_active) {
    throw new Error('Account is disabled')
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    throw new Error('Invalid email or password')
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    rating: user.rating,
  }
}

export async function saveRefreshToken(
  userId: string,
  deviceHint?: string
): Promise<string> {
  const token = generateRefreshToken()
  const tokenHash = hashToken(token)

  // 7 days from now
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_hint)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, expiresAt, deviceHint ?? null]
  )

  return token // return raw token to send to client
}

export async function rotateRefreshToken(
  oldToken: string
): Promise<{ user: AuthUser; newRefreshToken: string }> {
  const tokenHash = hashToken(oldToken)

  const result = await pool.query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at,
            u.id as uid, u.username, u.email, u.rating, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [tokenHash]
  )

  const row = result.rows[0]

  if (!row) throw new Error('Invalid refresh token')
  if (row.revoked_at) throw new Error('Refresh token already used')
  if (new Date(row.expires_at) < new Date()) throw new Error('Refresh token expired')
  if (!row.is_active) throw new Error('Account is disabled')

  // Revoke the old token
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`,
    [row.id]
  )

  const user: AuthUser = {
    id: row.uid,
    username: row.username,
    email: row.email,
    rating: row.rating,
  }

  // Issue a new refresh token
  const newRefreshToken = await saveRefreshToken(user.id)

  return { user, newRefreshToken }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token)
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  )
}
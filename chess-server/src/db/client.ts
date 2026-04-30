import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' || connectionString.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false
})

export const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const client = await pool.connect()
  try {
    let query = ''
    const params: unknown[] = []
    strings.forEach((str, i) => {
      query += str
      if (i < values.length) {
        params.push(values[i])
        query += `$${params.length}`
      }
    })
    const result = await client.query(query, params)
    return result.rows
  } finally {
    client.release()
  }
}

export default pool
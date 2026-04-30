import { pool } from './client.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('Running migrations...')
    const sql = readFileSync(
      join(__dirname, '../../migrations/001_initial.sql'),
      'utf-8'
    )
    await client.query(sql)
    console.log('✅ Migration complete')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
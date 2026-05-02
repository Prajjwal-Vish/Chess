import pg from 'pg'
import { Resolver } from 'dns/promises'
import 'dotenv/config'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL environment variable is not set')

// Corporate DNS can't resolve Neon's *.c-2.* subdomains.
// Pre-resolve the hostname via Google DNS so pg connects to the IP directly,
// while still sending the original hostname for TLS SNI verification.
const _url = new URL(connectionString)
const neonHostname = _url.hostname
const _resolver = new Resolver()
_resolver.setServers(['8.8.8.8'])
const [neonIp] = await _resolver.resolve4(neonHostname)

export const pool = new Pool({
  host: neonIp,
  port: _url.port ? parseInt(_url.port) : 5432,
  database: _url.pathname.slice(1),
  user: decodeURIComponent(_url.username),
  password: decodeURIComponent(_url.password),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false, servername: neonHostname },
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

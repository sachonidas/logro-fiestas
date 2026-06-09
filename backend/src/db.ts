import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL env var is required')
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
})

export default sql

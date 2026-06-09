import { Hono } from 'hono'
import { logger } from 'hono/logger'

export const app = new Hono()
app.use('*', logger())
app.get('/health', (c) => c.json({ ok: true }))

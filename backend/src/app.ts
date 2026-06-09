import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import eventsRouter from './events/router.js'

export const app = new Hono()

app.use('*', logger())
app.use('*', cors())
app.get('/health', (c) => c.json({ ok: true }))
app.route('/api/events', eventsRouter)

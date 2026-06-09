import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { apiKeyAuth } from '../middleware/auth.js'
import { getEvents, insertEvents, deleteByFestival } from './queries.js'
import type { EventInput } from './types.js'

const app = new Hono()

// GET /api/events?festival=san-bernabe-2026&category=musica&junior=true
app.get('/', async (c) => {
  const festival = c.req.query('festival')
  if (!festival) return c.json({ error: 'festival query param required' }, 400)

  const category = c.req.query('category') ?? undefined
  const juniorParam = c.req.query('junior')
  const junior = juniorParam === 'true' ? true : juniorParam === 'false' ? false : undefined

  const events = await getEvents({ festival, category, junior })
  return c.json(events)
})

const EventInputSchema = z.object({
  festival:    z.string(),
  name:        z.string(),
  description: z.string().nullable().optional(),
  category:    z.enum(['musica','infantil','gastronomia','historia','danza','teatro','mercado','religioso','otros']),
  isJunior:    z.boolean().optional(),
  lat:         z.number(),
  lng:         z.number(),
  venueName:   z.string(),
  startTime:   z.string(),
  endTime:     z.string().nullable().optional(),
  imageUrl:    z.string().nullable().optional(),
})

const LoadBodySchema = z.object({
  events: z.array(EventInputSchema).min(1),
})

// POST /api/events/load  (requires x-api-key)
app.post('/load', apiKeyAuth, zValidator('json', LoadBodySchema), async (c) => {
  const { events } = c.req.valid('json')
  const count = await insertEvents(events as EventInput[])
  return c.json({ inserted: count })
})

// DELETE /api/events?festival=san-bernabe-2026  (requires x-api-key)
app.delete('/', apiKeyAuth, async (c) => {
  const festival = c.req.query('festival')
  if (!festival) return c.json({ error: 'festival query param required' }, 400)
  const count = await deleteByFestival(festival)
  return c.json({ deleted: count })
})

export default app

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import sql from '../db.js'
import { getEvents, insertEvents, deleteByFestival } from './queries.js'

const FESTIVAL = 'test-festival'

beforeAll(async () => {
  await sql`DELETE FROM events WHERE festival = ${FESTIVAL}`
})

afterAll(async () => {
  await sql`DELETE FROM events WHERE festival = ${FESTIVAL}`
  await sql.end()
})

beforeEach(async () => {
  await sql`DELETE FROM events WHERE festival = ${FESTIVAL}`
})

const sampleEvent = {
  festival: FESTIVAL,
  name: 'Concierto Test',
  category: 'musica' as const,
  lat: 42.4657,
  lng: -2.4448,
  venueName: 'Plaza del Mercado',
  startTime: '2026-06-06T21:00:00Z',
}

describe('insertEvents', () => {
  it('inserts events and returns count', async () => {
    const count = await insertEvents([sampleEvent])
    expect(count).toBe(1)
  })

  it('inserts multiple events', async () => {
    const count = await insertEvents([sampleEvent, { ...sampleEvent, name: 'Otro' }])
    expect(count).toBe(2)
  })
})

describe('getEvents', () => {
  it('returns events for the festival', async () => {
    await insertEvents([sampleEvent])
    const events = await getEvents({ festival: FESTIVAL })
    expect(events).toHaveLength(1)
    expect(events[0].name).toBe('Concierto Test')
    expect(events[0].isJunior).toBe(false)
  })

  it('filters by category', async () => {
    await insertEvents([sampleEvent, { ...sampleEvent, category: 'infantil', name: 'Cuento' }])
    const events = await getEvents({ festival: FESTIVAL, category: 'musica' })
    expect(events).toHaveLength(1)
    expect(events[0].category).toBe('musica')
  })

  it('orders by start_time ascending', async () => {
    await insertEvents([
      { ...sampleEvent, name: 'B', startTime: '2026-06-07T21:00:00Z' },
      { ...sampleEvent, name: 'A', startTime: '2026-06-06T21:00:00Z' },
    ])
    const events = await getEvents({ festival: FESTIVAL })
    expect(events[0].name).toBe('A')
    expect(events[1].name).toBe('B')
  })
})

describe('deleteByFestival', () => {
  it('deletes all events for a festival', async () => {
    await insertEvents([sampleEvent])
    const count = await deleteByFestival(FESTIVAL)
    expect(count).toBe(1)
    const events = await getEvents({ festival: FESTIVAL })
    expect(events).toHaveLength(0)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { app } from '../app.js'

vi.mock('./queries.js', () => ({
  getEvents: vi.fn().mockResolvedValue([
    { id: '1', festival: 'test', name: 'Evento', category: 'musica',
      isJunior: false, lat: 42.4, lng: -2.4, venueName: 'Plaza',
      startTime: '2026-06-06T21:00:00Z', endTime: null,
      description: null, imageUrl: null }
  ]),
  insertEvents: vi.fn().mockResolvedValue(2),
  deleteByFestival: vi.fn().mockResolvedValue(5),
}))

describe('GET /api/events', () => {
  it('returns 400 without festival param', async () => {
    const res = await app.request('/api/events')
    expect(res.status).toBe(400)
  })

  it('returns events array', async () => {
    const res = await app.request('/api/events?festival=test')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].name).toBe('Evento')
  })
})

describe('POST /api/events/load', () => {
  it('returns 401 without api key', async () => {
    const res = await app.request('/api/events/load', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('inserts events with valid api key', async () => {
    process.env.API_KEY = 'test-key'
    const res = await app.request('/api/events/load', {
      method: 'POST',
      headers: { 'x-api-key': 'test-key', 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{
        festival: 'test', name: 'Evento', category: 'musica',
        lat: 42.4, lng: -2.4, venueName: 'Plaza', startTime: '2026-06-06T21:00:00Z'
      }]})
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.inserted).toBe(2)
  })
})

describe('DELETE /api/events', () => {
  it('returns 401 without api key', async () => {
    const res = await app.request('/api/events?festival=test', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('deletes events with valid api key', async () => {
    process.env.API_KEY = 'test-key'
    const res = await app.request('/api/events?festival=test', {
      method: 'DELETE',
      headers: { 'x-api-key': 'test-key' }
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(5)
  })
})

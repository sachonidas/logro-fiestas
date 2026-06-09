import sql from '../db.js'
import type { Event, EventInput } from './types.js'

type Row = {
  id: string
  festival: string
  name: string
  description: string | null
  category: string
  is_junior: boolean
  lat: number
  lng: number
  venue_name: string
  start_time: Date
  end_time: Date | null
  image_url: string | null
}

function rowToEvent(row: Row): Event {
  return {
    id: row.id,
    festival: row.festival,
    name: row.name,
    description: row.description,
    category: row.category as Event['category'],
    isJunior: row.is_junior,
    lat: Number(row.lat),
    lng: Number(row.lng),
    venueName: row.venue_name,
    startTime: row.start_time.toISOString(),
    endTime: row.end_time?.toISOString() ?? null,
    imageUrl: row.image_url,
  }
}

export async function getEvents(params: {
  festival: string
  category?: string
  junior?: boolean
}): Promise<Event[]> {
  const rows = await sql<Row[]>`
    SELECT * FROM events
    WHERE festival = ${params.festival}
    ${params.category ? sql`AND category = ${params.category}` : sql``}
    ${params.junior !== undefined ? sql`AND is_junior = ${params.junior}` : sql``}
    ORDER BY start_time ASC
  `
  return rows.map(rowToEvent)
}

export async function insertEvents(inputs: EventInput[]): Promise<number> {
  if (inputs.length === 0) return 0
  const rows = inputs.map((e) => ({
    festival:    e.festival,
    name:        e.name,
    description: e.description ?? null,
    category:    e.category,
    is_junior:   e.isJunior ?? false,
    lat:         e.lat,
    lng:         e.lng,
    venue_name:  e.venueName,
    start_time:  e.startTime,
    end_time:    e.endTime ?? null,
    image_url:   e.imageUrl ?? null,
  }))
  const result = await sql`INSERT INTO events ${sql(rows)}`
  return result.count
}

export async function deleteByFestival(festival: string): Promise<number> {
  const result = await sql`DELETE FROM events WHERE festival = ${festival}`
  return result.count
}

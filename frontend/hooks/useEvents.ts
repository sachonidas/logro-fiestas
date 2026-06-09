import { useQuery } from '@tanstack/react-query'
import { API_BASE_URL, FESTIVAL } from '../constants/api'
import type { Event, EventCategory } from '../types/event'

async function fetchEvents(): Promise<Event[]> {
  const res = await fetch(`${API_BASE_URL}/api/events?festival=${FESTIVAL}`)
  if (!res.ok) throw new Error('Failed to fetch events')
  return res.json()
}

export function useEvents(params: {
  category?: EventCategory | 'all'
  junior?: boolean
}) {
  return useQuery({
    queryKey: ['events', FESTIVAL],
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000,
    select: (data) => {
      let events = data
      if (params.category && params.category !== 'all') {
        events = events.filter((e) => e.category === params.category)
      }
      if (params.junior !== undefined) {
        events = events.filter((e) => e.isJunior === params.junior)
      }
      return events
    },
  })
}

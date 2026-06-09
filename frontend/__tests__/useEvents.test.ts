import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useEvents } from '../hooks/useEvents'
import type { Event } from '../types/event'

const mockEvent: Event = {
  id: '1', festival: 'san-bernabe-2026', name: 'Concierto',
  description: null, category: 'musica', isJunior: false,
  lat: 42.4657, lng: -2.4448, venueName: 'Plaza del Mercado',
  startTime: '2026-06-06T21:00:00Z', endTime: null, imageUrl: null,
}

global.fetch = jest.fn()

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, {
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } })
  }, children)

beforeEach(() => jest.clearAllMocks())

describe('useEvents', () => {
  it('returns events from API', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockEvent]),
    })
    const { result } = await renderHook(() => useEvents({}), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].name).toBe('Concierto')
  })

  it('filters by category client-side', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        mockEvent,
        { ...mockEvent, id: '2', category: 'infantil', name: 'Cuento' }
      ]),
    })
    const { result } = await renderHook(() => useEvents({ category: 'musica' }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].category).toBe('musica')
  })
})

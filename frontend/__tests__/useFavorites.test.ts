import { renderHook, act, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFavorites } from '../hooks/useFavorites'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useFavorites', () => {
  it('starts with empty favorites', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    const { result } = await renderHook(() => useFavorites())
    await waitFor(() => expect(result.current).not.toBeNull())
    expect(result.current.isFavorite('1')).toBe(false)
  })

  it('toggles favorite on and off', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    const { result } = await renderHook(() => useFavorites())
    await waitFor(() => expect(result.current).not.toBeNull())

    await act(async () => { result.current.toggle('1') })
    expect(result.current.isFavorite('1')).toBe(true)

    await act(async () => { result.current.toggle('1') })
    expect(result.current.isFavorite('1')).toBe(false)
  })

  it('persists favorites to AsyncStorage', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    const { result } = await renderHook(() => useFavorites())
    await waitFor(() => expect(result.current).not.toBeNull())

    await act(async () => { result.current.toggle('abc') })
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'favorites',
      JSON.stringify(['abc'])
    )
  })
})

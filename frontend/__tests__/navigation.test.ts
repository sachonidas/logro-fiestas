jest.mock('react-native', () => {
  const mockOpenURL = jest.fn()
  return {
    Platform: { OS: 'ios' },
    Linking: { openURL: mockOpenURL },
  }
})

import { openNavigation } from '../lib/navigation'
import { Linking, Platform } from 'react-native'

describe('openNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('opens Apple Maps on iOS', () => {
    ;(Platform as any).OS = 'ios'
    openNavigation(42.4657, -2.4448, 'Plaza del Mercado')
    expect(Linking.openURL).toHaveBeenCalledWith(
      'maps://?daddr=42.4657,-2.4448&q=Plaza%20del%20Mercado'
    )
  })

  it('opens Google Maps on Android', () => {
    ;(Platform as any).OS = 'android'
    openNavigation(42.4657, -2.4448, 'Plaza del Mercado')
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('google.com/maps')
    )
  })
})

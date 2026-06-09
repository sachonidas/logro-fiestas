import { Platform, Linking } from 'react-native'

export function openNavigation(lat: number, lng: number, label: string): void {
  const encodedLabel = encodeURIComponent(label)

  if (Platform.OS === 'ios') {
    Linking.openURL(`maps://?daddr=${lat},${lng}&q=${encodedLabel}`)
  } else if (Platform.OS === 'android') {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedLabel}`
    )
  } else {
    // web
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    )
  }
}

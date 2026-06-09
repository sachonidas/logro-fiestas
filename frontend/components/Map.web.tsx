import { useEffect, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'
import type { Event } from '../types/event'

interface Props {
  events: Event[]
  onSelectEvent: (event: Event) => void
}

const LOGRONO_CENTER: [number, number] = [42.4667, -2.4457]

export function Map({ events, onSelectEvent }: Props) {
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default

      // Fix Leaflet default icon paths broken by bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapRef.current) {
        mapRef.current = L.map('leaflet-map').setView(LOGRONO_CENTER, 15)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(mapRef.current)
      }

      // Clear existing markers
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) layer.remove()
      })

      events.forEach((event) => {
        const color = Colors.categories[event.category] ?? Colors.primary
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })
        L.marker([event.lat, event.lng], { icon })
          .addTo(mapRef.current)
          .on('click', () => onSelectEvent(event))
      })
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [events])

  return (
    <View style={styles.container}>
      <div id="leaflet-map" style={{ width: '100%', height: '100%' }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})

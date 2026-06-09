import MapView, { Marker, type Region } from 'react-native-maps'
import { StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'
import type { Event } from '../types/event'

const LOGRONO_REGION: Region = {
  latitude: 42.4667,
  longitude: -2.4457,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
}

interface Props {
  events: Event[]
  onSelectEvent: (event: Event) => void
}

export function Map({ events, onSelectEvent }: Props) {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={LOGRONO_REGION}
      showsUserLocation
    >
      {events.map((event) => (
        <Marker
          key={event.id}
          coordinate={{ latitude: event.lat, longitude: event.lng }}
          title={event.name}
          pinColor={Colors.categories[event.category] ?? Colors.primary}
          onPress={() => onSelectEvent(event)}
        />
      ))}
    </MapView>
  )
}

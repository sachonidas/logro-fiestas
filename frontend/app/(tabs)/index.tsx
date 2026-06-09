import { useState, useRef, useCallback } from 'react'
import { View, StyleSheet, SafeAreaView } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { Map } from '../../components/Map'
import { CategoryFilter } from '../../components/CategoryFilter'
import { EventBottomSheet } from '../../components/EventBottomSheet'
import { useEvents } from '../../hooks/useEvents'
import { useFavorites } from '../../hooks/useFavorites'
import { Colors } from '../../constants/colors'
import type { Event, EventCategory } from '../../types/event'

export default function MapTab() {
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const bottomSheetRef = useRef<BottomSheet>(null)

  const { data: events = [] } = useEvents({ category: selectedCategory })
  const { isFavorite, toggle } = useFavorites()

  const handleSelectEvent = useCallback((event: Event) => {
    setSelectedEvent(event)
    bottomSheetRef.current?.expand()
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSelectedEvent(null)
  }, [])

  return (
    <View style={styles.container}>
      <Map events={events} onSelectEvent={handleSelectEvent} />

      <SafeAreaView style={styles.filterOverlay} pointerEvents="box-none">
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
      </SafeAreaView>

      <EventBottomSheet
        ref={bottomSheetRef}
        event={selectedEvent}
        isFavorite={selectedEvent ? isFavorite(selectedEvent.id) : false}
        onToggleFavorite={() => selectedEvent && toggle(selectedEvent.id)}
        onClose={handleCloseSheet}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
})

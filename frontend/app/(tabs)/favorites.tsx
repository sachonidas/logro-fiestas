import { useRef, useState } from 'react'
import { FlatList, View, Text, StyleSheet, SafeAreaView } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { EventRow } from '../../components/EventRow'
import { EventBottomSheet } from '../../components/EventBottomSheet'
import { useEvents } from '../../hooks/useEvents'
import { useFavorites } from '../../hooks/useFavorites'
import { Colors } from '../../constants/colors'
import type { Event } from '../../types/event'

export default function FavoritesTab() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const bottomSheetRef = useRef<BottomSheet>(null)

  const { data: events = [] } = useEvents({})
  const { favorites, isFavorite, toggle } = useFavorites()

  const favoriteEvents = events.filter((e) => favorites.includes(e.id))

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Guardados</Text>

      <FlatList
        data={favoriteEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventRow
            event={item}
            isFavorite
            onPress={() => { setSelectedEvent(item); bottomSheetRef.current?.expand() }}
            onToggleFavorite={() => toggle(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🤍</Text>
            <Text style={styles.emptyTitle}>Sin guardados aún</Text>
            <Text style={styles.emptyText}>Pulsa ❤️ en cualquier evento para guardarlo aquí</Text>
          </View>
        }
      />

      <EventBottomSheet
        ref={bottomSheetRef}
        event={selectedEvent}
        isFavorite={selectedEvent ? isFavorite(selectedEvent.id) : false}
        onToggleFavorite={() => selectedEvent && toggle(selectedEvent.id)}
        onClose={() => setSelectedEvent(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { color: Colors.text, fontSize: 24, fontWeight: '800', padding: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
})

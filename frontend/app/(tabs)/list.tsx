import { useState, useRef } from 'react'
import { SectionList, View, Text, StyleSheet, SafeAreaView, TextInput } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { CategoryFilter } from '../../components/CategoryFilter'
import { EventRow } from '../../components/EventRow'
import { EventBottomSheet } from '../../components/EventBottomSheet'
import { useEvents } from '../../hooks/useEvents'
import { useFavorites } from '../../hooks/useFavorites'
import { Colors } from '../../constants/colors'
import type { Event, EventCategory } from '../../types/event'

function groupByDay(events: Event[]) {
  const days: Record<string, Event[]> = {}
  for (const event of events) {
    const date = new Date(event.startTime)
    const key = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    const capitalized = key.charAt(0).toUpperCase() + key.slice(1)
    if (!days[capitalized]) days[capitalized] = []
    days[capitalized].push(event)
  }
  return Object.entries(days).map(([title, data]) => ({ title, data }))
}

export default function ListTab() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const bottomSheetRef = useRef<BottomSheet>(null)

  const { data: events = [], isLoading } = useEvents({ category: selectedCategory })
  const { isFavorite, toggle } = useFavorites()

  const filtered = events.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.venueName.toLowerCase().includes(search.toLowerCase())
  )
  const sections = groupByDay(filtered)

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar evento o lugar…"
        placeholderTextColor={Colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />
      <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventRow
            event={item}
            isFavorite={isFavorite(item.id)}
            onPress={() => { setSelectedEvent(item); bottomSheetRef.current?.expand() }}
            onToggleFavorite={() => toggle(item.id)}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{isLoading ? 'Cargando…' : 'No hay eventos'}</Text>
        }
        stickySectionHeadersEnabled
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
  search: {
    margin: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: { backgroundColor: Colors.background, paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { color: Colors.accent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
})

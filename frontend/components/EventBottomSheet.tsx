import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native'
import { useMemo, useCallback, forwardRef } from 'react'
import { Colors } from '../constants/colors'
import { CATEGORIES } from '../constants/categories'
import { openNavigation } from '../lib/navigation'
import type { Event } from '../types/event'

interface Props {
  event: Event | null
  isFavorite: boolean
  onToggleFavorite: () => void
  onClose: () => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export const EventBottomSheet = forwardRef<BottomSheet, Props>(
  ({ event, isFavorite, onToggleFavorite, onClose }, ref) => {
    const snapPoints = useMemo(() => ['35%', '60%'], [])

    const renderBackdrop = useCallback(
      (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
      []
    )

    if (!event) return null

    const cat = CATEGORIES.find((c) => c.key === event.category)
    const catColor = Colors.categories[event.category] ?? Colors.primary

    return (
      <BottomSheet
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.catDot, { backgroundColor: catColor }]} />
              <Text style={styles.title}>{event.name}</Text>
            </View>
            <TouchableOpacity onPress={onToggleFavorite}>
              <Text style={styles.heart}>{isFavorite ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chips}>
            <View style={[styles.chip, { borderColor: catColor }]}>
              <Text style={[styles.chipText, { color: catColor }]}>
                {cat?.emoji} {cat?.label}
              </Text>
            </View>
            {event.isJunior && (
              <View style={[styles.chip, { borderColor: Colors.accent }]}>
                <Text style={[styles.chipText, { color: Colors.accent }]}>Junior</Text>
              </View>
            )}
          </View>

          <Text style={styles.meta}>
            🕐 {formatTime(event.startTime)}
            {event.endTime ? ` — ${formatTime(event.endTime)}` : ''}
          </Text>
          <Text style={styles.meta}>📍 {event.venueName}</Text>

          {event.description && (
            <Text style={styles.description}>{event.description}</Text>
          )}

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => openNavigation(event.lat, event.lng, event.venueName)}
          >
            <Text style={styles.navButtonText}>🧭 Cómo llegar</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    )
  }
)

EventBottomSheet.displayName = 'EventBottomSheet'

const styles = StyleSheet.create({
  background: { backgroundColor: Colors.surface },
  handle: { backgroundColor: 'rgba(255,255,255,0.3)' },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0, marginTop: 2 },
  title: { flex: 1, color: Colors.text, fontSize: 18, fontWeight: '700', lineHeight: 22 },
  heart: { fontSize: 24 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 12, fontWeight: '600' },
  meta: { color: Colors.textMuted, fontSize: 14, marginBottom: 6 },
  description: { color: Colors.text, fontSize: 14, marginTop: 8, lineHeight: 20 },
  navButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navButtonText: { color: Colors.accent, fontSize: 16, fontWeight: '700' },
})

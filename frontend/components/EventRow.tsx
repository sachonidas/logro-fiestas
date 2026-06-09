import { TouchableOpacity, Text, View, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'
import { CATEGORIES } from '../constants/categories'
import type { Event } from '../types/event'

interface Props {
  event: Event
  isFavorite: boolean
  onPress: () => void
  onToggleFavorite: () => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export function EventRow({ event, isFavorite, onPress, onToggleFavorite }: Props) {
  const color = Colors.categories[event.category] ?? Colors.primary

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{event.name}</Text>
        <Text style={styles.meta}>
          {formatTime(event.startTime)} · {event.venueName}
        </Text>
      </View>
      {event.isJunior && <Text style={styles.badge}>Junior</Text>}
      <TouchableOpacity onPress={onToggleFavorite} hitSlop={8}>
        <Text style={styles.heart}>{isFavorite ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  info: { flex: 1 },
  name: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  meta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  badge: {
    fontSize: 10,
    color: Colors.accent,
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  heart: { fontSize: 18 },
})

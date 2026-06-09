import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { CATEGORIES } from '../constants/categories'
import { Colors } from '../constants/colors'
import type { EventCategory } from '../types/event'

interface Props {
  selected: EventCategory | 'all'
  onChange: (category: EventCategory | 'all') => void
}

export function CategoryFilter({ selected, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat.key
        const categoryColor = cat.key === 'all'
          ? Colors.primary
          : Colors.categories[cat.key] ?? Colors.primary

        return (
          <TouchableOpacity
            key={cat.key}
            onPress={() => onChange(cat.key as EventCategory | 'all')}
            style={[
              styles.chip,
              isSelected && { backgroundColor: categoryColor, borderColor: categoryColor },
            ]}
          >
            <Text style={styles.emoji}>{cat.emoji}</Text>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  emoji: { fontSize: 14 },
  label: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  labelSelected: { color: Colors.textDark, fontWeight: '700' },
})

import { useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native'
import { INFO_SECTIONS } from '../../constants/info'
import { openNavigation } from '../../lib/navigation'
import { Colors } from '../../constants/colors'
import type { InfoEntry } from '../../constants/info'

// ScrollView y no SectionList: son ocho secciones fijas y la virtualización
// solo estorba — en el export estático de web dejaba fuera del HTML las
// últimas secciones hasta que el cliente hidrataba.
export default function InfoTab() {
  // Todo plegado al entrar: de un vistazo se ve qué hay antes de abrir nada.
  const [open, setOpen] = useState<Record<string, boolean>>({})

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.header}>Info</Text>

        {INFO_SECTIONS.map((section) => {
          const isOpen = open[section.key] ?? false
          return (
            <View key={section.key}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setOpen((s) => ({ ...s, [section.key]: !s[section.key] }))}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
              >
                <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.entries.length}</Text>
                <Text style={styles.chevron}>{isOpen ? '−' : '+'}</Text>
              </TouchableOpacity>

              {isOpen &&
                section.entries.map((entry, i) => (
                  <Entry key={`${section.key}-${i}`} entry={entry} />
                ))}
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

function Entry({ entry }: { entry: InfoEntry }) {
  return (
    <View style={styles.entry}>
      <Text style={styles.entryTitle}>{entry.title}</Text>

      {entry.when && <Text style={styles.when}>{entry.when}</Text>}

      {entry.notes?.map((note, i) => (
        <Text key={i} style={styles.note}>
          · {note}
        </Text>
      ))}

      {entry.place && <Text style={styles.place}>{entry.place}</Text>}

      <View style={styles.actions}>
        {entry.coords && (
          <TouchableOpacity
            style={styles.action}
            onPress={() => openNavigation(entry.coords!.lat, entry.coords!.lng, entry.title)}
          >
            <Text style={styles.actionText}>Cómo llegar</Text>
          </TouchableOpacity>
        )}
        {entry.phone && (
          <TouchableOpacity
            style={styles.action}
            onPress={() => Linking.openURL(`tel:${entry.phone}`)}
          >
            <Text style={styles.actionText}>{formatPhone(entry.phone)}</Text>
          </TouchableOpacity>
        )}
        {entry.url && (
          <TouchableOpacity style={styles.action} onPress={() => Linking.openURL(entry.url!)}>
            <Text style={styles.actionText}>Entradas</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

function formatPhone(phone: string) {
  // Los cortos (010, 112, 091, 092) se leen mejor tal cual
  if (phone.length <= 3) return phone
  return phone.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingBottom: 24 },
  header: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '600' },
  sectionCount: { color: Colors.textMuted, fontSize: 12 },
  chevron: { color: Colors.accent, fontSize: 18, fontWeight: '700', width: 14, textAlign: 'center' },

  entry: {
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  entryTitle: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  when: { color: Colors.accent, fontSize: 12, marginTop: 4, lineHeight: 17 },
  note: { color: Colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  place: { color: Colors.textMuted, fontSize: 12, marginTop: 6, fontStyle: 'italic' },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  action: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  actionText: { color: Colors.accent, fontSize: 12, fontWeight: '600' },
})

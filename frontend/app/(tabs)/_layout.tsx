import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { Colors } from '../../constants/colors'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Mapa', tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="list"
        options={{ title: 'Lista', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: 'Guardados', tabBarIcon: ({ focused }) => <TabIcon emoji="❤️" focused={focused} /> }}
      />
    </Tabs>
  )
}

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
}

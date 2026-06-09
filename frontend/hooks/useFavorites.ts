import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'favorites'

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setFavorites(JSON.parse(raw))
    })
  }, [])

  function toggle(id: string) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function isFavorite(id: string) {
    return favorites.includes(id)
  }

  return { favorites, toggle, isFavorite }
}

import type { EventCategory } from '../types/event'

export interface CategoryConfig {
  key: EventCategory | 'all'
  label: string
  emoji: string
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'all',         label: 'Todos',      emoji: '📍' },
  { key: 'musica',      label: 'Música',     emoji: '🎵' },
  { key: 'infantil',    label: 'Infantil',   emoji: '🧒' },
  { key: 'gastronomia', label: 'Gastro',     emoji: '🍷' },
  { key: 'historia',    label: 'Historia',   emoji: '⚔️' },
  { key: 'danza',       label: 'Danza',      emoji: '💃' },
  { key: 'teatro',      label: 'Teatro',     emoji: '🎭' },
  { key: 'mercado',     label: 'Mercado',    emoji: '🏪' },
  { key: 'religioso',   label: 'Religioso',  emoji: '⛪' },
]

export type EventCategory =
  | 'musica'
  | 'infantil'
  | 'gastronomia'
  | 'historia'
  | 'danza'
  | 'teatro'
  | 'mercado'
  | 'religioso'
  | 'otros'

export interface Event {
  id: string
  festival: string
  name: string
  description: string | null
  category: EventCategory
  isJunior: boolean
  lat: number
  lng: number
  venueName: string
  startTime: string   // ISO 8601
  endTime: string | null
  imageUrl: string | null
}

# Fiestas Logroño — App Design Spec

**Date:** 2026-06-09  
**Project:** Guía interactiva de fiestas de Logroño  
**Status:** Approved

---

## Resumen

App multiplataforma (web/PWA ahora, nativa en septiembre) que muestra un mapa interactivo con los eventos de las fiestas de Logroño. El usuario puede filtrar por categoría, ver detalles de cada evento y abrir la navegación en Google Maps / Apple Maps con un toque.

**Fiestas objetivo:**
- San Bernabé 2026 (6–12 junio) — lanzamiento como PWA
- San Mateo 2026 (septiembre) — lanzamiento como app nativa iOS/Android

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Expo + React Native + TypeScript |
| Routing | expo-router (file-based, tabs) |
| Mapa (móvil) | react-native-maps |
| Mapa (web) | react-leaflet |
| Datos | TanStack Query |
| Estado local | AsyncStorage (favoritos) |
| Tema | `constants/colors.ts` centralizado |
| Backend | Node.js + Hono |
| Base de datos | PostgreSQL |
| Despliegue web | EAS + Vercel/Netlify |
| Despliegue backend | Railway |

---

## Arquitectura

### Frontend — estructura de tabs

```
app/
├── (tabs)/
│   ├── index.tsx        → Tab Mapa
│   ├── list.tsx         → Tab Lista
│   └── favorites.tsx    → Tab Guardados
├── _layout.tsx          → Tab navigator
└── event/[id].tsx       → Detalle evento (modal)
```

### Backend — endpoints

```
GET  /api/events
     ?festival=san-bernabe-2026
     &category=musica          (opcional)
     &junior=true              (opcional)

POST /api/events/load
     Header: x-api-key: <secret>
     Body: { "events": [...] }

DELETE /api/events
       ?festival=san-bernabe-2026
       Header: x-api-key: <secret>
```

Flujo de carga de datos:
1. `DELETE /api/events?festival=...` — vacía el festival
2. `POST /api/events/load` — sube el array completo
3. La app lo sirve inmediatamente

---

## Modelo de datos

### Evento

```typescript
interface Event {
  id: string;              // UUID
  festival: string;        // "san-bernabe-2026" | "san-mateo-2026"
  name: string;
  description: string | null;
  category: EventCategory;
  isJunior: boolean;       // true = programa infantil Junior
  lat: number;
  lng: number;
  venueName: string;       // "Plaza del Mercado", "Parking del Revellín"…
  startTime: string;       // ISO 8601
  endTime: string | null;
  imageUrl: string | null;
}

type EventCategory =
  | 'musica'
  | 'infantil'
  | 'gastronomia'
  | 'historia'
  | 'danza'
  | 'teatro'
  | 'mercado'
  | 'religioso'
  | 'otros';
```

### Tabla PostgreSQL

```sql
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival    TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL,
  is_junior   BOOLEAN NOT NULL DEFAULT false,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  venue_name  TEXT NOT NULL,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_festival ON events(festival);
CREATE INDEX idx_events_category ON events(category);
```

---

## Venues — geocodificación

Los ~30 lugares únicos del casco histórico se geocodifican una vez y se reutilizan en todos los eventos. Ejemplos:

| Venue | Lat | Lng |
|---|---|---|
| Plaza del Mercado | 42.4657 | -2.4448 |
| Parking del Revellín | 42.4648 | -2.4469 |
| Plaza de la Oca | 42.4660 | -2.4455 |
| Plaza Santiago | 42.4663 | -2.4444 |
| Paseo del Espolón | 42.4650 | -2.4430 |
| Parque del Ebro | 42.4610 | -2.4390 |
| Teatro Bretón | 42.4645 | -2.4428 |
| Concatedral de la Redonda | 42.4658 | -2.4443 |

*(Coordenadas exactas a confirmar con Google Maps antes de la carga de datos)*

---

## Pantallas

### Tab 1 — Mapa

- MapView a pantalla completa
- Pins coloreados por categoría (un color por categoría, definido en `constants/colors.ts`)
- Chips de filtro flotantes en la parte superior (scroll horizontal): Todos / 🎵 Música / 🧒 Infantil / 🍷 Gastro / ⚔️ Historia / 💃 Danza / 🎭 Teatro / 🏪 Mercado / ⛪ Religioso
- Al pulsar un pin → BottomSheet con:
  - Nombre del evento
  - Hora (y hora fin si existe)
  - Lugar
  - Categoría (chip)
  - Badge "Junior" si aplica
  - Botón "Cómo llegar" → deep link a navegación
  - Botón ♥ para guardar

### Tab 2 — Lista

- Lista agrupada por día (secciones: Sábado 6, Domingo 7…)
- Barra de búsqueda
- Filtro por categoría (mismo chip bar que el mapa)
- Cada fila: emoji categoría + nombre + hora + venueName
- Pulsar fila → mismo BottomSheet del mapa

### Tab 3 — Guardados

- Lista de eventos guardados (AsyncStorage, sin servidor)
- Estado vacío: "Pulsa ♥ en cualquier evento para guardarlo"
- Persistencia local; en v2 se sincroniza con cuenta de usuario

---

## Navegación externa (deep links)

```typescript
// iOS → Apple Maps, Android → Google Maps, Web → Google Maps URL
function openNavigation(lat: number, lng: number, label: string) {
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const appleUrl  = `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(label)}`;

  if (Platform.OS === 'ios') {
    Linking.openURL(appleUrl);
  } else {
    Linking.openURL(googleUrl);
  }
}
```

---

## Tema visual

**Estilo:** Rioja Clásico — rojo vino + dorado.

```typescript
// constants/colors.ts
export const Colors = {
  primary:    '#8B0000',  // rojo vino
  accent:     '#F0C040',  // dorado
  background: '#1A0A0A',
  surface:    '#2A0A0A',
  text:       '#FFFFFF',
  textMuted:  'rgba(255,255,255,0.6)',

  categories: {
    musica:      '#E040FB',
    infantil:    '#40C4FF',
    gastronomia: '#FF6D00',
    historia:    '#8D6E63',
    danza:       '#F06292',
    teatro:      '#AED581',
    mercado:     '#FFD740',
    religioso:   '#80CBC4',
    otros:       '#90A4AE',
  }
};
```

Cambiar paleta completa = editar este fichero únicamente.

---

## Datos de prueba — San Bernabé 2026

El programa completo proviene de dos PDFs del Ayuntamiento de Logroño:
- `DBF-1729.web.pdf` — programa general (6–12 junio)
- `Programa junior SB26.pdf` — programa infantil Junior (6–11 junio)

El JSON de carga inicial se generará parseando estos PDFs y mapeando cada evento a su venue geocodificado.

---

## Hoja de ruta

| Fase | Plazo | Descripción |
|---|---|---|
| v1 — PWA | Junio 2026 | Web app desplegada, San Bernabé |
| v1.5 — Nativa | Agosto 2026 | Build iOS/Android, App Store |
| v2 — San Mateo | Septiembre 2026 | Nuevo festival cargado, favoritos cloud |

---

## Fuera de alcance (v1)

- Panel de administración
- Notificaciones push
- Favoritos sincronizados en servidor
- Modo offline completo
- Autenticación de usuarios

# Fiestas Logroño App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a festival guide app (web/PWA ahora, nativa en septiembre) que muestra los eventos de las fiestas de Logroño en un mapa interactivo con navegación a Google Maps/Apple Maps.

**Architecture:** Monorepo con `backend/` (Hono + PostgreSQL en Railway) y `frontend/` (Expo + React Native). El mapa usa ficheros de plataforma: `react-native-maps` en nativo, `react-leaflet` en web. Los datos se cargan vía un endpoint POST protegido con API key.

**Tech Stack:** Expo SDK 52, expo-router v4, react-native-maps, react-leaflet, TanStack Query, @gorhom/bottom-sheet v5, AsyncStorage, Hono v4, postgres.js, PostgreSQL, Railway, Vercel

---

## Estructura de ficheros

```
logro-fiestas/
├── backend/
│   ├── src/
│   │   ├── index.ts              → Hono app entry point
│   │   ├── db.ts                 → PostgreSQL connection singleton
│   │   ├── events/
│   │   │   ├── types.ts          → Event TypeScript types (shared with frontend via copy)
│   │   │   ├── queries.ts        → SQL: getEvents, insertEvents, deleteByFestival
│   │   │   └── router.ts         → Hono routes: GET, POST /load, DELETE
│   │   └── middleware/
│   │       └── auth.ts           → API key middleware
│   ├── migrations/
│   │   └── 001_create_events.sql
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx           → Root layout (QueryClient + GestureHandler)
│   │   └── (tabs)/
│   │       ├── _layout.tsx       → Tab bar (Mapa / Lista / Guardados)
│   │       ├── index.tsx         → Tab Mapa
│   │       ├── list.tsx          → Tab Lista
│   │       └── favorites.tsx     → Tab Guardados
│   ├── components/
│   │   ├── Map.native.tsx        → react-native-maps MapView + markers
│   │   ├── Map.web.tsx           → react-leaflet MapContainer + markers
│   │   ├── CategoryFilter.tsx    → Chip bar horizontal (filtro por categoría)
│   │   ├── EventBottomSheet.tsx  → @gorhom/bottom-sheet con detalles del evento
│   │   └── EventRow.tsx          → Fila de lista (emoji + nombre + hora + lugar)
│   ├── hooks/
│   │   ├── useEvents.ts          → TanStack Query: fetch + filtrado
│   │   └── useFavorites.ts       → AsyncStorage: toggle, read, persist
│   ├── lib/
│   │   └── navigation.ts         → openNavigation(): deep link Google/Apple Maps
│   ├── constants/
│   │   ├── colors.ts             → Tema Rioja Clásico + colores por categoría
│   │   └── categories.ts         → Config de categorías (emoji, label, color key)
│   ├── types/
│   │   └── event.ts              → Event interface (copia del backend)
│   ├── __tests__/
│   │   ├── useEvents.test.ts
│   │   ├── useFavorites.test.ts
│   │   └── navigation.test.ts
│   ├── app.json
│   └── package.json
├── data/
│   ├── venues.json               → 30 locales geocodificados {name, lat, lng}
│   └── san-bernabe-2026.json     → Array de eventos completo del festival
└── docs/
```

---

## FASE 1: Backend

### Task 1: Scaffold del backend

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `backend/src/index.ts`

- [ ] **Step 1: Crear carpeta e inicializar proyecto**

```bash
cd /home/sacha/proyectos/fiestas-logrono
mkdir -p backend/src/events backend/src/middleware backend/migrations
cd backend
npm init -y
```

- [ ] **Step 2: Instalar dependencias**

```bash
npm install hono @hono/node-server postgres
npm install -D typescript tsx vitest @types/node
```

- [ ] **Step 3: Crear `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Crear `backend/.env.example`**

```
DATABASE_URL=postgresql://user:password@host:5432/fiestas
API_KEY=cambia-esto-por-un-secreto-seguro
PORT=3000
```

- [ ] **Step 5: Crear `backend/src/app.ts`** (definición de la app, sin servidor)

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'

export const app = new Hono()
app.use('*', logger())
app.get('/health', (c) => c.json({ ok: true }))
```

Crear **`backend/src/index.ts`** (entry point que arranca el servidor):

```typescript
import { serve } from '@hono/node-server'
import { app } from './app.js'

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`)
})
```

- [ ] **Step 6: Añadir scripts a `backend/package.json`**

Editar el `package.json` generado para añadir:
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  }
}
```

- [ ] **Step 7: Verificar que arranca**

```bash
cp .env.example .env
# (editar .env con una DATABASE_URL real — puedes dejarlo vacío por ahora)
npx tsx src/index.ts
```
Expected: `Server running on port 3000`  
Ctrl+C para parar.

- [ ] **Step 8: Commit**

```bash
cd /home/sacha/proyectos/fiestas-logrono
git add backend/
git commit -m "feat(backend): scaffold Hono server"
```

---

### Task 2: Migración y conexión a PostgreSQL

**Files:**
- Create: `backend/migrations/001_create_events.sql`
- Create: `backend/src/db.ts`

- [ ] **Step 1: Crear migración SQL**

```sql
-- backend/migrations/001_create_events.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS events (
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

CREATE INDEX IF NOT EXISTS idx_events_festival  ON events(festival);
CREATE INDEX IF NOT EXISTS idx_events_category  ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_start     ON events(start_time);
```

- [ ] **Step 2: Crear `backend/src/db.ts`**

```typescript
import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL env var is required')
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
})

export default sql
```

- [ ] **Step 3: Ejecutar la migración contra tu base de datos**

Provisiona una base de datos PostgreSQL (Railway te da una gratis). Luego:

```bash
# En backend/, con DATABASE_URL en .env
npx tsx -e "
import 'dotenv/config'
import { readFileSync } from 'fs'
import postgres from 'postgres'
const sql = postgres(process.env.DATABASE_URL)
await sql.unsafe(readFileSync('migrations/001_create_events.sql', 'utf8'))
await sql.end()
console.log('Migration OK')
"
```
Expected: `Migration OK`

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/ backend/src/db.ts
git commit -m "feat(backend): add PostgreSQL connection and events migration"
```

---

### Task 3: Types y queries de eventos

**Files:**
- Create: `backend/src/events/types.ts`
- Create: `backend/src/events/queries.ts`

- [ ] **Step 1: Crear `backend/src/events/types.ts`**

```typescript
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

export interface EventInput {
  festival: string
  name: string
  description?: string | null
  category: EventCategory
  isJunior?: boolean
  lat: number
  lng: number
  venueName: string
  startTime: string
  endTime?: string | null
  imageUrl?: string | null
}
```

- [ ] **Step 2: Crear `backend/src/events/queries.ts`**

```typescript
import sql from '../db.js'
import type { Event, EventInput } from './types.js'

type Row = {
  id: string
  festival: string
  name: string
  description: string | null
  category: string
  is_junior: boolean
  lat: number
  lng: number
  venue_name: string
  start_time: Date
  end_time: Date | null
  image_url: string | null
}

function rowToEvent(row: Row): Event {
  return {
    id: row.id,
    festival: row.festival,
    name: row.name,
    description: row.description,
    category: row.category as Event['category'],
    isJunior: row.is_junior,
    lat: Number(row.lat),
    lng: Number(row.lng),
    venueName: row.venue_name,
    startTime: row.start_time.toISOString(),
    endTime: row.end_time?.toISOString() ?? null,
    imageUrl: row.image_url,
  }
}

export async function getEvents(params: {
  festival: string
  category?: string
  junior?: boolean
}): Promise<Event[]> {
  const rows = await sql<Row[]>`
    SELECT * FROM events
    WHERE festival = ${params.festival}
    ${params.category ? sql`AND category = ${params.category}` : sql``}
    ${params.junior !== undefined ? sql`AND is_junior = ${params.junior}` : sql``}
    ORDER BY start_time ASC
  `
  return rows.map(rowToEvent)
}

export async function insertEvents(inputs: EventInput[]): Promise<number> {
  if (inputs.length === 0) return 0
  const rows = inputs.map((e) => ({
    festival:    e.festival,
    name:        e.name,
    description: e.description ?? null,
    category:    e.category,
    is_junior:   e.isJunior ?? false,
    lat:         e.lat,
    lng:         e.lng,
    venue_name:  e.venueName,
    start_time:  e.startTime,
    end_time:    e.endTime ?? null,
    image_url:   e.imageUrl ?? null,
  }))
  const result = await sql`INSERT INTO events ${sql(rows)}`
  return result.count
}

export async function deleteByFestival(festival: string): Promise<number> {
  const result = await sql`DELETE FROM events WHERE festival = ${festival}`
  return result.count
}
```

- [ ] **Step 3: Escribir tests para las queries**

Crear `backend/src/events/queries.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import sql from '../db.js'
import { getEvents, insertEvents, deleteByFestival } from './queries.js'

const FESTIVAL = 'test-festival'

beforeAll(async () => {
  // Asegura tabla limpia para el festival de test
  await sql`DELETE FROM events WHERE festival = ${FESTIVAL}`
})

afterAll(async () => {
  await sql`DELETE FROM events WHERE festival = ${FESTIVAL}`
  await sql.end()
})

beforeEach(async () => {
  await sql`DELETE FROM events WHERE festival = ${FESTIVAL}`
})

const sampleEvent = {
  festival: FESTIVAL,
  name: 'Concierto Test',
  category: 'musica' as const,
  lat: 42.4657,
  lng: -2.4448,
  venueName: 'Plaza del Mercado',
  startTime: '2026-06-06T21:00:00Z',
}

describe('insertEvents', () => {
  it('inserts events and returns count', async () => {
    const count = await insertEvents([sampleEvent])
    expect(count).toBe(1)
  })

  it('inserts multiple events', async () => {
    const count = await insertEvents([sampleEvent, { ...sampleEvent, name: 'Otro' }])
    expect(count).toBe(2)
  })
})

describe('getEvents', () => {
  it('returns events for the festival', async () => {
    await insertEvents([sampleEvent])
    const events = await getEvents({ festival: FESTIVAL })
    expect(events).toHaveLength(1)
    expect(events[0].name).toBe('Concierto Test')
    expect(events[0].isJunior).toBe(false)
  })

  it('filters by category', async () => {
    await insertEvents([sampleEvent, { ...sampleEvent, category: 'infantil', name: 'Cuento' }])
    const events = await getEvents({ festival: FESTIVAL, category: 'musica' })
    expect(events).toHaveLength(1)
    expect(events[0].category).toBe('musica')
  })

  it('orders by start_time ascending', async () => {
    await insertEvents([
      { ...sampleEvent, name: 'B', startTime: '2026-06-07T21:00:00Z' },
      { ...sampleEvent, name: 'A', startTime: '2026-06-06T21:00:00Z' },
    ])
    const events = await getEvents({ festival: FESTIVAL })
    expect(events[0].name).toBe('A')
    expect(events[1].name).toBe('B')
  })
})

describe('deleteByFestival', () => {
  it('deletes all events for a festival', async () => {
    await insertEvents([sampleEvent])
    const count = await deleteByFestival(FESTIVAL)
    expect(count).toBe(1)
    const events = await getEvents({ festival: FESTIVAL })
    expect(events).toHaveLength(0)
  })
})
```

- [ ] **Step 4: Ejecutar tests**

```bash
cd backend
DATABASE_URL="tu-url-de-test" npx vitest run src/events/queries.test.ts
```
Expected: All tests pass (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/events/
git commit -m "feat(backend): add event types and SQL queries with tests"
```

---

### Task 4: Auth middleware y router de eventos

**Files:**
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/events/router.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Crear `backend/src/middleware/auth.ts`**

```typescript
import type { MiddlewareHandler } from 'hono'

export const apiKeyAuth: MiddlewareHandler = async (c, next) => {
  const key = c.req.header('x-api-key')
  if (!key || key !== process.env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
}
```

- [ ] **Step 2: Crear `backend/src/events/router.ts`**

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { apiKeyAuth } from '../middleware/auth.js'
import { getEvents, insertEvents, deleteByFestival } from './queries.js'
import type { EventInput } from './types.js'

const app = new Hono()

// GET /api/events?festival=san-bernabe-2026&category=musica&junior=true
app.get('/', async (c) => {
  const festival = c.req.query('festival')
  if (!festival) return c.json({ error: 'festival query param required' }, 400)

  const category = c.req.query('category') ?? undefined
  const juniorParam = c.req.query('junior')
  const junior = juniorParam === 'true' ? true : juniorParam === 'false' ? false : undefined

  const events = await getEvents({ festival, category, junior })
  return c.json(events)
})

const EventInputSchema = z.object({
  festival:    z.string(),
  name:        z.string(),
  description: z.string().nullable().optional(),
  category:    z.enum(['musica','infantil','gastronomia','historia','danza','teatro','mercado','religioso','otros']),
  isJunior:    z.boolean().optional(),
  lat:         z.number(),
  lng:         z.number(),
  venueName:   z.string(),
  startTime:   z.string(),
  endTime:     z.string().nullable().optional(),
  imageUrl:    z.string().nullable().optional(),
})

const LoadBodySchema = z.object({
  events: z.array(EventInputSchema).min(1),
})

// POST /api/events/load  (requiere x-api-key)
app.post('/load', apiKeyAuth, zValidator('json', LoadBodySchema), async (c) => {
  const { events } = c.req.valid('json')
  const count = await insertEvents(events as EventInput[])
  return c.json({ inserted: count })
})

// DELETE /api/events?festival=san-bernabe-2026  (requiere x-api-key)
app.delete('/', apiKeyAuth, async (c) => {
  const festival = c.req.query('festival')
  if (!festival) return c.json({ error: 'festival query param required' }, 400)
  const count = await deleteByFestival(festival)
  return c.json({ deleted: count })
})

export default app
```

- [ ] **Step 3: Instalar zod y @hono/zod-validator**

```bash
cd backend
npm install zod @hono/zod-validator
```

- [ ] **Step 4: Actualizar `backend/src/app.ts`** para añadir cors y el router**

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import eventsRouter from './events/router.js'

export const app = new Hono()

app.use('*', logger())
app.use('*', cors())
app.get('/health', (c) => c.json({ ok: true }))
app.route('/api/events', eventsRouter)
```

`backend/src/index.ts` no cambia — sigue importando `app` desde `./app.js`.

- [ ] **Step 5: Escribir test del router**

Crear `backend/src/events/router.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { app } from '../../app.js'

// Mock queries para no necesitar DB en este test
vi.mock('./queries.js', () => ({
  getEvents: vi.fn().mockResolvedValue([
    { id: '1', festival: 'test', name: 'Evento', category: 'musica',
      isJunior: false, lat: 42.4, lng: -2.4, venueName: 'Plaza',
      startTime: '2026-06-06T21:00:00Z', endTime: null,
      description: null, imageUrl: null }
  ]),
  insertEvents: vi.fn().mockResolvedValue(2),
  deleteByFestival: vi.fn().mockResolvedValue(5),
}))

describe('GET /api/events', () => {
  it('returns 400 without festival param', async () => {
    const res = await app.request('/api/events')
    expect(res.status).toBe(400)
  })

  it('returns events array', async () => {
    const res = await app.request('/api/events?festival=test')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].name).toBe('Evento')
  })
})

describe('POST /api/events/load', () => {
  it('returns 401 without api key', async () => {
    const res = await app.request('/api/events/load', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('inserts events with valid api key', async () => {
    process.env.API_KEY = 'test-key'
    const { app } = await import('../../app.js')
    const res = await app.request('/api/events/load', {
      method: 'POST',
      headers: { 'x-api-key': 'test-key', 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{
        festival: 'test', name: 'Evento', category: 'musica',
        lat: 42.4, lng: -2.4, venueName: 'Plaza', startTime: '2026-06-06T21:00:00Z'
      }]})
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.inserted).toBe(2)
  })
})

describe('DELETE /api/events', () => {
  it('returns 401 without api key', async () => {
    const res = await app.request('/api/events?festival=test', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('deletes events with valid api key', async () => {
    process.env.API_KEY = 'test-key'
    const { app } = await import('../../app.js')
    const res = await app.request('/api/events?festival=test', {
      method: 'DELETE',
      headers: { 'x-api-key': 'test-key' }
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(5)
  })
})
```

- [ ] **Step 6: Ejecutar tests del router**

```bash
cd backend
npx vitest run src/events/router.test.ts
```
Expected: 5 tests pass.

- [ ] **Step 7: Smoke test manual**

```bash
npx tsx src/index.ts &
curl http://localhost:3000/health
# Expected: {"ok":true}
curl "http://localhost:3000/api/events?festival=san-bernabe-2026"
# Expected: [] (vacío, aún no hay datos)
kill %1
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/
git commit -m "feat(backend): add events router with auth middleware and tests"
```

---

### Task 5: Deploy backend a Railway

**Files:** Solo configuración, no nuevos ficheros de código.

- [ ] **Step 1: Crear `backend/railway.toml`**

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run build && npm start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
```

- [ ] **Step 2: Añadir script de build a `backend/package.json`**

El `package.json` ya tiene `"build": "tsc"`. Asegúrate de que también hay `"start": "node dist/index.js"`.

Verificar con:
```bash
cd backend
npm run build
node dist/index.js
```
Expected: `Server running on port 3000`

- [ ] **Step 3: Desplegar en Railway**

```bash
# Instalar Railway CLI si no lo tienes
npm install -g @railway/cli

cd backend
railway login
railway init          # crea proyecto en Railway
railway up            # despliega
```

- [ ] **Step 4: Configurar variables de entorno en Railway**

En el dashboard de Railway, ir a Variables y añadir:
- `DATABASE_URL` → URL de la PostgreSQL que provisiones en Railway
- `API_KEY` → genera un secreto con `openssl rand -hex 32`
- `PORT` → Railway lo inyecta automáticamente, no hace falta

- [ ] **Step 5: Ejecutar la migración contra la DB de producción**

```bash
DATABASE_URL="tu-url-de-railway" npx tsx -e "
import { readFileSync } from 'fs'
import postgres from 'postgres'
const sql = postgres(process.env.DATABASE_URL)
await sql.unsafe(readFileSync('migrations/001_create_events.sql', 'utf8'))
await sql.end()
console.log('Migration OK')
"
```

- [ ] **Step 6: Verificar el health endpoint**

```bash
curl https://tu-app.railway.app/health
# Expected: {"ok":true}
```

- [ ] **Step 7: Commit**

```bash
git add backend/railway.toml
git commit -m "feat(backend): add Railway deploy config"
git push
```

---

## FASE 2: Frontend

### Task 6: Crear proyecto Expo

**Files:**
- Create: `frontend/` (proyecto Expo completo)
- Create: `frontend/types/event.ts`

- [ ] **Step 1: Crear proyecto Expo con expo-router**

```bash
cd /home/sacha/proyectos/fiestas-logrono
npx create-expo-app frontend --template blank-typescript
cd frontend
```

- [ ] **Step 2: Instalar expo-router**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens \
  expo-linking expo-constants expo-status-bar
```

- [ ] **Step 3: Instalar dependencias del proyecto**

```bash
npx expo install \
  react-native-maps \
  @tanstack/react-query \
  @gorhom/bottom-sheet \
  react-native-reanimated \
  react-native-gesture-handler \
  @react-native-async-storage/async-storage

npm install react-leaflet leaflet
npm install -D @types/leaflet
```

- [ ] **Step 4: Configurar `frontend/app.json`**

```json
{
  "expo": {
    "name": "Fiestas Logroño",
    "slug": "fiestas-logrono",
    "version": "1.0.0",
    "scheme": "fiestas-logrono",
    "platforms": ["ios", "android", "web"],
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "ios": {
      "bundleIdentifier": "com.sachonidas.fiestaslogrono",
      "config": {
        "googleMapsApiKey": "TU_API_KEY_GOOGLE_MAPS"
      }
    },
    "android": {
      "package": "com.sachonidas.fiestaslogrono",
      "config": {
        "googleMaps": {
          "apiKey": "TU_API_KEY_GOOGLE_MAPS"
        }
      }
    },
    "plugins": [
      "expo-router",
      ["react-native-maps", { "googleMapsApiKey": "TU_API_KEY_GOOGLE_MAPS" }]
    ]
  }
}
```

- [ ] **Step 5: Crear `frontend/types/event.ts`**

```typescript
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
```

- [ ] **Step 6: Commit**

```bash
cd /home/sacha/proyectos/fiestas-logrono
git add frontend/
git commit -m "feat(frontend): init Expo project with dependencies"
```

---

### Task 7: Tema y constantes

**Files:**
- Create: `frontend/constants/colors.ts`
- Create: `frontend/constants/categories.ts`
- Create: `frontend/constants/api.ts`

- [ ] **Step 1: Crear `frontend/constants/colors.ts`**

```typescript
export const Colors = {
  primary:     '#8B0000',
  accent:      '#F0C040',
  background:  '#1A0A0A',
  surface:     '#2D0C0C',
  border:      '#4A1010',
  text:        '#FFFFFF',
  textMuted:   'rgba(255,255,255,0.6)',
  textDark:    '#1A0A0A',

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
  } as Record<string, string>,
} as const
```

- [ ] **Step 2: Crear `frontend/constants/categories.ts`**

```typescript
import type { EventCategory } from '../types/event'

export interface CategoryConfig {
  key: EventCategory | 'all'
  label: string
  emoji: string
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'all',        label: 'Todos',       emoji: '📍' },
  { key: 'musica',     label: 'Música',      emoji: '🎵' },
  { key: 'infantil',   label: 'Infantil',    emoji: '🧒' },
  { key: 'gastronomia',label: 'Gastro',      emoji: '🍷' },
  { key: 'historia',   label: 'Historia',    emoji: '⚔️' },
  { key: 'danza',      label: 'Danza',       emoji: '💃' },
  { key: 'teatro',     label: 'Teatro',      emoji: '🎭' },
  { key: 'mercado',    label: 'Mercado',     emoji: '🏪' },
  { key: 'religioso',  label: 'Religioso',   emoji: '⛪' },
]
```

- [ ] **Step 3: Crear `frontend/constants/api.ts`**

```typescript
// Cambia esta URL por la de Railway cuando la tengas
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'
export const FESTIVAL = process.env.EXPO_PUBLIC_FESTIVAL ?? 'san-bernabe-2026'
```

- [ ] **Step 4: Commit**

```bash
git add frontend/constants/ frontend/types/
git commit -m "feat(frontend): add theme colors and category constants"
```

---

### Task 8: Hooks — useEvents y useFavorites

**Files:**
- Create: `frontend/hooks/useEvents.ts`
- Create: `frontend/hooks/useFavorites.ts`
- Create: `frontend/__tests__/useEvents.test.ts`
- Create: `frontend/__tests__/useFavorites.test.ts`

- [ ] **Step 1: Configurar jest en `frontend/package.json`**

```bash
cd frontend
npx expo install jest-expo @testing-library/react-native @testing-library/jest-native
```

Añadir a `frontend/package.json`:
```json
{
  "jest": {
    "preset": "jest-expo",
    "moduleNameMapper": {
      "^@react-native-async-storage/async-storage$":
        "<rootDir>/__mocks__/@react-native-async-storage/async-storage.js"
    }
  },
  "scripts": {
    "test": "jest"
  }
}
```

- [ ] **Step 2: Crear mock de AsyncStorage**

```bash
mkdir -p frontend/__mocks__/@react-native-async-storage
```

Crear `frontend/__mocks__/@react-native-async-storage/async-storage.js`:
```javascript
const store = {}
module.exports = {
  getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key, value) => { store[key] = value; return Promise.resolve() }),
  removeItem: jest.fn((key) => { delete store[key]; return Promise.resolve() }),
  clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); return Promise.resolve() }),
}
```

- [ ] **Step 3: Escribir test de useEvents**

Crear `frontend/__tests__/useEvents.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useEvents } from '../hooks/useEvents'
import type { Event } from '../types/event'

const mockEvent: Event = {
  id: '1', festival: 'san-bernabe-2026', name: 'Concierto',
  description: null, category: 'musica', isJunior: false,
  lat: 42.4657, lng: -2.4448, venueName: 'Plaza del Mercado',
  startTime: '2026-06-06T21:00:00Z', endTime: null, imageUrl: null,
}

global.fetch = jest.fn()

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, {
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } })
  }, children)

beforeEach(() => jest.clearAllMocks())

describe('useEvents', () => {
  it('returns events from API', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockEvent]),
    })
    const { result } = renderHook(() => useEvents({}), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].name).toBe('Concierto')
  })

  it('filters by category client-side', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        mockEvent,
        { ...mockEvent, id: '2', category: 'infantil', name: 'Cuento' }
      ]),
    })
    const { result } = renderHook(() => useEvents({ category: 'musica' }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].category).toBe('musica')
  })
})
```

- [ ] **Step 4: Crear `frontend/hooks/useEvents.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { API_BASE_URL, FESTIVAL } from '../constants/api'
import type { Event, EventCategory } from '../types/event'

async function fetchEvents(): Promise<Event[]> {
  const res = await fetch(`${API_BASE_URL}/api/events?festival=${FESTIVAL}`)
  if (!res.ok) throw new Error('Failed to fetch events')
  return res.json()
}

export function useEvents(params: {
  category?: EventCategory | 'all'
  junior?: boolean
}) {
  return useQuery({
    queryKey: ['events', FESTIVAL],
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000,
    select: (data) => {
      let events = data
      if (params.category && params.category !== 'all') {
        events = events.filter((e) => e.category === params.category)
      }
      if (params.junior !== undefined) {
        events = events.filter((e) => e.isJunior === params.junior)
      }
      return events
    },
  })
}
```

- [ ] **Step 5: Ejecutar test de useEvents**

```bash
cd frontend
npx jest __tests__/useEvents.test.ts
```
Expected: 2 tests pass.

- [ ] **Step 6: Escribir test de useFavorites**

Crear `frontend/__tests__/useFavorites.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFavorites } from '../hooks/useFavorites'

beforeEach(() => {
  jest.clearAllMocks()
  ;(AsyncStorage.clear as jest.Mock)()
})

describe('useFavorites', () => {
  it('starts with empty favorites', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    const { result } = renderHook(() => useFavorites())
    expect(result.current.isFavorite('1')).toBe(false)
  })

  it('toggles favorite on and off', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    const { result } = renderHook(() => useFavorites())

    act(() => result.current.toggle('1'))
    expect(result.current.isFavorite('1')).toBe(true)

    act(() => result.current.toggle('1'))
    expect(result.current.isFavorite('1')).toBe(false)
  })

  it('persists favorites to AsyncStorage', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    const { result } = renderHook(() => useFavorites())

    act(() => result.current.toggle('abc'))
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'favorites',
      JSON.stringify(['abc'])
    )
  })
})
```

- [ ] **Step 7: Crear `frontend/hooks/useFavorites.ts`**

```typescript
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
```

- [ ] **Step 8: Ejecutar test de useFavorites**

```bash
npx jest __tests__/useFavorites.test.ts
```
Expected: 3 tests pass.

- [ ] **Step 9: Commit**

```bash
cd /home/sacha/proyectos/fiestas-logrono
git add frontend/hooks/ frontend/__tests__/ frontend/__mocks__/
git commit -m "feat(frontend): add useEvents and useFavorites hooks with tests"
```

---

### Task 9: Utilidad de navegación

**Files:**
- Create: `frontend/lib/navigation.ts`
- Create: `frontend/__tests__/navigation.test.ts`

- [ ] **Step 1: Escribir test**

Crear `frontend/__tests__/navigation.test.ts`:

```typescript
import { Platform, Linking } from 'react-native'
import { openNavigation } from '../lib/navigation'

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn(),
}))
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: { openURL: jest.fn() },
  Platform: { OS: 'ios' },
}))

describe('openNavigation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('opens Apple Maps on iOS', () => {
    Platform.OS = 'ios' as typeof Platform.OS
    openNavigation(42.4657, -2.4448, 'Plaza del Mercado')
    expect(Linking.openURL).toHaveBeenCalledWith(
      'maps://?daddr=42.4657,-2.4448&q=Plaza%20del%20Mercado'
    )
  })

  it('opens Google Maps on Android', () => {
    Platform.OS = 'android' as typeof Platform.OS
    openNavigation(42.4657, -2.4448, 'Plaza del Mercado')
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('google.com/maps')
    )
  })
})
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
cd frontend
npx jest __tests__/navigation.test.ts
```
Expected: FAIL — `openNavigation` no existe.

- [ ] **Step 3: Crear `frontend/lib/navigation.ts`**

```typescript
import { Platform, Linking } from 'react-native'

export function openNavigation(lat: number, lng: number, label: string): void {
  const encodedLabel = encodeURIComponent(label)

  if (Platform.OS === 'ios') {
    Linking.openURL(`maps://?daddr=${lat},${lng}&q=${encodedLabel}`)
  } else if (Platform.OS === 'android') {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedLabel}`
    )
  } else {
    // web
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    )
  }
}
```

- [ ] **Step 4: Ejecutar test**

```bash
npx jest __tests__/navigation.test.ts
```
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /home/sacha/proyectos/fiestas-logrono
git add frontend/lib/
git commit -m "feat(frontend): add openNavigation utility with tests"
```

---

### Task 10: Componente CategoryFilter

**Files:**
- Create: `frontend/components/CategoryFilter.tsx`

- [ ] **Step 1: Crear `frontend/components/CategoryFilter.tsx`**

```typescript
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { CATEGORIES, type CategoryConfig } from '../constants/categories'
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
```

- [ ] **Step 2: Smoke test visual**

Añadir temporalmente a `frontend/app/(tabs)/index.tsx`:
```typescript
import { CategoryFilter } from '../../components/CategoryFilter'
import { useState } from 'react'
import { View } from 'react-native'

export default function MapTab() {
  const [cat, setCat] = useState<any>('all')
  return (
    <View style={{ flex: 1, backgroundColor: '#1A0A0A', paddingTop: 60 }}>
      <CategoryFilter selected={cat} onChange={setCat} />
    </View>
  )
}
```

```bash
cd frontend
npx expo start --web
```

Abre `http://localhost:8081` y verifica que los chips se ven y se pueden pulsar.

- [ ] **Step 3: Commit**

```bash
cd /home/sacha/proyectos/fiestas-logrono
git add frontend/components/CategoryFilter.tsx frontend/app/
git commit -m "feat(frontend): add CategoryFilter chip bar"
```

---

### Task 11: Componente Map (native + web)

**Files:**
- Create: `frontend/components/Map.native.tsx`
- Create: `frontend/components/Map.web.tsx`
- Create: `frontend/components/Map.tsx` (re-export vacío, no necesario con Expo)

- [ ] **Step 1: Crear `frontend/components/Map.native.tsx`**

```typescript
import MapView, { Marker, type Region } from 'react-native-maps'
import { StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'
import type { Event } from '../types/event'

const LOGRONO_REGION: Region = {
  latitude: 42.4667,
  longitude: -2.4457,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
}

interface Props {
  events: Event[]
  onSelectEvent: (event: Event) => void
}

export function Map({ events, onSelectEvent }: Props) {
  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      initialRegion={LOGRONO_REGION}
      showsUserLocation
    >
      {events.map((event) => (
        <Marker
          key={event.id}
          coordinate={{ latitude: event.lat, longitude: event.lng }}
          title={event.name}
          pinColor={Colors.categories[event.category] ?? Colors.primary}
          onPress={() => onSelectEvent(event)}
        />
      ))}
    </MapView>
  )
}
```

- [ ] **Step 2: Añadir CSS global de Leaflet para web**

Crear `frontend/assets/leaflet.css` copiando el CSS de leaflet:
```bash
cp node_modules/leaflet/dist/leaflet.css frontend/assets/leaflet.css
```

En `frontend/app/_layout.tsx` (paso siguiente), importar el CSS en web.

- [ ] **Step 3: Crear `frontend/components/Map.web.tsx`**

```typescript
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Colors } from '../constants/colors'
import type { Event } from '../types/event'

interface Props {
  events: Event[]
  onSelectEvent: (event: Event) => void
}

const LOGRONO_CENTER: [number, number] = [42.4667, -2.4457]

export function Map({ events, onSelectEvent }: Props) {
  useEffect(() => {
    // Importar dinámicamente para evitar SSR issues
    let map: any
    let L: any

    import('leaflet').then((leafletModule) => {
      L = leafletModule.default

      // Parchear iconos de Leaflet (bug conocido con webpack/metro)
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      map = L.map('leaflet-map').setView(LOGRONO_CENTER, 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map)

      events.forEach((event) => {
        const color = Colors.categories[event.category] ?? Colors.primary
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })
        L.marker([event.lat, event.lng], { icon })
          .addTo(map)
          .on('click', () => onSelectEvent(event))
      })
    })

    return () => { map?.remove() }
  }, [events])

  return (
    <View style={styles.container}>
      <div id="leaflet-map" style={{ width: '100%', height: '100%' }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
```

- [ ] **Step 4: Verificar que el mapa web funciona**

```bash
cd frontend
npx expo start --web
```

Navega a la tab de Mapa. Deberías ver el mapa de Logroño centrado en la ciudad.

- [ ] **Step 5: Commit**

```bash
cd /home/sacha/proyectos/fiestas-logrono
git add frontend/components/Map.native.tsx frontend/components/Map.web.tsx frontend/assets/
git commit -m "feat(frontend): add Map component with native (react-native-maps) and web (leaflet) implementations"
```

---

### Task 12: EventBottomSheet y EventRow

**Files:**
- Create: `frontend/components/EventBottomSheet.tsx`
- Create: `frontend/components/EventRow.tsx`

- [ ] **Step 1: Crear `frontend/components/EventRow.tsx`**

```typescript
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
  const cat = CATEGORIES.find((c) => c.key === event.category)
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
```

- [ ] **Step 2: Crear `frontend/components/EventBottomSheet.tsx`**

```typescript
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { Text, View, TouchableOpacity, StyleSheet, Platform } from 'react-native'
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
```

- [ ] **Step 3: Commit**

```bash
cd /home/sacha/proyectos/fiestas-logrono
git add frontend/components/EventBottomSheet.tsx frontend/components/EventRow.tsx
git commit -m "feat(frontend): add EventBottomSheet and EventRow components"
```

---

### Task 13: Root layout y Tab navigator

**Files:**
- Create: `frontend/app/_layout.tsx`
- Create: `frontend/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Crear `frontend/app/_layout.tsx`**

```typescript
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StyleSheet } from 'react-native'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
})

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({ root: { flex: 1 } })
```

- [ ] **Step 2: Crear `frontend/app/(tabs)/_layout.tsx`**

```typescript
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
        options={{ title: 'Mapa', tabBarIcon: ({ focused }) => <TabIcon emoji="🗺" focused={focused} /> }}
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
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/
git commit -m "feat(frontend): add root layout and tab navigator"
```

---

### Task 14: Tab Mapa (pantalla principal)

**Files:**
- Modify: `frontend/app/(tabs)/index.tsx`

- [ ] **Step 1: Reemplazar `frontend/app/(tabs)/index.tsx`**

```typescript
import { useState, useRef, useCallback } from 'react'
import { View, StyleSheet, SafeAreaView } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { Map } from '../../components/Map'
import { CategoryFilter } from '../../components/CategoryFilter'
import { EventBottomSheet } from '../../components/EventBottomSheet'
import { useEvents } from '../../hooks/useEvents'
import { useFavorites } from '../../hooks/useFavorites'
import { Colors } from '../../constants/colors'
import type { Event, EventCategory } from '../../types/event'

export default function MapTab() {
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const bottomSheetRef = useRef<BottomSheet>(null)

  const { data: events = [] } = useEvents({ category: selectedCategory })
  const { isFavorite, toggle } = useFavorites()

  const handleSelectEvent = useCallback((event: Event) => {
    setSelectedEvent(event)
    bottomSheetRef.current?.expand()
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSelectedEvent(null)
  }, [])

  return (
    <View style={styles.container}>
      <Map events={events} onSelectEvent={handleSelectEvent} />

      <SafeAreaView style={styles.filterOverlay} pointerEvents="box-none">
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
      </SafeAreaView>

      <EventBottomSheet
        ref={bottomSheetRef}
        event={selectedEvent}
        isFavorite={selectedEvent ? isFavorite(selectedEvent.id) : false}
        onToggleFavorite={() => selectedEvent && toggle(selectedEvent.id)}
        onClose={handleCloseSheet}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
})
```

- [ ] **Step 2: Test visual en web**

```bash
cd frontend
npx expo start --web
```

Verifica: mapa visible, chips de filtro arriba, al pulsar un pin aparece el bottom sheet con info del evento.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(tabs)/index.tsx
git commit -m "feat(frontend): implement Map tab with filter and bottom sheet"
```

---

### Task 15: Tab Lista y Tab Guardados

**Files:**
- Create: `frontend/app/(tabs)/list.tsx`
- Create: `frontend/app/(tabs)/favorites.tsx`

- [ ] **Step 1: Crear `frontend/app/(tabs)/list.tsx`**

```typescript
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
```

- [ ] **Step 2: Crear `frontend/app/(tabs)/favorites.tsx`**

```typescript
import { useRef, useState } from 'react'
import { FlatList, View, Text, StyleSheet, SafeAreaView } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { EventRow } from '../../components/EventRow'
import { EventBottomSheet } from '../../components/EventBottomSheet'
import { useEvents } from '../../hooks/useEvents'
import { useFavorites } from '../../hooks/useFavorites'
import { Colors } from '../../constants/colors'
import type { Event } from '../../types/event'

export default function FavoritesTab() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const bottomSheetRef = useRef<BottomSheet>(null)

  const { data: events = [] } = useEvents({})
  const { favorites, isFavorite, toggle } = useFavorites()

  const favoriteEvents = events.filter((e) => favorites.includes(e.id))

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Guardados</Text>

      <FlatList
        data={favoriteEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventRow
            event={item}
            isFavorite
            onPress={() => { setSelectedEvent(item); bottomSheetRef.current?.expand() }}
            onToggleFavorite={() => toggle(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🤍</Text>
            <Text style={styles.emptyTitle}>Sin guardados aún</Text>
            <Text style={styles.emptyText}>Pulsa ❤️ en cualquier evento para guardarlo aquí</Text>
          </View>
        }
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
  header: { color: Colors.text, fontSize: 24, fontWeight: '800', padding: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
```

- [ ] **Step 3: Test visual completo**

```bash
cd frontend
npx expo start --web
```

Verifica las tres tabs: Mapa, Lista (con búsqueda y filtros), Guardados (con estado vacío).

- [ ] **Step 4: Commit**

```bash
cd /home/sacha/proyectos/fiestas-logrono
git add frontend/app/(tabs)/list.tsx frontend/app/(tabs)/favorites.tsx
git commit -m "feat(frontend): implement List and Favorites tabs"
```

---

### Task 16: PWA config y deploy a Vercel

**Files:**
- Modify: `frontend/app.json`
- Create: `frontend/vercel.json`

- [ ] **Step 1: Añadir config PWA a `frontend/app.json`**

Actualizar la sección `"web"`:
```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png",
      "name": "Fiestas Logroño",
      "shortName": "Fiestas LGR",
      "description": "Guía de las fiestas de Logroño",
      "themeColor": "#8B0000",
      "backgroundColor": "#1A0A0A"
    }
  }
}
```

- [ ] **Step 2: Crear `frontend/vercel.json`**

```json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist",
  "framework": null
}
```

- [ ] **Step 3: Crear fichero `.env` con la URL del backend**

```bash
cd frontend
echo "EXPO_PUBLIC_API_URL=https://tu-app.railway.app" > .env
echo "EXPO_PUBLIC_FESTIVAL=san-bernabe-2026" >> .env
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

Crear `.env.example`:
```
EXPO_PUBLIC_API_URL=https://tu-app.railway.app
EXPO_PUBLIC_FESTIVAL=san-bernabe-2026
```

- [ ] **Step 4: Build de producción web**

```bash
cd frontend
npx expo export --platform web
```
Expected: carpeta `dist/` generada sin errores.

- [ ] **Step 5: Desplegar a Vercel**

```bash
npm install -g vercel
vercel --cwd /home/sacha/proyectos/fiestas-logrono/frontend
```

Seguir el asistente de Vercel. Cuando pregunte por el directorio de output: `dist`.

Añadir las env vars en el dashboard de Vercel:
- `EXPO_PUBLIC_API_URL` → URL de Railway
- `EXPO_PUBLIC_FESTIVAL` → `san-bernabe-2026`

- [ ] **Step 6: Verificar la PWA en el navegador**

Abre la URL de Vercel en Chrome. Ve a las DevTools → Application → Manifest. Verifica que la app aparece como instalable (PWA).

- [ ] **Step 7: Commit**

```bash
cd /home/sacha/proyectos/fiestas-logrono
git add frontend/.env.example frontend/vercel.json frontend/app.json
git commit -m "feat(frontend): configure PWA and Vercel deploy"
git push
```

---

## FASE 3: Datos

### Task 17: Geocodificar venues y generar JSON de San Bernabé 2026

**Files:**
- Create: `data/venues.json`
- Create: `data/san-bernabe-2026.json`
- Create: `data/load.sh`

- [ ] **Step 1: Crear `data/venues.json`**

Coordenadas de todos los locales del programa. Verificar cada una en Google Maps antes de commitear.

```json
{
  "Plaza del Mercado": { "lat": 42.46584, "lng": -2.44472 },
  "Plaza de la Oca": { "lat": 42.46602, "lng": -2.44492 },
  "Plaza Santiago": { "lat": 42.46636, "lng": -2.44413 },
  "Plaza Diversidad": { "lat": 42.46560, "lng": -2.44580 },
  "Parking del Revellín": { "lat": 42.46484, "lng": -2.44690 },
  "Murallas del Revellín": { "lat": 42.46476, "lng": -2.44676 },
  "Arco de San Bernabé": { "lat": 42.46512, "lng": -2.44700 },
  "Plaza San Bartolomé": { "lat": 42.46708, "lng": -2.44398 },
  "Parque del Ebro": { "lat": 42.46100, "lng": -2.44100 },
  "Concha del Espolón": { "lat": 42.46512, "lng": -2.44313 },
  "Paseo del Espolón": { "lat": 42.46520, "lng": -2.44300 },
  "Plaza del Ayuntamiento": { "lat": 42.46654, "lng": -2.44426 },
  "Teatro Bretón": { "lat": 42.46450, "lng": -2.44280 },
  "Concatedral de la Redonda": { "lat": 42.46578, "lng": -2.44440 },
  "Parque de la Cometa": { "lat": 42.46900, "lng": -2.44800 },
  "Parque Gallarza": { "lat": 42.46800, "lng": -2.44600 },
  "Plaza Martínez Flamarique": { "lat": 42.46590, "lng": -2.44350 },
  "Plaza de Abastos": { "lat": 42.46700, "lng": -2.44500 },
  "Iglesia de Santiago el Real": { "lat": 42.46640, "lng": -2.44400 },
  "Fundación Ibercaja": { "lat": 42.46550, "lng": -2.44480 },
  "Auditorium del Ayuntamiento": { "lat": 42.46654, "lng": -2.44426 },
  "Plazuela Alonso Salazar (Calle Norte)": { "lat": 42.46700, "lng": -2.44600 },
  "C/ Portales / Juan Lobo": { "lat": 42.46580, "lng": -2.44420 },
  "C/ Once de Junio": { "lat": 42.46560, "lng": -2.44460 },
  "Plaza Martínez Zaporta": { "lat": 42.46600, "lng": -2.44380 },
  "Campamento Logroñés / Parque del Ebro": { "lat": 42.46100, "lng": -2.44100 },
  "Glorieta Dr. Zubía": { "lat": 42.46480, "lng": -2.44350 },
  "Rodríguez Paterna 21": { "lat": 42.46550, "lng": -2.44500 },
  "Plaza San Agustín": { "lat": 42.46650, "lng": -2.44350 },
  "Las Norias": { "lat": 42.47000, "lng": -2.44900 }
}
```

- [ ] **Step 2: Crear `data/san-bernabe-2026.json`**

Generar el JSON completo con todos los eventos del programa. Ejemplo de estructura (completar con TODOS los eventos de ambos PDFs):

```json
[
  {
    "festival": "san-bernabe-2026",
    "name": "Pregón de San Bernabé",
    "description": "Ludotecas y centros jóvenes",
    "category": "infantil",
    "isJunior": true,
    "lat": 42.46476,
    "lng": -2.44676,
    "venueName": "Murallas del Revellín",
    "startTime": "2026-06-05T18:30:00+02:00",
    "endTime": null,
    "imageUrl": null
  },
  {
    "festival": "san-bernabe-2026",
    "name": "La Uva Fest - La Orquestina Anarco Yeye y Animalversión",
    "description": "Inauguración festival de música",
    "category": "musica",
    "isJunior": false,
    "lat": 42.46484,
    "lng": -2.44690,
    "venueName": "Parking del Revellín",
    "startTime": "2026-06-05T20:00:00+02:00",
    "endTime": null,
    "imageUrl": null
  },
  {
    "festival": "san-bernabe-2026",
    "name": "Cañonazo inaugural y salvas de honor",
    "description": null,
    "category": "historia",
    "isJunior": false,
    "lat": 42.46512,
    "lng": -2.44700,
    "venueName": "Arco de San Bernabé",
    "startTime": "2026-06-06T11:30:00+02:00",
    "endTime": null,
    "imageUrl": null
  }
]
```

**Completar con todos los eventos de los PDFs** (≈300 eventos). Recomendación: hacerlo en bloques por día.

- [ ] **Step 3: Crear `data/load.sh`**

```bash
#!/bin/bash
# Carga los eventos de un festival en el backend
# Uso: ./data/load.sh san-bernabe-2026

FESTIVAL=${1:-san-bernabe-2026}
API_URL=${API_URL:-https://tu-app.railway.app}
API_KEY=${API_KEY:-}

if [ -z "$API_KEY" ]; then
  echo "ERROR: API_KEY env var required"
  exit 1
fi

echo "Deleting existing events for $FESTIVAL..."
curl -s -X DELETE "$API_URL/api/events?festival=$FESTIVAL" \
  -H "x-api-key: $API_KEY" | jq .

echo "Loading events from data/$FESTIVAL.json..."
curl -s -X POST "$API_URL/api/events/load" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"events\": $(cat data/$FESTIVAL.json)}" | jq .

echo "Done!"
```

```bash
chmod +x data/load.sh
```

- [ ] **Step 4: Cargar los datos**

```bash
API_URL=https://tu-app.railway.app \
API_KEY=tu-clave-secreta \
./data/load.sh san-bernabe-2026
```
Expected:
```json
{"deleted": 0}
{"inserted": 300}
```

- [ ] **Step 5: Verificar en la app**

Abre la PWA en Vercel y confirma que el mapa muestra pins en el casco histórico de Logroño.

- [ ] **Step 6: Commit**

```bash
git add data/
git commit -m "feat(data): add venues geocoding, San Bernabé 2026 events and load script"
git push
```

---

## Checklist final

- [ ] Backend deployado en Railway con `/health` respondiendo OK
- [ ] Frontend PWA deployada en Vercel, instalable desde Chrome
- [ ] Datos de San Bernabé 2026 cargados (ambos PDFs)
- [ ] Mapa muestra pins coloreados por categoría
- [ ] Filtros de categoría funcionan en mapa y lista
- [ ] Bottom sheet muestra detalles del evento
- [ ] Botón "Cómo llegar" abre Maps (Google en Android/web, Apple en iOS)
- [ ] Favoritos persisten al cerrar y reabrir la app
- [ ] Tab Lista agrupa por día con búsqueda
- [ ] `.env` excluido de git, `.env.example` commiteado

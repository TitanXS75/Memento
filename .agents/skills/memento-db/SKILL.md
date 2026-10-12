---
name: memento-db
description: >
  Local database patterns for Memento. Use when creating or modifying database
  schema, writing migrations, querying trips/media/transfers/archives,
  or implementing persistence logic.
---

# Memento — Database Skill

## Stack

- **Web/PWA:** IndexedDB via the `idb` library (`pnpm add idb`)
- **Native (Android/iOS):** SQLite via `@capacitor-community/sqlite`
- **Abstraction:** `lib/db/index.ts` — call `getDb()` everywhere; never use raw IDB or SQLite directly in components or stores.

## Schema Version

Current schema version: **1**

Always increment the version number in `lib/db/schema.ts` when changing the schema. Add a corresponding migration in `lib/db/migrations.ts`.

## Entities & Fields

### Trip
```typescript
interface Trip {
  id: string               // UUID v4
  name: string
  startDate: string        // ISO date YYYY-MM-DD
  endDate: string          // ISO date YYYY-MM-DD
  description: string
  coverMediaId: string | null
  createdAt: string        // ISO timestamp
  updatedAt: string
  archivedAt: string | null
}
```

### Device
```typescript
interface Device {
  id: string               // UUID v4, generated locally
  displayName: string      // user-visible name, e.g. "Alice's Phone"
  platform: 'android' | 'ios' | 'web'
  lastSeenAt: string       // ISO timestamp
  trustStatus: 'trusted' | 'pending' | 'blocked'
}
```

### MediaItem
```typescript
interface MediaItem {
  id: string               // UUID v4
  tripId: string
  filename: string
  mimeType: string         // e.g. 'image/jpeg', 'video/mp4'
  mediaType: 'photo' | 'video'
  sizeBytes: number
  capturedAt: string       // ISO timestamp, from EXIF or file metadata
  contentHash: string | null  // SHA-256 hex, null until computed
  localStorageReference: string | null  // file path or blob URL
  sourceDeviceId: string | null
  availabilityStatus: 'local' | 'remote_only' | 'unavailable'
  createdAt: string
}
```

### Transfer
```typescript
interface Transfer {
  id: string               // UUID v4
  tripId: string | null
  peerDeviceId: string
  direction: 'incoming' | 'outgoing'
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  totalBytes: number
  transferredBytes: number
  createdAt: string
  completedAt: string | null
  failureReason: string | null
}
```

### Archive
```typescript
interface Archive {
  id: string               // UUID v4
  tripId: string
  filename: string         // e.g. Goa_Trip_2026-10-10.zip
  selectedDates: string[]  // ISO date strings
  mediaItemIds: string[]   // IDs of included MediaItems
  photoCount: number
  videoCount: number
  totalSourceBytes: number
  archiveSizeBytes: number | null  // null until creation completes
  localStorageReference: string | null
  status: 'creating' | 'completed' | 'failed' | 'deleted'
  createdAt: string
}
```

## Object Stores (IndexedDB) / Tables (SQLite)

| Store/Table | Key | Indexes |
|-------------|-----|---------|
| `trips` | `id` | `archivedAt`, `createdAt` |
| `devices` | `id` | `lastSeenAt` |
| `mediaItems` | `id` | `tripId`, `capturedAt`, `contentHash` |
| `transfers` | `id` | `tripId`, `peerDeviceId`, `status` |
| `archives` | `id` | `tripId`, `status` |

## Migration Pattern

```typescript
// lib/db/migrations.ts
const migrations: Migration[] = [
  {
    version: 1,
    up: (db) => {
      // Create all stores for fresh install
      const trips = db.createObjectStore('trips', { keyPath: 'id' })
      trips.createIndex('by_archivedAt', 'archivedAt')
      trips.createIndex('by_createdAt', 'createdAt')
      // ... other stores
    },
  },
  // {
  //   version: 2,
  //   up: (db) => { /* add new index or store */ },
  // },
]
```

## Query Patterns

```typescript
// Get all active trips, newest first
const trips = await db.getAllFromIndex('trips', 'by_createdAt')
  .then(all => all.filter(t => !t.archivedAt).reverse())

// Get media for a trip on a specific date
const media = await db.getAllFromIndex('mediaItems', 'by_tripId', tripId)
  .then(all => all.filter(m => m.capturedAt.startsWith(date)))

// Get all completed archives for a trip
const archives = await db.getAllFromIndex('archives', 'by_tripId', tripId)
  .then(all => all.filter(a => a.status === 'completed'))
```

## Rules

- **Never store binary file data** (images, videos) in the database.
- Store `localStorageReference` as a relative path within app-private storage.
- Always set `updatedAt` when mutating a trip record.
- When deleting a trip, mark media as `availabilityStatus: 'unavailable'` — do not delete media records if they are part of a completed archive.
- When deleting an archive, set `status: 'deleted'` and delete the physical file — do NOT delete any MediaItem records.
- Use `crypto.randomUUID()` for all new IDs.
- Always wrap writes in a transaction.

# Memento — Data Model & Schema Specification

## 1. Storage Philosophy

1. **Isolation of Heavy Binaries:** Photos and videos are **never stored as BLOBs** within IndexedDB or SQLite. They reside in the device file system, sandbox directory, or camera roll, indexed purely by uniform file paths, content hashes, and metadata.
2. **Deterministic Identifiers:** UUID v4 is used for all entity primary keys.
3. **Immutability of Media Hashes:** Deduplication and verification rely on SHA-256 digests calculated from raw file bytes.

---

## 2. Entity Schemas

### `Trip`
Represents an organized journey with a name, date range, and optional cover image.
```typescript
interface Trip {
  id: string              // UUID v4
  name: string            // Display name
  startDate: string       // YYYY-MM-DD
  endDate: string         // YYYY-MM-DD
  description: string     // Optional notes/summary
  coverMediaId: string | null
  createdAt: string       // ISO 8601
  updatedAt: string       // ISO 8601
  archivedAt: string | null
}
```
**Indexes:** `by_createdAt`, `by_archivedAt`

---

### `Device`
Represents a peer discovered on the local network or paired previously.
```typescript
interface Device {
  id: string              // Unique device identifier
  name: string            // User-friendly display name (e.g. "Maya's iPhone")
  platform: 'android' | 'ios' | 'web'
  lastSeenAt: string      // ISO 8601
  address: string | null  // Local IP (e.g. "192.168.1.42")
  port: number | null     // Local HTTP server port
}
```
**Indexes:** `by_lastSeenAt`

---

### `MediaItem`
Metadata record for a photo or video associated with a trip.
```typescript
interface MediaItem {
  id: string              // UUID v4
  tripId: string          // Foreign key -> Trip.id
  type: 'photo' | 'video'
  fileName: string        // Base filename
  fileSizeBytes: number   // Raw size
  mimeType: string        // e.g. "image/jpeg", "video/mp4"
  capturedAt: string      // ISO 8601 (from EXIF or file timestamp)
  contentHash: string | null // SHA-256 hex string
  storageUri: string      // Device filesystem path or temporary blob URL
  thumbnailUri: string | null // Low-res thumbnail path
  width: number | null
  height: number | null
  durationSeconds: number | null // For videos
  availabilityStatus: 'local' | 'remote' | 'unavailable'
  sourceDeviceId: string | null
  createdAt: string
}
```
**Indexes:** `by_tripId`, `by_capturedAt`, `by_contentHash`

---

### `Transfer`
Audit and progress record of a media transfer session.
```typescript
interface Transfer {
  id: string              // UUID v4
  tripId: string | null
  peerDeviceId: string    // Foreign key -> Device.id
  direction: 'inbound' | 'outbound'
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  totalItems: number
  completedItems: number
  totalBytes: number
  transferredBytes: number
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}
```
**Indexes:** `by_tripId`, `by_peerDeviceId`, `by_status`

---

### `Archive`
ZIP export package created from trip media.
```typescript
interface Archive {
  id: string              // UUID v4
  tripId: string          // Foreign key -> Trip.id
  fileName: string        // e.g. "sicily-2026.zip"
  selectedDates: string[] // List of dates included
  mediaItemIds: string[]  // Items bundled
  photoCount: number
  videoCount: number
  totalSourceBytes: number
  archiveSizeBytes: number | null
  localStorageReference: string | null
  status: 'creating' | 'completed' | 'failed' | 'deleted'
  createdAt: string
}
```
**Indexes:** `by_tripId`, `by_status`

---

## 3. Schema Migrations

Migrations are version-controlled in `lib/db/migrations.ts`.
- When `DB_VERSION` increments, `runMigrations(db, oldVersion, newVersion)` executes each migration function in order.
- Object stores and indexes are added additively to prevent data loss.

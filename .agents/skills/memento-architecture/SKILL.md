---
name: memento-architecture
description: >
  Architecture reference for the Memento app. Use when making decisions about
  folder structure, adding new routes, adding new services, choosing libraries,
  or understanding how the app layers fit together.
---

# Memento — Architecture Skill

## Layer Overview

```
┌─────────────────────────────────────────┐
│               React UI Layer            │
│  app/(app)/*/page.tsx + components/app/ │
├─────────────────────────────────────────┤
│          State Layer (Zustand)          │
│       lib/store/*.ts                    │
├─────────────────────────────────────────┤
│         Service Layer                   │
│  lib/services/{media,zip,share,        │
│   transfer,hash}.ts                     │
├─────────────────────────────────────────┤
│       Database / Storage Layer          │
│  lib/db/{index,schema,migrations}.ts   │
│  (IndexedDB on web, SQLite on device)   │
├─────────────────────────────────────────┤
│       Native Bridge (Capacitor)         │
│  @capacitor/* plugins                   │
└─────────────────────────────────────────┘
```

## Routing (Next.js App Router)

| URL | Screen |
|-----|--------|
| `/onboarding` | First-launch name setup |
| `/` | Redirects to `/home` |
| `/home` | Home dashboard |
| `/trips` | Trip list |
| `/trips/[id]` | Trip detail (gallery, timeline, export) |
| `/trips/[id]/export` | Export & Share wizard |
| `/nearby` | Device discovery + transfer |
| `/archives` | Created ZIP archives |
| `/settings` | App preferences |

All routes under `app/(app)/` share a layout that includes the bottom navigation bar and sidebar.

## Navigation

- **Mobile:** Fixed bottom nav bar (`components/app/BottomNav.tsx`)
- **Desktop (lg+):** Left sidebar
- Both use the same `navItems` array — single source of truth.

The current single-page prototype uses `useState('Home')` — this must be replaced with actual Next.js routes in Phase 2.

## State Management

Each Zustand store slice is in `lib/store/`:

- `trips.ts` — CRUD for trips, selected trip
- `transfers.ts` — transfer queue items and status
- `archives.ts` — created archive records
- `nearby.ts` — discovery state, connected peers, device list
- `ui.ts` — theme, toast queue, modal stack

Stores call service functions, never call the DB directly from components.

## Service Layer Contracts

### `lib/services/media.ts`
```typescript
interface MediaService {
  requestPermission(): Promise<PermissionResult>
  getLibraryItems(tripDateRange?: DateRange): Promise<MediaItem[]>
  getThumbnail(id: string): Promise<string>  // data URL or blob URL
  getOriginalFile(id: string): Promise<File>
}
```

### `lib/services/zip.ts`
```typescript
interface ZipService {
  createArchive(manifest: ExportManifest, onProgress: (pct: number) => void): Promise<ArchiveResult>
  cancelArchive(archiveId: string): void
  verifyArchive(localPath: string): Promise<boolean>
}
```

### `lib/services/share.ts`
```typescript
interface ShareService {
  shareFile(localPath: string, mimeType: string): Promise<void>
  saveToDevice(localPath: string, suggestedName: string): Promise<void>
}
```

### `lib/services/transfer.ts`
```typescript
interface TransferService {
  startDiscovery(): Promise<void>
  stopDiscovery(): void
  connect(device: DiscoveredDevice): Promise<void>
  disconnect(): void
  sendFiles(files: MediaItem[], targetDevice: Device): Promise<TransferId>
  cancelTransfer(id: TransferId): void
}
```

### `lib/services/hash.ts`
```typescript
function sha256(buffer: ArrayBuffer): Promise<string>
function hashFile(file: File): Promise<string>
```

## Database Abstraction

`lib/db/index.ts` exports a `getDb()` function that:
- Returns an `IDBDatabase` wrapper (`idb` library) on web/PWA.
- Returns a `SQLiteDBConnection` wrapper on native Capacitor builds.
- Is detected via `Capacitor.isNativePlatform()`.

All other code uses generic `db.get(store, key)`, `db.put(store, value)` etc. — never raw IDB or SQLite calls directly from components or stores.

## Adding a New Feature — Checklist

1. Define types in `lib/db/schema.ts`.
2. Add a migration in `lib/db/migrations.ts`.
3. Create or extend a service in `lib/services/`.
4. Add a Zustand slice in `lib/store/`.
5. Build UI components in `components/app/`.
6. Add route(s) in `app/(app)/`.
7. Write unit tests in `__tests__/` or co-located `.test.ts`.

## Capacitor Integration Notes

- Capacitor wraps the Next.js static export (`next build` + `output: 'export'`).
- Web assets are copied into `android/app/src/main/assets/public/` and `ios/App/App/public/`.
- Use `Capacitor.isNativePlatform()` to gate native-only features.
- Plugins are registered in `capacitor.config.ts`.
- Never import a Capacitor plugin at module level without wrapping in a platform check — it will crash in the browser.

## Platform Capabilities Matrix

| Feature | Web/PWA | Android | iOS |
|---------|---------|---------|-----|
| Trip CRUD | Yes | Yes | Yes |
| IndexedDB | Yes | Yes (fallback) | Yes (fallback) |
| SQLite | No | Yes | Yes |
| Camera roll access | Partial (File API) | Yes (plugin) | Yes (plugin) |
| ZIP creation | Yes (fflate) | Yes (fflate) | Yes (fflate) |
| Native share sheet | Partial (Web Share API) | Yes (plugin) | Yes (plugin) |
| Nearby transfer | No | Yes (LAN) | Yes (LAN) |
| Background transfer | No | Limited | Very limited |
| mDNS discovery | No | Yes (plugin) | Yes (plugin) |

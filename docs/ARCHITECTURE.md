# Memento — Architecture Overview

## 1. System Vision & Core Principles

Memento is an offline-first, local-memory collection and exchange application designed for private groups of friends and families traveling together.

### Non-Negotiable Tenets
1. **Zero Cloud Requirement:** No remote server, no AWS S3, no Supabase, no Firebase for core trip media sharing.
2. **Local-First Persistence:** All metadata (trips, media indices, transfer logs) lives on the local device.
3. **Lossless Quality:** Media files are preserved in original binary form (EXIF tags, timestamps, untouched resolution) rather than re-compressed or transcoded.
4. **Direct P2P Exchange:** Device-to-device transfers occur exclusively over local Wi-Fi / LAN or personal hotspot connections.

---

## 2. Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Presentation UI                       │
│  Next.js 16 App Router · Tailwind CSS v4 · Design System    │
│  (Home, Trips, Trip Details, Nearby, Archives, Settings)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    State & Coordination                     │
│    Zustand Stores (trips, transfers, archives, ui)          │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│       Data Storage          │ │     Transfer & Services     │
│  IndexedDB (web / idb)      │ │  LAN HTTP Server & Client   │
│  SQLite (native / Capacitor)│ │  fflate (Streaming ZIP)     │
│  File references & hashes   │ │  SHA-256 chunked hashing    │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## 3. Directory Structure

```
app/
  (app)/
    home/page.tsx          # Real-time clock, storage gauges, recent trips
    trips/page.tsx         # Searchable trip directory & status filters
    trips/[id]/page.tsx    # Single trip view, metadata edit, media gallery
    trips/[id]/export/page.tsx # Archive creation wizard (fflate)
    nearby/page.tsx        # Local network discovery & P2P transfers
    archives/page.tsx      # Stored ZIP packages & share triggers
    settings/page.tsx      # Theme toggle, privacy manifesto, storage stats
    layout.tsx             # Shared responsive shell (sidebar + bottom nav)
  onboarding/page.tsx      # First-launch local profile setup
  layout.tsx               # Root fonts (DM Sans + Instrument Serif) & styles
  globals.css              # Custom CSS properties and dark mode tokens
components/
  app/                     # TripCard, CreateTripModal, ConfirmDialog, Toast, etc.
  ui/                      # Primitive accessible components
lib/
  db/                      # IndexedDB schema, connection factory, migrations
  store/                   # Zustand stores with optimistic UI updates
  services/                # SHA-256 hashing, media utilities, ZIP compression
docs/                      # Comprehensive technical specifications
```

---

## 4. State Management & Lifecycle

- **Zustand** manages client reactive state.
- Database access is abstracted through helper methods that sync to storage before updating in-memory state.
- On launch, stores hydrate from persistent IndexedDB without blocking initial render.
- Real device storage quota is tracked via `navigator.storage.estimate()`.

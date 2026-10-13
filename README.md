# Memento

**Private, offline-first trip memory sharing for friends and families.**

[![Build Android](https://github.com/TitanXS75/Memento/actions/workflows/capacitor-build.yml/badge.svg)](https://github.com/TitanXS75/Memento/actions/workflows/capacitor-build.yml)
[![Release](https://img.shields.io/github/v/release/TitanXS75/Memento?label=latest)](https://github.com/TitanXS75/Memento/releases/latest)
[![License](https://img.shields.io/badge/license-private-lightgrey)]()

---

## What is Memento?

Memento is a mobile-first app that lets you collect, organize, and share trip photos and videos — **without uploading anything to the cloud**. All media stays on your device and transfers happen directly over your local Wi-Fi network.

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Nearby Transfer** | Peer-to-peer media transfer over local Wi-Fi/LAN. No cloud, no backend. |
| **Export & Share** | Select trip dates, create an original-quality ZIP, share via native share sheet. |
| **Trip Organization** | Create trips with date ranges, add photos/videos, browse by date. |
| **Media Library** | Browse all device photos and videos with date-based filtering. |
| **Offline-First** | Everything works without internet. Data persists locally in IndexedDB. |

> **Privacy principle:** No media ever leaves the device through a server we control.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/) · [TypeScript 5.7](https://www.typescriptlang.org/) (strict) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) · [shadcn/ui](https://ui.shadcn.com/) |
| State | [Zustand](https://zustand.docs.pmnd.rs/) |
| Database | IndexedDB via [idb](https://github.com/jakearchibald/idb) |
| ZIP | [fflate](https://github.com/101arrowz/fflate) (streaming, Web Worker) |
| Native | [Capacitor 8](https://capacitorjs.com/) (Android, iOS planned) |
| Package Manager | [pnpm](https://pnpm.io/) |

---

## Getting Started

### Prerequisites

- **Node.js** 22+
- **pnpm** 12+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Android Studio** (for native Android builds)
- **JDK 21** (required by Capacitor 8)

### Install & Run (Web)

```bash
# Clone the repository
git clone https://github.com/TitanXS75/Memento.git
cd Memento

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build & Run (Android)

```bash
# Build static export
CAPACITOR_BUILD=true pnpm build

# Sync with Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

Or download the latest APK from [Releases](https://github.com/TitanXS75/Memento/releases/latest).

For detailed Android build instructions, see [docs/BUILD_ANDROID.md](docs/BUILD_ANDROID.md).

---

## Project Structure

```
app/
  (app)/
    home/page.tsx          # Dashboard with storage stats and recent trips
    trips/page.tsx         # Trip list with search and filters
    trips/[id]/page.tsx    # Trip detail view with media gallery
    media/page.tsx         # Device media browser (photos & videos)
    nearby/page.tsx        # Nearby device discovery
    archives/page.tsx      # ZIP export archives
    settings/page.tsx      # Theme, privacy, storage management
    layout.tsx             # App shell with sidebar + bottom navigation
  onboarding/page.tsx      # First-launch profile setup
  layout.tsx               # Root layout (fonts, global styles)
  globals.css              # CSS design system and custom properties
components/
  app/                     # App-specific components (TripCard, BottomNav, etc.)
  ui/                      # shadcn/ui primitives
lib/
  db/                      # IndexedDB schema, migrations, connection factory
  store/                   # Zustand stores (trips, ui)
  services/                # Media access, ZIP creation, hashing, storage
docs/                      # Architecture, data model, privacy, build guides
```

---

## Design System

Memento uses a custom CSS design system with the following tokens:

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#f5f3f8` | Page background |
| Foreground | `#191827` | Primary text |
| Accent | `#4b3f72` | Buttons, links, active states |
| Coral | `#b86c7c` | Highlights, badges |

- **Typography:** DM Sans (body) + Instrument Serif (display headings)
- **Dark mode:** Toggled via `html[data-theme='dark']`
- **CSS classes:** `.hero-card`, `.surface-card`, `.primary-button`, `.secondary-button`, `.eyebrow`

---

## Development Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Done | Architecture validation, Capacitor setup, docs |
| 2 | ✅ Done | UI foundation, navigation, local DB, trip CRUD |
| 3 | 🔄 In Progress | Media library, thumbnails, date-based browsing |
| 4 | ⏳ Pending | ZIP export, archive management, native share sheet |
| 5 | ⏳ Pending | Nearby transfer (real LAN-based, native plugins) |
| 6 | ⏳ Pending | Trip sync protocol, device identity, metadata exchange |
| 7 | ⏳ Pending | Hardening, accessibility, release prep |

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm start` | Start production server |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, layered architecture, state management |
| [Data Model](docs/DATA_MODEL.md) | Entity schemas, indexes, migration strategy |
| [Offline Transport](docs/OFFLINE_TRANSPORT.md) | LAN transfer protocol, discovery, security |
| [Privacy](docs/PRIVACY.md) | Privacy manifesto, permissions policy, data lifecycle |
| [Build Android](docs/BUILD_ANDROID.md) | Android build prerequisites and steps |
| [Build iOS](docs/BUILD_IOS.md) | iOS build guide (planned) |
| [Testing](docs/TESTING.md) | Test strategy, Vitest setup, E2E plans |
| [Known Limitations](docs/KNOWN_LIMITATIONS.md) | Current constraints and workarounds |
| [Product Requirements](docs/PRD.md) | Full product requirements document |

---

## Contributing

1. Always use **pnpm** (never npm or yarn)
2. Keep commit messages simple and plain (no `feat:` / `fix:` prefixes)
3. Never use the `any` keyword in TypeScript
4. Inspect files before editing, preserve working code
5. Max ~200 lines per component
6. Every button must do something real or be labelled "Coming soon"

---

## Privacy

Memento is built on a **zero cloud dependency** model:

- No remote servers or cloud storage
- No telemetry, analytics, or trackers
- No user accounts, emails, or passwords
- All transfers happen exclusively over local Wi-Fi / LAN
- Media never leaves the device through any server we control

Read the full [Privacy Manifesto](docs/PRIVACY.md).

---

## License

This project is private and not currently licensed for public distribution.
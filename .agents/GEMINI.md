# Memento — Agent Rules & Project Context

## Project Identity

**App name:** Memento
**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5.7 (strict) · Tailwind CSS v4 · shadcn/ui (base-nova) · pnpm
**Package manager:** pnpm (v12). ALWAYS use `pnpm` — never `npm` or `yarn`.

## What This App Does

Memento is a **private, offline-first trip memory sharing app** for friends and families.

Two core capabilities:

1. **Nearby Transfer (Mode A)** — Peer-to-peer media transfer over local Wi-Fi/LAN, no cloud, no backend.
2. **Export & Share (Mode B)** — Select trip dates, create original-quality ZIP, share via native share sheet.

**Non-negotiable principle:** No media ever leaves the device through a server we control.

---

## Current State of the Codebase (Phase 1 baseline)

The project currently has:

- `app/page.tsx` — A single-file prototype (~142 lines) containing all screens (Home, Trips, Nearby, Settings) and components inline. State is **in-memory only** (no persistence). Trips disappear on refresh. Profile is saved to `sessionStorage` only.
- `app/layout.tsx` — DM Sans + Instrument Serif fonts via `next/font/google`.
- `app/globals.css` — Full CSS design system with custom properties and dark mode.
- `components/ui/button.tsx` — Single shadcn button component.
- `lib/utils.ts` — `cn()` utility only.
- `components.json` — shadcn config (base-nova style, Lucide icons).

**What is missing (needs to be built):**
- Persistent local database (no SQLite/IndexedDB yet)
- Media library access (no Capacitor, no native plugins)
- ZIP creation / archive feature
- Nearby transfer (no networking code)
- Trip detail screen, Archives screen
- Media gallery / thumbnails, date-based browsing
- Transfer manager, permission handling
- Capacitor integration + Android/iOS builds
- Tests of any kind
- All documentation files under `docs/`

---

## Architecture Decisions

### Framework
- Next.js App Router for the web shell.
- When adding Capacitor: set `output: 'export'` in `next.config.mjs`. Remove `@vercel/analytics`.

### State Management
- **Zustand** for global client state (trips, transfers, archives, nearby).
- **React Context** only for narrow UI concerns (theme, modal stack).
- No Redux. No server state libraries.

### Persistence
- **IndexedDB via `idb`** for web/PWA metadata (trips, media index, archives, transfers).
- **SQLite via `@capacitor-community/sqlite`** for native Android/iOS builds.
- Abstract behind a `db` service interface — the UI never calls storage directly.
- Keep large binary files OUT of the database. Store file references only.

### Target File Structure
```
app/
  (app)/
    home/page.tsx
    trips/page.tsx
    trips/[id]/page.tsx
    nearby/page.tsx
    archives/page.tsx
    settings/page.tsx
    layout.tsx
  onboarding/page.tsx
  layout.tsx
  globals.css
components/
  ui/          (shadcn primitives)
  app/         (app-specific: TripCard, MediaThumbnail, DateSelector, DeviceCard,
                TransferQueueItem, ArchiveCard, ProgressIndicator, ConfirmDialog,
                PermissionExplainer, EmptyState, ErrorMessage, Toast, BottomNav)
lib/
  db/index.ts, schema.ts, migrations.ts
  store/trips.ts, transfers.ts, archives.ts, nearby.ts, ui.ts
  services/media.ts, zip.ts, share.ts, transfer.ts, hash.ts
  utils.ts
docs/
  ARCHITECTURE.md, OFFLINE_TRANSPORT.md, DATA_MODEL.md,
  PRIVACY.md, TESTING.md, BUILD_ANDROID.md, BUILD_IOS.md, KNOWN_LIMITATIONS.md
```

### Nearby Transfer Architecture
- **Transport:** Local Wi-Fi LAN only (HTTP + WebSocket). Sender runs a temporary HTTP server. Receiver connects by IP.
- This is the only cross-platform approach — Android Nearby Connections and Apple Multipeer Connectivity cannot interoperate cross-platform.
- Both devices must be on the same Wi-Fi or one creates a hotspot.
- Discovery: mDNS/Bonjour via plugin, or manual IP entry as fallback.
- The UI must clearly communicate the Wi-Fi requirement.

### ZIP Creation
- Use **`fflate`** (pure JS, streaming API, no native dependency).
- Stream files in chunks — never load entire large videos into RAM.
- Run in a Web Worker to avoid blocking the UI thread.
- Track progress via fflate chunk callbacks.

### Design System
- Do NOT change existing CSS design tokens in `globals.css` without an explicit request.
- Colors: background `#f5f3f8`, text `#191827`, accent `#4b3f72`, coral `#b86c7c`.
- Dark mode: `html[data-theme='dark']` attribute.
- Typography: DM Sans (body) + Instrument Serif (display).
- CSS classes: `.hero-card`, `.surface-card`, `.primary-button`, `.secondary-button`, `.eyebrow` — prefer these over ad-hoc Tailwind utilities.

---

## Engineering Rules (MANDATORY)

1. **Inspect before changing** — read the file before editing it.
2. **Preserve working code** — refactor incrementally, do not rewrite working screens.
3. **TypeScript strict** — no `any`, no `@ts-ignore` without a comment explaining why.
4. **No fake data in production** — no hardcoded sample trips, fake device lists, or simulated transfer progress.
5. **No backend** — do not add Firebase, Supabase, or any cloud service for core media features.
6. **No silent failures** — every async operation must handle errors visibly.
7. **No decorative buttons** — every button does something real, or is clearly labelled "Coming soon".
8. **pnpm only** — `pnpm add`, `pnpm dev`, `pnpm build`.
9. **Component hygiene** — max ~200 lines per component. Extract reusable pieces.
10. **Migrations always** — any DB schema change requires a migration.
11. **File hashing** — use SHA-256 via `crypto.subtle` for integrity checks.
12. **Chunked I/O** — never load large files into memory wholesale.

---

## What NOT to Do

- Do NOT use `npm` or `yarn`.
- Do NOT store media binary data in the database.
- Do NOT automatically upload media anywhere.
- Do NOT claim a feature works without testing it.
- Do NOT merge all screens back into a single `page.tsx` monolith.
- Do NOT use `any` type.
- Do NOT invent custom cryptographic algorithms.
- Do NOT show fake connected devices or fake transfer success in production.

---

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | In Progress | Architecture validation, Capacitor setup, docs |
| 2 | Pending | UI foundation, navigation refactor, local DB, trip CRUD persistence |
| 3 | Pending | Media library, thumbnails, date-based browsing |
| 4 | Pending | ZIP export, archive management, native share sheet |
| 5 | Pending | Nearby transfer (real LAN-based, native plugins) |
| 6 | Pending | Trip sync protocol, device identity, metadata exchange |
| 7 | Pending | Hardening, accessibility, release prep |

---

## Key Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| `next` 16.4 | App framework | Installed |
| `react` 19 | UI | Installed |
| `typescript` 5.7 | Types | Installed |
| `tailwindcss` v4 | Styling | Installed |
| `shadcn` | Component system | Installed |
| `lucide-react` | Icons | Installed |
| `zustand` | State management | To add |
| `idb` | IndexedDB wrapper | To add |
| `fflate` | ZIP creation | To add |
| `@capacitor/core` | Native bridge | To add |
| `@capacitor/android` | Android platform | To add |
| `@capacitor/ios` | iOS platform | To add |
| `@capacitor/camera` | Photo/video access | To add |
| `@capacitor/filesystem` | File storage | To add |
| `@capacitor/share` | Share sheet | To add |
| `@capacitor-community/sqlite` | Native SQLite | To add |

---

## Commit Convention & Code Rules

1. **Simple commit messages**: Keep commit messages simple and plain (e.g. `add media library and date filter`, `update app icon and permissions`). Do not use `feat:` or `fix:` prefixes.
2. **Never use `any`**: The `any` keyword is strictly prohibited across the entire TypeScript codebase. Always use explicit types, union types, or `unknown` with type guards.

---

## Testing

- **Unit tests:** Vitest
- **E2E:** Playwright
- **Device tests:** Physical Android device (mandatory for nearby transfer)
- Test files: `*.test.ts` / `*.test.tsx` co-located or in `__tests__/`

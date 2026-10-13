# Changelog

All notable changes to Memento are documented in this file.

---

## v0.4.0 — Trip Sync Protocol & Release Hardening

### Added

- Trip Sync Protocol service (`lib/services/sync.ts`) with portable manifest exchange
- Intelligent diff calculation comparing memories between devices by SHA-256 hash
- Non-destructive metadata merge expanding trip date ranges and description updates
- Export & import of standalone `.memento-sync` JSON bundles
- Interactive `TripSyncModal` in Trip Details for peer discovery, live diff inspection, and one-tap sync
- Accessibility enhancements across all modals with keyboard navigation and Escape-to-close listeners
- Production build validation with static SSG export and zero TypeScript warnings
- Comprehensive unit test suite covering trip sync protocol and manifest diffs

---

## v0.3.0 — Nearby Transfer (Mode A)

### Added

- Local Wi-Fi / Hotspot peer discovery and device identity persistence
- Direct peer-to-peer chunked media transfer service with 2 MB chunks
- Full-file SHA-256 integrity verification before library insertion
- Duplicate detection by contentHash with skip / preserve handling
- Peer consent dialog (IncomingTransferModal) requiring explicit user confirmation
- Manual IP and port connection modal for direct LAN connectivity
- SendMediaModal supporting trip association and photo/video selection
- Active transfer queue with real-time progress bars, speed gauges, and retry/cancel actions
- Persistent transfer history stored in IndexedDB transfers table
- Unit test suite for transfer service, transfers store, and nearby discovery store

---

## v0.1.0 — Foundation

### Added

- App shell with responsive layout (sidebar on desktop, bottom nav on mobile)
- Onboarding flow with display name setup
- Home dashboard with storage statistics
- Trip management (create, edit, delete with confirmation)
- Trip list with search functionality
- Trip detail view with metadata display
- Media tab for browsing device photos and videos
- Settings page with theme toggle and privacy info
- Setup wizard with data reset confirmation
- Dark/light theme support with system preference detection
- IndexedDB persistence via idb for trips and app state
- Zustand state management for trips and UI state
- Custom CSS design system with CSS custom properties
- Android build via Capacitor 8
- GitHub Actions CI/CD with APK artifact and GitHub Releases
- Custom app icon (Memento logo)
- Android media permissions (READ_MEDIA_IMAGES, READ_MEDIA_VIDEO)
- SHA-256 file hashing service
- ZIP creation service with fflate
- Storage quota monitoring
- Unit test setup with Vitest
- Media library with separate Images and Videos category blocks
- Date-based media filtering (All, Today, Past 7 days, Past 30 days, Custom date range)
- Smart photo capture date parsing from EXIF and filename patterns
- Offscreen canvas thumbnail generation for fast responsive browsing
- Interactive Trip Media Gallery with date groupings and photo/video filtering
- Add Media to Trip modal with automatic date range matching
- Fullscreen Media Lightbox modal with keyboard navigation (Esc, Left/Right arrows)
- Trip cover photo selection and banner display on trip cards
- Multi-step ZIP export wizard with date and media type filtering
- Streaming ZIP creation via fflate with live progress and cancel support
- Cross-platform archive sharing service with Web Share API and download fallback
- Persistent archives management screen with status tracking and deletion
- Unit tests for archives store and lifecycle management

### Technical

- Next.js 16 with App Router
- React 19 with TypeScript 5.7 (strict mode)
- Tailwind CSS v4 with shadcn/ui (base-nova)
- Capacitor 8 with Android platform
- JDK 21 for Android builds
- pnpm 12 package manager

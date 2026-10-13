# Changelog

All notable changes to Memento are documented in this file.

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

### Technical

- Next.js 16 with App Router
- React 19 with TypeScript 5.7 (strict mode)
- Tailwind CSS v4 with shadcn/ui (base-nova)
- Capacitor 8 with Android platform
- JDK 21 for Android builds
- pnpm 12 package manager

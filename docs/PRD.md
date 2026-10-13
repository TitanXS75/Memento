# Memento — Product Requirements Document (PRD)

## 1. Product Overview

**Product Name:** Memento
**Version:** 0.1.0 (Phase 2)
**Platform:** Android (primary), iOS (planned), Web (PWA)

### Vision

Memento is a private, offline-first trip memory sharing app for friends and families. It enables groups traveling together to collect, organize, and share trip photos and videos without ever uploading media to the cloud.

### Problem Statement

When groups travel together, everyone takes photos and videos on their own devices. Sharing these memories typically requires:

- Uploading to cloud services (Google Photos, iCloud, Dropbox)
- Sending compressed versions through messaging apps (WhatsApp, Telegram)
- Physically handing devices around

Each approach sacrifices either **privacy**, **quality**, or **convenience**. Memento solves all three.

### Core Principle

> No media ever leaves the device through a server we control.

---

## 2. Target Users

| Persona | Description |
|---------|-------------|
| **Trip Organizer** | Plans group trips, wants to collect everyone's photos in one place |
| **Casual Photographer** | Takes photos/videos during trips, wants an easy way to share originals |
| **Privacy-Conscious User** | Refuses to upload personal media to cloud services |
| **Family Group** | Families traveling together who want to share memories privately |

### User Demographics

- Age: 18–55
- Tech comfort: Moderate (can install APK, connect to Wi-Fi)
- Group size: 2–15 people per trip
- Device: Android smartphones (primary), iOS (secondary)

---

## 3. Core Features

### 3.1 Trip Management

| Requirement | Priority | Status |
|-------------|----------|--------|
| Create a trip with name, dates, and description | P0 | ✅ Done |
| Edit trip details | P0 | ✅ Done |
| Delete trip with confirmation dialog | P0 | ✅ Done |
| View trip list with search | P0 | ✅ Done |
| Trip detail view with metadata | P0 | ✅ Done |
| Trip cover image from media | P1 | ✅ Done |
| Trip status filters (active, archived) | P1 | ⏳ Pending |

### 3.2 Media Library

| Requirement | Priority | Status |
|-------------|----------|--------|
| Browse device photos and videos | P0 | ✅ Done |
| Filter media by date range | P0 | ✅ Done |
| Display photos in grid layout | P0 | ✅ Done |
| Display videos separately from photos | P0 | ✅ Done |
| Request and handle storage/media permissions | P0 | ✅ Done |
| Read EXIF data for date ordering | P1 | ✅ Done |
| Generate thumbnails for performance | P1 | ✅ Done |
| Associate media with trips | P1 | ✅ Done |

### 3.3 Nearby Transfer (Mode A)

| Requirement | Priority | Status |
|-------------|----------|--------|
| Discover devices on same Wi-Fi network | P0 | ⏳ Pending |
| Send media files peer-to-peer over LAN | P0 | ⏳ Pending |
| Receive media files from peers | P0 | ⏳ Pending |
| Transfer progress indicator | P0 | ⏳ Pending |
| SHA-256 integrity verification | P0 | ⏳ Pending |
| Consent dialog before receiving | P0 | ⏳ Pending |
| Chunked file transfer (no full RAM load) | P0 | ⏳ Pending |
| Retry failed transfers | P1 | ⏳ Pending |
| Transfer history log | P2 | ⏳ Pending |

### 3.4 Export & Share (Mode B)

| Requirement | Priority | Status |
|-------------|----------|--------|
| Select trip date range for export | P0 | ⏳ Pending |
| Create ZIP with original-quality media | P0 | ⏳ Pending |
| Stream ZIP creation (fflate, Web Worker) | P0 | ⏳ Pending |
| Share ZIP via native share sheet | P0 | ⏳ Pending |
| Export progress indicator | P0 | ⏳ Pending |
| Archive list with status | P1 | ⏳ Pending |
| Delete archived ZIPs | P1 | ⏳ Pending |

### 3.5 Settings & Profile

| Requirement | Priority | Status |
|-------------|----------|--------|
| Display name setup (onboarding) | P0 | ✅ Done |
| Edit display name | P0 | ✅ Done |
| Dark/light theme toggle | P0 | ✅ Done |
| Storage usage display | P0 | ✅ Done |
| Privacy information display | P0 | ✅ Done |
| Setup wizard for fresh start | P0 | ✅ Done |
| Clear all data with confirmation | P1 | ✅ Done |

---

## 4. Non-Functional Requirements

### 4.1 Privacy & Security

- **Zero cloud dependency**: No remote servers, databases, or cloud storage for core features
- **No telemetry**: No analytics SDKs, trackers, or user behavior monitoring
- **No accounts**: No email, phone, or password collection
- **Local encryption**: All LAN transfers use HTTPS scheme via Capacitor
- **Explicit consent**: All transfers require active user confirmation
- **Data deletion**: Deleting a trip removes metadata only; original device media is untouched

### 4.2 Performance

- **App launch**: < 2 seconds to interactive on mid-range Android devices
- **Media grid**: Smooth scrolling with lazy-loaded thumbnails
- **ZIP creation**: Streamed in chunks, never loading full files into memory
- **Transfer speed**: Limited only by local Wi-Fi bandwidth
- **Database**: IndexedDB operations should complete in < 100ms for typical queries

### 4.3 Offline Support

- **100% offline capable**: All features work without internet connectivity
- **Local persistence**: IndexedDB for web/PWA, SQLite for native (planned)
- **No data loss**: App state survives restarts, crashes, and updates

### 4.4 Compatibility

| Platform | Minimum Version | Status |
|----------|----------------|--------|
| Android | 8.0 (API 26) | ✅ Supported |
| iOS | 14.0 | ⏳ Planned |
| Web/PWA | Chrome 90+, Safari 15+ | ✅ Supported |

### 4.5 Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader compatible
- Sufficient color contrast ratios
- Touch targets ≥ 44×44px

---

## 5. Technical Architecture

### 5.1 Application Layer

```
Presentation → State Management → Data Layer → Device APIs
   (React)       (Zustand)         (IndexedDB)   (Capacitor)
```

### 5.2 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Zustand | Lightweight, no boilerplate, React 19 compatible |
| Local database | IndexedDB via idb | Browser-native, no native dependency for web |
| ZIP creation | fflate | Pure JS, streaming API, Web Worker support |
| Native bridge | Capacitor 8 | Cross-platform, web-first, plugin ecosystem |
| File hashing | SHA-256 via crypto.subtle | Browser-native, no dependencies |
| Transfer protocol | HTTP + WebSocket over LAN | Cross-platform interoperability |

### 5.3 Data Flow

1. **Media import**: Device filesystem → File reference stored in IndexedDB
2. **Trip creation**: User input → Zustand store → IndexedDB persistence
3. **Nearby transfer**: Sender HTTP server → LAN → Receiver HTTP client
4. **ZIP export**: IndexedDB query → fflate stream → File system → Share sheet

---

## 6. User Flows

### 6.1 First Launch

1. App opens → Splash screen with Memento logo
2. Redirect to onboarding → Enter display name
3. Grant storage/media permissions
4. Redirect to home dashboard

### 6.2 Create a Trip

1. Navigate to Trips tab
2. Tap "New Trip" button
3. Enter trip name, start date, end date, optional description
4. Trip appears in list, persisted to IndexedDB

### 6.3 Browse Media

1. Navigate to Media tab
2. Choose "Images" or "Videos"
3. Browse device media in date-sorted grid
4. Filter by date range (planned)

### 6.4 Nearby Transfer (Planned)

1. Both devices connect to same Wi-Fi
2. Sender selects trip/media to share
3. Sender starts temporary HTTP server
4. Receiver discovers sender (mDNS or manual IP)
5. Receiver confirms consent
6. Files transfer directly over LAN with progress
7. SHA-256 verification on completion

### 6.5 Export & Share (Planned)

1. Open a trip → Tap "Export"
2. Select date range
3. App creates ZIP in background (Web Worker)
4. Progress bar shows creation status
5. On completion, native share sheet opens

---

## 7. Permissions

| Permission | Platform | Purpose | Required |
|------------|----------|---------|----------|
| READ_MEDIA_IMAGES | Android 13+ | Access device photos | Yes |
| READ_MEDIA_VIDEO | Android 13+ | Access device videos | Yes |
| READ_EXTERNAL_STORAGE | Android < 13 | Access device media (legacy) | Yes |
| Local Network | iOS | Discover and transfer over LAN | For Mode A |
| Camera | Both | Scan QR codes for peer connection | Optional |

---

## 8. Release Plan

### v0.1.0 — Foundation (Current)

- ✅ App shell with navigation (Home, Trips, Media, Settings)
- ✅ Trip CRUD with IndexedDB persistence
- ✅ Onboarding flow with profile setup
- ✅ Dark/light theme
- ✅ Storage statistics
- ✅ Android APK build via GitHub Actions
- 🔄 Device media browsing

### v0.2.0 — Media & Export

- Complete media library with EXIF-based date sorting
- Thumbnail generation
- ZIP export with streaming creation
- Archive management
- Native share sheet integration

### v0.3.0 — Nearby Transfer

- mDNS device discovery
- LAN HTTP file transfer
- Transfer queue with progress
- Consent dialogs
- SHA-256 integrity verification

### v0.4.0 — Polish & Release

- Trip sync protocol
- Accessibility audit
- Performance optimization
- iOS build support
- App store preparation

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| App launch to interactive | < 2 seconds |
| Trip creation flow | < 30 seconds |
| Media grid scroll | 60fps on mid-range devices |
| Transfer speed (LAN) | > 10 MB/s |
| ZIP creation (1GB) | < 60 seconds |
| Crash rate | < 0.1% of sessions |

---

## 10. Out of Scope

The following are explicitly **not** part of Memento:

- Cloud storage or sync
- User accounts or authentication
- Social features (likes, comments, feeds)
- Photo editing or filters
- Video editing or trimming
- Location tracking or maps
- Push notifications
- Monetization or in-app purchases
- Web scraping or content aggregation

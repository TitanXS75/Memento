---
name: memento-nearby
description: >
  Nearby device discovery and file transfer patterns for Memento.
  Use when implementing or modifying the Nearby screen, device discovery,
  LAN transfer, transfer queue, progress, retry, or integrity checking.
---

# Memento — Nearby Transfer Skill

## Validated Transport Architecture

### Why not Android Nearby Connections or Apple Multipeer Connectivity?

These are platform-specific peer-to-peer APIs. **They cannot communicate cross-platform.**
- Android Nearby Connections works Android-to-Android only.
- Apple Multipeer Connectivity works iOS-to-iOS only.
- Neither provides a documented cross-platform protocol.

### Chosen Transport: Local Wi-Fi LAN (HTTP)

**Architecture:**
1. Sender starts a temporary HTTP server on a local port (e.g., `0.0.0.0:7734`).
2. Receiver discovers the sender's IP via mDNS/Bonjour, OR the user enters the IP manually.
3. Receiver connects and requests files over HTTP.
4. Files stream in chunks over the connection.
5. When the transfer is complete, the sender stops the HTTP server.

**Requirements:**
- Both devices must be on the same Wi-Fi network, OR one creates a mobile hotspot.
- No internet required after both are on the same LAN.
- No permanent host — the server only runs during an active transfer session.

**Cross-platform support:**
| Pair | Works? | Notes |
|------|--------|-------|
| Android ↔ Android | Yes | Both on same Wi-Fi |
| iOS ↔ iOS | Yes | Both on same Wi-Fi |
| Android ↔ iOS | Yes | Both on same Wi-Fi |
| Without Wi-Fi | No | Must explicitly inform user |

### Native Plugins Required

| Plugin | Purpose |
|--------|---------|
| `@capacitor-community/http` or custom plugin | Run embedded HTTP server on sender |
| `@capacitor-community/mdns` or custom plugin | mDNS/Bonjour advertisement + discovery |
| `@capacitor/network` | Detect if on Wi-Fi |
| `@capacitor/filesystem` | Write received files to app storage |

### Fallback: Manual IP Entry

If mDNS is unavailable or fails:
- Display the sender's local IP address prominently.
- Let the receiver type in the IP address manually.
- This is the reliable fallback — always implement it.

---

## Transfer Protocol

### Session handshake

```
Sender:  POST /session/start
         { deviceId, deviceName, platform, tripId? }

Receiver: GET /session/info
          Response: { deviceId, deviceName, platform, availableFiles: FileManifest[] }

Receiver: POST /transfer/request
          { fileIds: string[] }

Sender:   Response: { sessionToken: string, accepted: boolean }
```

### File transfer

```
Receiver: GET /files/{fileId}
          Headers: Range: bytes=0-1048575    (1 MB chunk)

Sender:   Response: 206 Partial Content
          Headers: Content-Range, Content-Length, X-File-Hash (SHA-256 of complete file)
```

- Use HTTP Range requests for resumable chunked transfer.
- Verify SHA-256 of complete received file before marking as complete.
- Store incomplete files in `app_storage/transfers/incomplete/`.
- Move to `app_storage/media/{tripId}/` only after verification.

### Transfer states

```
pending → connecting → in_progress → verifying → completed
                                   ↘ failed
                                   ↘ cancelled
```

---

## Zustand Store: Nearby (`lib/store/nearby.ts`)

```typescript
interface NearbyState {
  discoveryStatus: 'idle' | 'discovering' | 'error'
  localDevice: Device | null
  discoveredDevices: DiscoveredDevice[]
  connectedDevice: Device | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed'
  transfers: Transfer[]
  incomingRequest: IncomingTransferRequest | null
}
```

---

## UI Requirements

### Discovery area
- Show spinner while discovering.
- Show each discovered device as a card with name, platform icon, signal strength if available.
- Never show fake devices.
- Show timeout message if nothing found after 30 seconds.
- Manual IP entry always available as fallback.

### Incoming transfer request
- Show modal/sheet with: sender name, number of files, total size, file type breakdown.
- Require explicit "Accept" tap — never auto-accept.
- Show "Decline" option.

### Transfer progress item
- Show filename, thumbnail (if photo), file size, progress bar, speed, ETA.
- Show Retry button on failure.
- Show Cancel button while in progress.

### Connection states — label each clearly
- Disconnected
- Discovering
- Connecting to [device name]
- Connected to [device name]
- Transferring N files
- Transfer complete
- Transfer failed: [reason]

---

## File Integrity

```typescript
// lib/services/hash.ts
async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
```

- Compute SHA-256 of the complete source file before sending.
- Include hash in HTTP response header: `X-File-Hash: sha256:{hash}`.
- After receiving all chunks, hash the assembled file.
- Compare. If mismatch: mark transfer as failed, delete incomplete file, offer retry.

---

## Duplicate Detection

Before adding a received file to the media library:
1. Check if any existing `MediaItem` has the same `contentHash`.
2. If duplicate found: show dialog — "This file already exists. Skip / Keep both / Review".
3. Default: Skip.
4. Never silently overwrite an existing file.

---

## Sending Flow

1. User selects files (photos/videos, or all from a date, or a trip).
2. Show count and total size before confirming.
3. Tap "Send to [device]".
4. Files added to transfer queue.
5. Upload proceeds chunk by chunk.
6. Receiver confirms receipt and integrity.
7. Transfer record updated in DB.

---

## Background Limitations

- **Android:** Background execution is heavily restricted. The app must stay in the foreground during transfers. Use a foreground service notification if available via plugin.
- **iOS:** Background execution for HTTP server is essentially unavailable. The app must remain active. Clearly communicate this to the user.
- **Do NOT promise uninterrupted background transfers.** Show a warning when the user attempts to switch away.

---

## Error Messages (user-facing)

| Error | Message |
|-------|---------|
| No Wi-Fi | "Both devices need to be on the same Wi-Fi network or hotspot." |
| Discovery timeout | "No devices found nearby. Make sure the other device has Memento open." |
| Connection refused | "Could not connect to [device]. Check that both devices are on the same network." |
| File hash mismatch | "File transfer was corrupted. Tap Retry to try again." |
| Disk full | "Not enough storage to receive this file. Free up space and retry." |
| Transfer cancelled | "Transfer cancelled." |
| File not accessible | "The original file could not be read. It may have been moved or deleted." |

---

## Testing Checklist

- [ ] Discovery finds device on same Wi-Fi (Android-to-Android)
- [ ] Manual IP entry works as fallback
- [ ] Incoming request shows consent dialog
- [ ] Declining request stops transfer cleanly
- [ ] Single file transfer succeeds and integrity verified
- [ ] Multi-file transfer succeeds
- [ ] Large video (500 MB+) transfers without out-of-memory error
- [ ] Interrupted transfer can be retried
- [ ] Duplicate file detected and user prompted
- [ ] App restart during transfer marks transfer as failed
- [ ] Airplane mode test: fails gracefully with clear error
- [ ] Discovery timeout shown after 30 seconds with no devices

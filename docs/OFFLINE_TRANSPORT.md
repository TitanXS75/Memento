# Memento — Offline Transport Specification

## 1. The Cross-Platform Challenge

Native platform P2P protocols do not interoperate:
- **Android Nearby Connections** is proprietary to Google Play Services and cannot communicate directly with iOS devices.
- **Apple Multipeer Connectivity** is restricted strictly to iOS and macOS devices.

Because trip groups contain mixed Android and iPhone users, Memento relies on **Local Wi-Fi / LAN Networking** using standard TCP/IP protocols (HTTP and WebSockets).

---

## 2. Network Topology

```
                  ┌───────────────────────┐
                  │   Shared Wi-Fi LAN    │
                  │  or Portable Hotspot  │
                  └───────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
      ┌───────▼───────┐               ┌───────▼───────┐
      │ Sender Device │               │ Receiver Dev  │
      │ (HTTP Server) │ ◄──────────── │ (HTTP Client) │
      └───────────────┘  HTTP Pulls   └───────────────┘
```

1. **Prerequisite:** Both devices connect to the same Wi-Fi access point or one device enables a personal portable hotspot and the other joins it.
2. **Discovery:**
   - Primary: mDNS / Bonjour advertising (`_memento._tcp.local.`).
   - Fallback: Direct IP address input or QR code scanning containing the sender's local endpoint (`http://192.168.x.x:8765`).
3. **Session Handshake:**
   - Receiver requests device metadata: `GET /api/v1/device-info`.
   - Receiver submits a transfer request with media manifests.
   - Sender presents an explicit user confirmation prompt before sending or serving files.

---

## 3. Transfer Protocol

### Chunked Streaming & Verification
- Media files are transferred via HTTP chunked requests (`GET /api/v1/media/:id/chunk/:index`).
- Standard chunk size: **2 MB** to balance memory pressure on mobile devices with throughput.
- Every chunk is validated against an expected incremental checksum.
- Upon file completion, the full file is verified against its pre-computed **SHA-256 content hash**.

### Resumability
- Each chunk index is acknowledged upon storage.
- If a connection drops, transfer resumes from the last confirmed chunk index without re-transmitting previous megabytes.

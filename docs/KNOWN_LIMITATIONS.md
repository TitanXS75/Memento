# Memento — Known Technical Limitations & Mitigations

## 1. Local Network Transport Constraints

### Public Wi-Fi Client Isolation
- **Limitation:** Many hotel, airport, and café Wi-Fi networks enable "Client Isolation," a router setting preventing connected devices from discovering or sending packets to each other over LAN.
- **Mitigation:** When Memento detects no peer connectivity on public Wi-Fi, the UI advises users to **turn on a Personal Hotspot** on one phone and connect the other devices directly to that hotspot.

### Cross-Platform Protocol Fragmentation
- **Limitation:** Apple Multipeer Connectivity cannot speak to Android devices. Google Nearby Connections cannot speak to iOS devices.
- **Mitigation:** Memento implements standard HTTP/WebSocket transport over TCP/IP, ensuring 100% interoperability across Android, iOS, and Web.

---

## 2. Operating System & Hardware Boundaries

### iOS Background Suspension
- **Limitation:** iOS aggressively suspends web sockets and network activity when an app is moved to the background or the screen locks.
- **Mitigation:** The transfer UI clearly indicates: *"Keep Memento open while transferring."* For native iOS builds, an idle timer lock (`KeepAwake`) is engaged during active transfer queues.

### Web Browser Storage Quotas
- **Limitation:** In pure web/PWA mode, browser IndexedDB storage is subject to eviction under disk pressure (typically capped at a fraction of available device disk).
- **Mitigation:** Native builds utilize direct file system access (`@capacitor/filesystem` / SQLite), removing browser quota constraints and preventing unexpected eviction.

### Memory Pressure During ZIP Creation
- **Limitation:** Bundling multi-gigabyte 4K trip videos into a single ZIP file can cause memory overflows if buffered in RAM.
- **Mitigation:** Memento uses `fflate` with chunked streaming and offloads compression to a dedicated Web Worker, keeping RAM usage below 50 MB regardless of archive size.

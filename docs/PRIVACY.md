# Memento — Privacy Manifesto & Security Model

## 1. Core Commitment

Memento is built from the ground up on the premise of **zero cloud dependency**:
- **No Remote Servers:** We operate no central servers, databases, or cloud storage buckets.
- **No Telemetry or Trackers:** No analytics SDKs (e.g. Google Analytics, Mixpanel, Sentry) are bundled.
- **No User Accounts:** No email addresses, phone numbers, or passwords are ever requested.

---

## 2. Local-Only Media Boundaries

- **Direct Storage:** Media imported into Memento remains within the app's local sandbox or direct device storage.
- **Peer-to-Peer Isolation:** When media is transferred to another device, it traverses solely over the immediate local area network (LAN) directly from device A to device B. Packets never exit the local Wi-Fi router or hotspot boundary.
- **Explicit Consent:** Automatic background transfer to unknown devices is prohibited. Transfers require active user discovery and confirmation.

---

## 3. Permissions Policy

Memento only requests permissions strictly required for user-initiated operations:

| Permission | Justification | Fallback if Denied |
|---|---|---|
| **Photos / Media Library** | Required to import photos taken on the trip. | User can manually pick individual files via document picker. |
| **Local Network (iOS)** | Required to discover peers and transfer files over Wi-Fi. | Mode B (ZIP Export via native share sheet) remains available. |
| **Camera (Optional)** | Used exclusively to scan peer connection QR codes. | User enters peer IP address manually. |

---

## 4. Data Deletion Lifecycle

- **Deleting a Trip:** Deleting a trip from Memento purges its metadata from IndexedDB/SQLite and unlinks associated media references. **Original photos in the device camera roll are untouched.**
- **Deleting an Archive:** Deleting an exported ZIP archive purges the cached zip file on disk. It does not delete original media files.

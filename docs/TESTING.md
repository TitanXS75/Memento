# Memento — Testing & Verification Strategy

## 1. Testing Philosophy

Because Memento handles irreplaceable family memories across diverse physical devices without cloud recovery, testing must rigorously verify:
1. **Data Integrity:** Files transferred or extracted from archives must match original binary hashes.
2. **Offline Robustness:** App functions without network connectivity and gracefully handles mid-transfer disconnects.
3. **Storage Safety:** App never corrupts or deletes unselected camera roll files.

---

## 2. Test Tiers

### Unit Tests (Vitest)
- **Hash calculation:** Verify `sha256Hex` matches known vectors across varying buffer sizes.
- **Data formatting:** Verify `formatBytes` and date range formatters handle boundary conditions.
- **State stores:** Test CRUD actions in Zustand `useTripsStore` with mocked IDB.
- **Migration runner:** Verify schema updates cleanly apply incremental indexes.

### Integration Tests
- **Database operations:** Verify IndexedDB round-trips for trips, media items, and transfers.
- **ZIP creation:** Verify `fflate` streaming zip generator creates valid ZIP structures readable by standard unzip utilities.

### Physical Device Matrix (E2E)
| Scenario | Devices | Protocol | Verification |
|---|---|---|---|
| Same Wi-Fi Transfer | Android 14 ⇄ iPhone 15 | LAN HTTP | Byte checksum & metadata match |
| Hotspot Transfer | Android Hotspot ⇄ iPhone Client | Direct LAN | Successful transfer under no internet |
| Mid-transfer Drop | Phone goes out of range | HTTP Resume | Retry recovers remaining chunks without restarting |
| ZIP Export & Share | iPadOS / Pixel | Native Share Sheet | Opens WhatsApp/Files with valid zip |

# Memento — iOS Build Guide

## 1. Prerequisites

- **Host Machine:** macOS Sequoia or Sonoma
- **Xcode:** 16+ with iOS 18 SDK
- **CocoaPods:** 1.14+ (`gem install cocoapods` or `brew install cocoapods`)
- **Node.js:** v20+ with `pnpm` v12
- **Physical Test Device:** iPhone or iPad on iOS 16+

---

## 2. Configuration & Export

1. Build static assets:
   ```bash
   pnpm run build
   ```
2. Sync to the iOS native directory:
   ```bash
   npx cap sync ios
   ```

---

## 3. Required iOS Permissions (`Info.plist`)

Add the following keys to `ios/App/App/Info.plist`:

```xml
<!-- Photo Library Access -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Memento needs access to your photos to import memories from your trips.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Memento needs permission to save shared trip memories to your photo library.</string>

<!-- Local Network Discovery & Transfer -->
<key>NSLocalNetworkUsageDescription</key>
<string>Memento uses your local network to discover and exchange trip photos with nearby devices without internet.</string>
<key>NSBonjourServices</key>
<array>
  <string>_memento._tcp</string>
</array>
```

---

## 4. Running & Testing

Open the project in Xcode:
```bash
npx cap open ios
```
Select your connected iPhone under the Run Destination menu and click **Build and Run** (⌘R).

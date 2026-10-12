# Memento — Android Build Guide

## 1. Prerequisites

- **Node.js:** v20+ with `pnpm` v12
- **Android Studio:** Ladybug or newer
- **JDK:** 17 or 21 (bundled with Android Studio)
- **Android SDK:** Platform 34 or 35 + Build-Tools 34.0.0+
- **Physical Device:** Android 10+ with Developer Mode & USB Debugging enabled

---

## 2. Architecture & Static Export

Capacitor embeds web assets from the `out` directory. When building for Android:
1. Ensure `next.config.mjs` sets `output: 'export'`.
2. Generate the static bundle:
   ```bash
   pnpm run build
   ```
3. Sync assets into the native Android container:
   ```bash
   npx cap sync android
   ```

---

## 3. Required Android Permissions

In `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Media Access (Android 13+) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />

<!-- Media Access (Android 12 and below fallback) -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

<!-- Local Network / Transfer -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
```

---

## 4. Running & Debugging

Open the project in Android Studio:
```bash
npx cap open android
```
Or run directly via command line to a connected device:
```bash
npx cap run android
```

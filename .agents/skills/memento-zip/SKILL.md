---
name: memento-zip
description: >
  ZIP archive creation patterns for Memento. Use when implementing or modifying
  the Export & Share feature, date-based media selection, archive progress,
  filename sanitization, folder structure, or archive lifecycle management.
---

# Memento — ZIP Export Skill

## Library

Use **`fflate`** (`pnpm add fflate`).

- Pure JavaScript — works in browser, Web Worker, and Node.
- Streaming API — does not require loading all files into memory.
- No native build dependency.
- Produces standard ZIP files openable by WinZip, macOS Archive Utility, unzip, etc.

Do NOT use `jszip` (does not stream large files well).
Do NOT use native ZIP tools unless fflate proves insufficient and a plugin is required.

## User Flow

```
Trip Detail → Export & Share
  → Step 1: Select Dates (calendar with media counts)
  → Step 2: Select Media (all / photos / videos / custom)
  → Step 3: Review + Configure (filename preview, size estimate)
  → Step 4: Creating ZIP (progress bar, cancel button)
  → Step 5: Archive Ready (share, save, inspect, delete)
```

## Folder Structure Inside ZIP

```
{TripName}_{Year}/
  {YYYY-MM-DD}/
    {original_filename}.jpg
    {original_filename}.mp4
  {YYYY-MM-DD}/
    ...
```

Example:
```
Goa_Trip_2026/
  2026-10-10/
    IMG_0012.jpg
    VID_0003.mp4
  2026-10-11/
    IMG_0015.jpg
```

## Archive Filename Rules

```typescript
function buildArchiveFilename(tripName: string, dates: string[]): string {
  const safeName = tripName
    .replace(/[^\w\s-]/g, '')   // remove special chars
    .replace(/\s+/g, '_')
    .slice(0, 50)

  const sorted = [...dates].sort()
  const suffix = sorted.length === 1
    ? sorted[0]
    : `${sorted[0]}_to_${sorted[sorted.length - 1]}`

  return `${safeName}_${suffix}.zip`
}
```

Sanitization rules:
- Strip: `/ \ : * ? " < > |` and control characters.
- Replace spaces with underscores.
- Truncate trip name to 50 characters.
- Never allow `..` in any path component.
- Resolve filename collisions inside the ZIP by appending `_1`, `_2` etc.

## ExportManifest Type

```typescript
interface ExportManifest {
  archiveId: string
  tripName: string
  selectedDates: string[]           // ISO date strings YYYY-MM-DD
  items: Array<{
    mediaItemId: string
    localPath: string               // absolute path to source file
    zipEntryPath: string            // path inside the ZIP
    sizeBytes: number
  }>
}
```

## Streaming ZIP Creation

```typescript
// lib/services/zip.ts
import { Zip, ZipPassThrough } from 'fflate'
import { writeBinaryFile } from '@capacitor/filesystem'

async function createArchive(
  manifest: ExportManifest,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<string> {
  const chunks: Uint8Array[] = []
  let bytesWritten = 0
  const totalBytes = manifest.items.reduce((s, i) => s + i.sizeBytes, 0)

  const zip = new Zip((err, chunk, final) => {
    if (err) throw err
    chunks.push(chunk)
    // On native: stream chunk to filesystem directly
  })

  for (const item of manifest.items) {
    if (signal.aborted) { zip.terminate(); throw new Error('Cancelled') }

    const file = new ZipPassThrough(item.zipEntryPath)
    zip.add(file)

    // Read file in 1 MB chunks — never load the whole file
    const CHUNK_SIZE = 1024 * 1024
    const fileData = await readFileInChunks(item.localPath, CHUNK_SIZE)

    for (const chunk of fileData) {
      file.push(chunk, false)
      bytesWritten += chunk.length
      onProgress(Math.round((bytesWritten / totalBytes) * 100))
    }

    file.push(new Uint8Array(0), true)  // signal end of file
  }

  zip.end()
  // Write accumulated chunks to final output path
  return outputPath
}
```

**Important:** Run this in a Web Worker (`lib/workers/zip.worker.ts`) so the UI thread is never blocked.

## Progress Reporting

- Report progress from 0–100 (integer percentage).
- Update at most every 250 ms to avoid excessive re-renders (throttle in the worker).
- Expose a `cancel()` function backed by `AbortController`.

## Large Archive Warnings

Before creating the archive:
- Estimate total size = sum of `sizeBytes` for all selected items.
- If estimated size > 500 MB: show a warning with suggestions (photos only, smaller date range, multiple archives).
- If estimated size > 2 GB: strongly warn; many share targets (WhatsApp, email) will not accept it.

## Archive Lifecycle

| Status | Meaning |
|--------|---------|
| `creating` | ZIP generation in progress |
| `completed` | File exists at `localStorageReference` |
| `failed` | Creation failed; temp files cleaned up |
| `deleted` | User deleted the archive; original media untouched |

Rules:
- On failure or cancellation: delete the partial output file immediately.
- On deletion: set `status: 'deleted'`, delete physical file — NEVER delete MediaItem records.
- On app restart: any archive with status `creating` was interrupted — mark as `failed` and clean up temp files.
- Check that `localStorageReference` still exists before showing "Share again" — handle missing file gracefully.

## Sharing the Archive

Use Capacitor Share plugin (`@capacitor/share`) on native.
Use Web Share API (`navigator.share`) on web, with a fallback download link.

```typescript
// lib/services/share.ts
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'

async function shareArchive(localPath: string, filename: string) {
  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title: filename,
      url: Capacitor.convertFileSrc(localPath),
    })
  } else {
    // Web fallback: trigger browser download
    const a = document.createElement('a')
    a.href = localPath
    a.download = filename
    a.click()
  }
}
```

The share action passes a valid local file URI. Do NOT claim the archive was sent successfully just because the share sheet opened — that is the OS's responsibility.

## Testing Checklist

- [ ] ZIP opens in WinZip, macOS Archive Utility, and `unzip` CLI
- [ ] Folder structure is correct (trip name / date / filename)
- [ ] All selected files are included
- [ ] Unselected files are excluded
- [ ] Duplicate filenames inside the same folder are resolved with `_1`, `_2` suffixes
- [ ] SHA-256 of extracted files matches source files
- [ ] Cancellation deletes the partial output
- [ ] Progress reaches 100% before completion event
- [ ] 1 GB+ video does not cause out-of-memory crash
- [ ] Archive persists after app restart and can be shared again

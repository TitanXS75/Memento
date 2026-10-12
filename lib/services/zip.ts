import { Zip, ZipPassThrough } from 'fflate'

export interface ZipExportItem {
  mediaItemId: string
  fileName: string
  date: string // YYYY-MM-DD
  data: Uint8Array
}

export interface ExportManifest {
  archiveId: string
  tripName: string
  selectedDates: string[]
  items: ZipExportItem[]
}

/**
 * Sanitize a string for safe usage in file paths and zip entries.
 * Strips: / \ : * ? " < > | and control characters.
 */
export function sanitizePathSegment(segment: string): string {
  return segment
    .replace(/[/\\:*?"<>|\x00-\x1F]/g, '')
    .replace(/\.\.+/g, '') // no path traversal
    .trim()
}

/**
 * Format standard Memento archive filename according to spec:
 * {TripName}_{Dates}.zip
 */
export function buildArchiveFilename(tripName: string, dates: string[]): string {
  const safeName = tripName
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50) || 'Trip'

  const sorted = [...dates].sort()
  const suffix = sorted.length === 0
    ? 'All'
    : sorted.length === 1
    ? sorted[0]
    : `${sorted[0]}_to_${sorted[sorted.length - 1]}`

  return `${safeName}_${suffix}.zip`
}

/**
 * Build relative entry path for an item inside the zip:
 * {TripName}_{Year}/{YYYY-MM-DD}/{fileName}
 * Automatically resolves name collisions by appending _1, _2, etc.
 */
export function buildZipEntryPaths(
  tripName: string,
  items: ZipExportItem[],
): Map<string, string> {
  const safeTrip = sanitizePathSegment(tripName.replace(/\s+/g, '_')) || 'Trip'
  const pathMap = new Map<string, string>() // mediaItemId -> zipEntryPath
  const usedPaths = new Set<string>()

  for (const item of items) {
    const safeDate = sanitizePathSegment(item.date) || 'undated'
    const cleanFileName = sanitizePathSegment(item.fileName) || 'file'

    let candidatePath = `${safeTrip}/${safeDate}/${cleanFileName}`
    let counter = 1

    if (usedPaths.has(candidatePath)) {
      const dotIndex = cleanFileName.lastIndexOf('.')
      const nameWithoutExt = dotIndex !== -1 ? cleanFileName.slice(0, dotIndex) : cleanFileName
      const ext = dotIndex !== -1 ? cleanFileName.slice(dotIndex) : ''

      while (usedPaths.has(candidatePath)) {
        candidatePath = `${safeTrip}/${safeDate}/${nameWithoutExt}_${counter}${ext}`
        counter++
      }
    }

    usedPaths.add(candidatePath)
    pathMap.set(item.mediaItemId, candidatePath)
  }

  return pathMap
}

/**
 * Create a streaming ZIP archive from export items using fflate.
 * Returns the final Uint8Array of the zip.
 */
export async function createZipArchive(
  manifest: ExportManifest,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error('Archive creation aborted'))
    }

    const chunks: Uint8Array[] = []
    const entryPaths = buildZipEntryPaths(manifest.tripName, manifest.items)
    const totalBytes = manifest.items.reduce((acc, item) => acc + item.data.byteLength, 0) || 1
    let bytesProcessed = 0

    const zip = new Zip((err, chunk, isFinal) => {
      if (err) {
        return reject(err)
      }
      chunks.push(chunk)
      if (isFinal) {
        const totalLen = chunks.reduce((acc, c) => acc + c.length, 0)
        const output = new Uint8Array(totalLen)
        let offset = 0
        for (const c of chunks) {
          output.set(c, offset)
          offset += c.length
        }
        onProgress?.(100)
        resolve(output)
      }
    })

    if (signal) {
      signal.addEventListener('abort', () => {
        zip.terminate()
        reject(new Error('Archive creation aborted'))
      })
    }

    try {
      for (const item of manifest.items) {
        if (signal?.aborted) {
          zip.terminate()
          return reject(new Error('Archive creation aborted'))
        }

        const entryPath = entryPaths.get(item.mediaItemId) || item.fileName
        const passThrough = new ZipPassThrough(entryPath)
        zip.add(passThrough)

        // Stream in chunks of 64 KB
        const CHUNK_SIZE = 64 * 1024
        const data = item.data

        for (let i = 0; i < data.byteLength; i += CHUNK_SIZE) {
          if (signal?.aborted) {
            zip.terminate()
            return reject(new Error('Archive creation aborted'))
          }
          const chunk = data.subarray(i, Math.min(i + CHUNK_SIZE, data.byteLength))
          passThrough.push(chunk, false)
          bytesProcessed += chunk.byteLength
          const pct = Math.min(99, Math.round((bytesProcessed / totalBytes) * 100))
          onProgress?.(pct)
        }

        passThrough.push(new Uint8Array(0), true) // mark file finished
      }

      zip.end()
    } catch (err) {
      zip.terminate()
      reject(err)
    }
  })
}

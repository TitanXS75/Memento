import { Unzip, UnzipInflate } from 'fflate'
import { addMediaToTrip } from '@/lib/services/media'

export interface ExtractedMediaFile {
  path: string
  fileName: string
  type: 'photo' | 'video'
  mimeType: string
  sizeBytes: number
  capturedAt: string // ISO string or YYYY-MM-DD
  data?: Uint8Array
}

export interface ZipInspectionResult {
  id: string
  fileName: string
  fileSizeBytes: number
  totalFiles: number
  photoCount: number
  videoCount: number
  otherCount: number
  totalMediaBytes: number
  containsMedia: boolean
  isMementoArchive: boolean
  suggestedTripName: string
  suggestedStartDate: string
  suggestedEndDate: string
  mediaEntries: ExtractedMediaFile[]
  rawBuffer?: Uint8Array
  archiveId?: string // if it matches an existing saved archive in Memento
}

const PHOTO_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif', 'gif', 'bmp'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'mkv', 'webm', 'avi', '3gp', 'm4v', 'wmv'])

export function getFileMediaInfo(fileName: string): { isMedia: boolean; type: 'photo' | 'video'; mimeType: string } | null {
  const parts = fileName.split('.')
  if (parts.length < 2) return null
  const ext = parts.pop()?.toLowerCase() || ''

  if (PHOTO_EXTENSIONS.has(ext)) {
    let mime = `image/${ext}`
    if (ext === 'jpg') mime = 'image/jpeg'
    else if (ext === 'heic' || ext === 'heif') mime = 'image/heic'
    return { isMedia: true, type: 'photo', mimeType: mime }
  }

  if (VIDEO_EXTENSIONS.has(ext)) {
    let mime = `video/${ext}`
    if (ext === 'mov') mime = 'video/quicktime'
    else if (ext === 'mkv') mime = 'video/x-matroska'
    return { isMedia: true, type: 'video', mimeType: mime }
  }

  return null
}

function parseDateFromPath(filePath: string): string | null {
  // Check for YYYY-MM-DD pattern
  const dateMatch = filePath.match(/(\d{4})[-_](\d{2})[-_](\d{2})/)
  if (dateMatch) {
    const [, y, m, d] = dateMatch
    const year = Number(y)
    if (year >= 1990 && year <= 2040) {
      return `${y}-${m}-${d}`
    }
  }

  // Check for compact YYYYMMDD
  const compactMatch = filePath.match(/(\d{4})(\d{2})(\d{2})/)
  if (compactMatch) {
    const [, y, m, d] = compactMatch
    const year = Number(y)
    const month = Number(m)
    const day = Number(d)
    if (year >= 1990 && year <= 2040 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${m}-${d}`
    }
  }

  return null
}

function cleanTripName(name: string): string {
  return name
    .replace(/\.zip$/i, '')
    .replace(/_\d{4}-\d{2}-\d{2}(_to_\d{4}-\d{2}-\d{2})?/i, '') // strip memento date suffix
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Intelligently inspect a ZIP file buffer to identify if it contains photos or videos.
 */
export async function inspectZipBuffer(
  fileName: string,
  buffer: Uint8Array,
  archiveId?: string
): Promise<ZipInspectionResult> {
  return new Promise((resolve, reject) => {
    try {
      const unzipper = new Unzip()
      unzipper.register(UnzipInflate)

      const mediaEntries: ExtractedMediaFile[] = []
      let totalFiles = 0
      let otherCount = 0
      let totalMediaBytes = 0
      let isMementoArchive = false

      unzipper.onfile = (file) => {
        const path = file.name
        // Skip directory entries and OS metadata
        if (path.endsWith('/') || path.includes('__MACOSX') || path.endsWith('.DS_Store') || path.endsWith('Thumbs.db')) {
          return
        }

        totalFiles++
        const parts = path.split('/')
        const simpleName = parts[parts.length - 1]
        const mediaInfo = getFileMediaInfo(simpleName)

        if (mediaInfo) {
          const date = parseDateFromPath(path) || new Date().toISOString().slice(0, 10)
          const size = typeof file.originalSize === 'number' ? file.originalSize : 0
          totalMediaBytes += size

          if (parts.length >= 3 && parts[1].match(/^\d{4}-\d{2}-\d{2}$/)) {
            isMementoArchive = true
          }

          mediaEntries.push({
            path,
            fileName: simpleName,
            type: mediaInfo.type,
            mimeType: mediaInfo.mimeType,
            sizeBytes: size,
            capturedAt: date,
          })
        } else {
          otherCount++
        }
      }

      unzipper.push(buffer, true)

      const photoCount = mediaEntries.filter((m) => m.type === 'photo').length
      const videoCount = mediaEntries.filter((m) => m.type === 'video').length
      const containsMedia = mediaEntries.length > 0

      // Detect dates and trip name
      const allDates = Array.from(new Set(mediaEntries.map((m) => m.capturedAt).filter(Boolean))).sort()
      const today = new Date().toISOString().slice(0, 10)
      const suggestedStartDate = allDates[0] || today
      const suggestedEndDate = allDates[allDates.length - 1] || suggestedStartDate

      let suggestedTripName = cleanTripName(fileName)
      if (isMementoArchive && mediaEntries[0]) {
        const topFolder = mediaEntries[0].path.split('/')[0]
        if (topFolder) {
          suggestedTripName = cleanTripName(topFolder)
        }
      }

      resolve({
        id: `zip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        fileName,
        fileSizeBytes: buffer.byteLength,
        totalFiles,
        photoCount,
        videoCount,
        otherCount,
        totalMediaBytes,
        containsMedia,
        isMementoArchive,
        suggestedTripName: suggestedTripName || 'Imported Trip',
        suggestedStartDate,
        suggestedEndDate,
        mediaEntries,
        rawBuffer: buffer,
        archiveId,
      })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Inspect a browser File object (reads arrayBuffer and calls inspectZipBuffer).
 */
export async function inspectZipFile(file: File): Promise<ZipInspectionResult> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)
  return inspectZipBuffer(file.name, buffer)
}

function uint8ArrayToDataUrl(data: Uint8Array, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([data as unknown as BlobPart], { type: mimeType })
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Extract media files from a ZIP archive directly into a Memento trip.
 */
export async function extractMediaFromZip(options: {
  buffer: Uint8Array
  inspection: ZipInspectionResult
  tripId: string
  onProgress?: (progressPct: number, currentItemName: string) => void
}): Promise<{ count: number; tripId: string }> {
  const { buffer, inspection, tripId, onProgress } = options
  const targetPaths = new Set(inspection.mediaEntries.map((m) => m.path))

  return new Promise((resolve, reject) => {
    try {
      const unzipper = new Unzip()
      unzipper.register(UnzipInflate)

      const filesToProcess = inspection.mediaEntries.length
      if (filesToProcess === 0) {
        return resolve({ count: 0, tripId })
      }

      const pendingItems: Array<{
        filename: string
        mimeType: string
        mediaType: 'photo' | 'video'
        sizeBytes: number
        capturedAt: string
        storageUri: string
        thumbnailUri?: string
      }> = []

      let processedCount = 0

      unzipper.onfile = (file) => {
        if (!targetPaths.has(file.name)) {
          return
        }

        const entryMeta = inspection.mediaEntries.find((m) => m.path === file.name)
        if (!entryMeta) return

        const chunks: Uint8Array[] = []

        file.ondata = async (err, chunk, isFinal) => {
          if (err) {
            reject(err)
            return
          }

          chunks.push(chunk)

          if (isFinal) {
            const totalLen = chunks.reduce((acc, c) => acc + c.length, 0)
            const fileData = new Uint8Array(totalLen)
            let offset = 0
            for (const c of chunks) {
              fileData.set(c, offset)
              offset += c.length
            }

            try {
              const dataUrl = await uint8ArrayToDataUrl(fileData, entryMeta.mimeType)

              pendingItems.push({
                filename: entryMeta.fileName,
                mimeType: entryMeta.mimeType,
                mediaType: entryMeta.type,
                sizeBytes: fileData.byteLength,
                capturedAt: new Date(entryMeta.capturedAt + 'T12:00:00').toISOString(),
                storageUri: dataUrl,
                thumbnailUri: entryMeta.type === 'photo' ? dataUrl : undefined,
              })

              processedCount++
              const pct = Math.round((processedCount / filesToProcess) * 100)
              onProgress?.(pct, entryMeta.fileName)

              if (processedCount === filesToProcess) {
                // All media files extracted, now commit to DB
                await addMediaToTrip(tripId, pendingItems)
                resolve({ count: pendingItems.length, tripId })
              }
            } catch (convErr) {
              reject(convErr)
            }
          }
        }

        file.start()
      }

      unzipper.push(buffer, true)
    } catch (err) {
      reject(err)
    }
  })
}

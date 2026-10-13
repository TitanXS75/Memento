import { Capacitor, registerPlugin } from '@capacitor/core'

export interface DeviceMediaItem {
  id: string
  name: string
  size: number
  date: number
  mimeType: string
  type: 'photo' | 'video'
  uri: string
  thumbnail?: string
  duration?: number
  width?: number
  height?: number
  orientation?: number
}

export interface MediaPermissionStatus {
  granted: boolean
  status: 'granted' | 'denied' | 'prompt'
}

interface NativeDeviceMediaPlugin {
  checkMediaPermissions(): Promise<MediaPermissionStatus>
  requestMediaPermissions(): Promise<MediaPermissionStatus>
  getDeviceMedia(options?: { type?: 'all' | 'images' | 'videos'; limit?: number }): Promise<{
    images: DeviceMediaItem[]
    videos: DeviceMediaItem[]
  }>
  openNearbyServices(options?: { text?: string; title?: string }): Promise<{ success: boolean; method: string }>
}

const NativeDeviceMedia = registerPlugin<NativeDeviceMediaPlugin>('DeviceMedia')

// Web in-memory / session storage fallback for development and browsers
const WEB_STORAGE_KEY = 'memento_web_media_items'

function getWebStoredMedia(): { images: DeviceMediaItem[]; videos: DeviceMediaItem[] } {
  if (typeof window === 'undefined') return { images: [], videos: [] }
  try {
    const raw = sessionStorage.getItem(WEB_STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // ignore
  }
  return { images: [], videos: [] }
}

function saveWebStoredMedia(data: { images: DeviceMediaItem[]; videos: DeviceMediaItem[] }): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

/**
 * Check whether device media permission is granted.
 */
export async function checkMediaPermission(): Promise<MediaPermissionStatus> {
  if (Capacitor.isNativePlatform()) {
    try {
      return await NativeDeviceMedia.checkMediaPermissions()
    } catch (err) {
      console.warn('Native checkMediaPermissions error:', err)
      return { granted: false, status: 'prompt' }
    }
  }

  // On Web: granted if we have already accepted in this session or permission query
  if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
    try {
      // standard web permissions check (if supported)
      return { granted: true, status: 'granted' }
    } catch {
      // ignore
    }
  }
  return { granted: true, status: 'granted' }
}

/**
 * Request device photos and videos permission.
 * Triggers native OS dialog on Android/iOS.
 */
export async function requestMediaPermission(): Promise<MediaPermissionStatus> {
  if (Capacitor.isNativePlatform()) {
    try {
      return await NativeDeviceMedia.requestMediaPermissions()
    } catch (err) {
      console.error('Native requestMediaPermissions error:', err)
      return { granted: false, status: 'denied' }
    }
  }

  // Web environment always ready for file input selection
  return { granted: true, status: 'granted' }
}

/**
 * Retrieve device media items (images and/or videos).
 */
export async function getDeviceMedia(
  type: 'all' | 'images' | 'videos' = 'all',
  limit: number = 150
): Promise<{ images: DeviceMediaItem[]; videos: DeviceMediaItem[] }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeDeviceMedia.getDeviceMedia({ type, limit })
      return {
        images: res.images || [],
        videos: res.videos || [],
      }
    } catch (err) {
      console.error('Native getDeviceMedia failed:', err)
      return { images: [], videos: [] }
    }
  }

  // Web fallback: returns media stored in session or user-selected
  const webData = getWebStoredMedia()
  return {
    images: type === 'videos' ? [] : webData.images,
    videos: type === 'images' ? [] : webData.videos,
  }
}

/**
 * Extract photo/video capture date from filename patterns or fallback timestamp.
 * Handles patterns like IMG_20261012_143000, PXL_20261012_..., 2026-10-12_..., etc.
 */
export function parseMediaCaptureDate(filename: string, fallbackTimestamp?: number): number {
  try {
    // Match YYYYMMDD_HHMMSS or YYYY-MM-DD
    const match1 = filename.match(/(?:IMG_|VID_|PXL_|)?(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/)
    if (match1) {
      const year = parseInt(match1[1] ?? '0', 10)
      const month = parseInt(match1[2] ?? '1', 10) - 1
      const day = parseInt(match1[3] ?? '1', 10)
      const hour = parseInt(match1[4] ?? '0', 10)
      const minute = parseInt(match1[5] ?? '0', 10)
      const second = parseInt(match1[6] ?? '0', 10)
      const d = new Date(year, month, day, hour, minute, second)
      if (!isNaN(d.getTime())) return d.getTime()
    }

    const matchDateOnly = filename.match(/(\d{4})[-_](\d{2})[-_](\d{2})/)
    if (matchDateOnly) {
      const year = parseInt(matchDateOnly[1] ?? '0', 10)
      const month = parseInt(matchDateOnly[2] ?? '1', 10) - 1
      const day = parseInt(matchDateOnly[3] ?? '1', 10)
      const d = new Date(year, month, day, 12, 0, 0)
      if (!isNaN(d.getTime())) return d.getTime()
    }
  } catch {
    // ignore
  }

  return fallbackTimestamp && fallbackTimestamp > 0 ? fallbackTimestamp : Date.now()
}

/**
 * Generate a compressed image thumbnail asynchronously using offscreen canvas.
 */
export function generateImageThumbnail(dataUrl: string, maxDimension = 320): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(dataUrl)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(dataUrl)

        ctx.drawImage(img, 0, 0, width, height)
        const thumb = canvas.toDataURL('image/jpeg', 0.72)
        resolve(thumb)
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/**
 * Add picked files on Web platform to the local media store.
 */
export function addWebMediaItems(files: FileList | File[]): Promise<DeviceMediaItem[]> {
  return new Promise((resolve) => {
    const results: DeviceMediaItem[] = []
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return resolve([])

    let processed = 0

    fileArray.forEach((file) => {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')
      if (!isVideo && !isImage) {
        processed++
        if (processed === fileArray.length) resolve(results)
        return
      }

      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        const parsedDate = parseMediaCaptureDate(file.name, file.lastModified)

        let thumbnail: string | undefined = undefined
        if (isImage) {
          try {
            thumbnail = await generateImageThumbnail(dataUrl, 280)
          } catch {
            thumbnail = dataUrl
          }
        }

        const item: DeviceMediaItem = {
          id: `web_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          date: parsedDate,
          mimeType: file.type,
          type: isVideo ? 'video' : 'photo',
          uri: dataUrl,
          thumbnail,
        }
        results.push(item)
        processed++

        if (processed === fileArray.length) {
          const current = getWebStoredMedia()
          results.forEach((it) => {
            if (it.type === 'photo') current.images.unshift(it)
            else current.videos.unshift(it)
          })
          saveWebStoredMedia(current)
          resolve(results)
        }
      }
      reader.onerror = () => {
        processed++
        if (processed === fileArray.length) resolve(results)
      }
      reader.readAsDataURL(file)
    })
  })
}

/**
 * Trigger physical Android Nearby Share / Quick Share or Web Share.
 */
export async function openNearbyServices(options?: { text?: string; title?: string }): Promise<boolean> {
  const shareText = options?.text || 'Memento — Offline Trip Memory Sharing'
  const shareTitle = options?.title || 'Quick Share / Nearby'

  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeDeviceMedia.openNearbyServices({ text: shareText, title: shareTitle })
      return res.success
    } catch (err) {
      console.warn('Native openNearbyServices failed:', err)
    }
  }

  // Web fallback using Web Share API
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: window.location.origin,
      })
      return true
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('Web share failed:', err)
      }
      return false
    }
  }

  return false
}

// ─── Trip Media Management (IndexedDB) ──────────────────────────────────────────

export async function getTripMediaItems(tripId: string): Promise<import('@/lib/db/schema').MediaItem[]> {
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const all = await db.getAllFromIndex('mediaItems', 'by_tripId', tripId)
  return all.filter((it) => it.availabilityStatus !== 'unavailable')
}

export async function addMediaToTrip(
  tripId: string,
  items: Array<{
    filename: string
    mimeType: string
    mediaType: 'photo' | 'video'
    sizeBytes: number
    capturedAt: string
    storageUri: string
    thumbnailUri?: string | null
    durationSeconds?: number | null
  }>
): Promise<import('@/lib/db/schema').MediaItem[]> {
  const { getDb } = await import('@/lib/db')
  const { newId, now } = await import('@/lib/db/schema')
  const db = await getDb()

  const created: import('@/lib/db/schema').MediaItem[] = []
  const tx = db.transaction('mediaItems', 'readwrite')

  for (const item of items) {
    const record: import('@/lib/db/schema').MediaItem = {
      id: newId(),
      tripId,
      filename: item.filename,
      mimeType: item.mimeType,
      mediaType: item.mediaType,
      sizeBytes: item.sizeBytes,
      capturedAt: item.capturedAt,
      contentHash: null,
      localStorageReference: item.storageUri,
      thumbnailUri: item.thumbnailUri ?? null,
      durationSeconds: item.durationSeconds ?? null,
      sourceDeviceId: null,
      availabilityStatus: 'local',
      createdAt: now(),
    }
    await tx.objectStore('mediaItems').put(record)
    created.push(record)
  }

  await tx.done
  return created
}

export async function removeMediaItem(id: string): Promise<void> {
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  await db.delete('mediaItems', id)
}

export async function setTripCoverMedia(tripId: string, mediaId: string | null): Promise<void> {
  const { getDb } = await import('@/lib/db')
  const { now } = await import('@/lib/db/schema')
  const db = await getDb()
  const trip = await db.get('trips', tripId)
  if (!trip) return
  await db.put('trips', { ...trip, coverMediaId: mediaId, updatedAt: now() })
}



import { Capacitor } from '@capacitor/core'
import { getDb } from '@/lib/db'
import type { MediaItem } from '@/lib/db/schema'

export interface EnvironmentInfo {
  isWeb: boolean
  isNative: boolean
  platform: 'android' | 'ios' | 'web' | 'desktop'
  browserName: string
  osName: string
  canDetectPhysicalStorage: boolean
  notice: string
}

export interface StorageStats {
  availableBytes: number
  totalBytes: number
  usedBytes: number
  photosCount: number
  videosCount: number
  photosBytes: number
  videosBytes: number
  mediaBytes: number
  storagePermission: 'granted' | 'prompt' | 'denied'
  mediaPermission: 'granted' | 'prompt' | 'denied'
  environment: EnvironmentInfo
  lastCalculatedAt: string
}

const STORAGE_STATS_KEY = 'memento-storage-stats'

/**
 * Detect runtime execution environment (Web browser vs Native Capacitor).
 */
export function detectEnvironment(): EnvironmentInfo {
  if (typeof window === 'undefined') {
    return {
      isWeb: true,
      isNative: false,
      platform: 'web',
      browserName: 'Server',
      osName: 'Unknown',
      canDetectPhysicalStorage: false,
      notice: 'Server-side environment',
    }
  }

  const ua = window.navigator.userAgent || ''
  const isCapacitor = Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios'

  let osName = 'Unknown OS'
  if (/android/i.test(ua)) osName = 'Android'
  else if (/iPad|iPhone|iPod/.test(ua)) osName = 'iOS'
  else if (/Macintosh|Mac OS X/.test(ua)) osName = 'macOS'
  else if (/Windows/.test(ua)) osName = 'Windows'
  else if (/Linux/.test(ua)) osName = 'Linux'

  let browserName = 'Browser'
  if (/Edg\//.test(ua)) browserName = 'Edge'
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browserName = 'Chrome'
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browserName = 'Safari'
  else if (/Firefox\//.test(ua)) browserName = 'Firefox'

  const isNative = isCapacitor
  const isWeb = !isCapacitor

  let platform: EnvironmentInfo['platform'] = 'web'
  if (isNative) {
    platform = /android/i.test(ua) ? 'android' : 'ios'
  } else if (/Windows|Macintosh|Linux/.test(ua) && !/android|iPad|iPhone/i.test(ua)) {
    platform = 'desktop'
  }

  const notice = isWeb
    ? `Operating in browser on ${osName}. Media is indexed locally on your device.`
    : `Native ${osName} app. Media stored and accessed directly on device.`

  return {
    isWeb,
    isNative,
    platform,
    browserName,
    osName,
    canDetectPhysicalStorage: isNative,
    notice,
  }
}

/**
 * Request storage and media access permissions.
 * Requests persistent storage from the browser / device to prevent memory eviction.
 */
export async function requestStorageAndMediaPermissions(): Promise<{
  storagePermission: 'granted' | 'prompt' | 'denied'
  mediaPermission: 'granted' | 'prompt' | 'denied'
}> {
  let storagePermission: 'granted' | 'prompt' | 'denied' = 'granted'
  let mediaPermission: 'granted' | 'prompt' | 'denied' = 'granted'

  // 1. Request native/web photo & video permission (Triggers OS permission popup on Android/iOS)
  try {
    const { requestMediaPermission } = await import('@/lib/services/media')
    const mediaRes = await requestMediaPermission()
    mediaPermission = mediaRes.granted ? 'granted' : 'denied'
  } catch (err) {
    console.warn('Native requestMediaPermission failed:', err)
  }

  // 2. Request persistent storage from browser sandbox
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    try {
      const isPersisted = await navigator.storage.persist()
      storagePermission = isPersisted ? 'granted' : 'prompt'
    } catch {
      storagePermission = 'prompt'
    }
  }

  if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
    try {
      const res = await navigator.permissions.query({ name: 'persistent-storage' as PermissionName }).catch(() => null)
      if (res?.state) {
        storagePermission = res.state === 'granted' ? 'granted' : res.state === 'denied' ? 'denied' : 'prompt'
      }
    } catch {
      // ignore
    }
  }

  return { storagePermission, mediaPermission }
}

/**
 * Calculate the amount of storage occupied by images and videos on this particular device.
 * Does not calculate device-wide hardware storage or browser quota estimates.
 */
export async function calculateStorageStats(): Promise<StorageStats> {
  const env = detectEnvironment()

  let photosCount = 0
  let videosCount = 0
  let photosBytes = 0
  let videosBytes = 0

  // 1. Efficient device media summary directly scanned without thumbnail memory overhead
  try {
    const { getDeviceStorageSummary } = await import('@/lib/services/media')
    const summary = await getDeviceStorageSummary()
    photosCount = summary.photosCount
    photosBytes = summary.photosBytes
    videosCount = summary.videosCount
    videosBytes = summary.videosBytes
  } catch (err) {
    console.warn('Failed to retrieve device storage summary:', err)
  }

  // 2. Count local media stored in IndexedDB (avoid duplicates)
  try {
    const db = await getDb()
    const allMedia: MediaItem[] = await db.getAll('mediaItems')
    for (const item of allMedia) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id)
        if (item.mediaType === 'video') {
          videosCount++
          videosBytes += item.sizeBytes || 0
        } else {
          photosCount++
          photosBytes += item.sizeBytes || 0
        }
      }
    }
  } catch {
    // If DB is not ready or empty
  }

  const mediaBytes = photosBytes + videosBytes

  const saved = getStoredStorageStats()
  const storagePermission = saved?.storagePermission ?? 'granted'
  const mediaPermission = saved?.mediaPermission ?? 'granted'

  const stats: StorageStats = {
    availableBytes: 0,
    totalBytes: mediaBytes,
    usedBytes: mediaBytes,
    photosCount,
    videosCount,
    photosBytes,
    videosBytes,
    mediaBytes,
    storagePermission,
    mediaPermission,
    environment: env,
    lastCalculatedAt: new Date().toISOString(),
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(stats))
    } catch {
      // ignore
    }
  }

  return stats
}

/**
 * Read cached storage stats from localStorage if available.
 */
export function getStoredStorageStats(): StorageStats | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_STATS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StorageStats
  } catch {
    return null
  }
}

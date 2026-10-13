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
    ? `Can't detect physical phone storage — You are using ${browserName} on the web. Web browsers sandbox websites and allocate an origin quota (e.g. 2 GB) rather than revealing your actual hardware storage.`
    : `Native ${osName} app detected. Physical device storage accessible.`

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
 * Calculate the overall phone and media storage usage.
 */
export async function calculateStorageStats(): Promise<StorageStats> {
  const env = detectEnvironment()
  let totalBytes = 2 * 1024 * 1024 * 1024 // 2 GB default if browser sandbox
  let usedBytes = 0
  let availableBytes = totalBytes

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate()
      if (estimate.quota != null) {
        totalBytes = estimate.quota
      }
      if (estimate.usage != null) {
        usedBytes = estimate.usage
      }
      availableBytes = Math.max(0, totalBytes - usedBytes)
    } catch (err) {
      console.warn('[memento/storage] estimate failed', err)
    }
  }

  // Count photos, videos, and media bytes stored in IndexedDB
  let photosCount = 0
  let videosCount = 0
  let mediaBytes = 0

  try {
    const db = await getDb()
    const allMedia: MediaItem[] = await db.getAll('mediaItems')
    for (const item of allMedia) {
      if (item.mediaType === 'video') {
        videosCount++
      } else {
        photosCount++
      }
      mediaBytes += item.sizeBytes || 0
    }
  } catch {
    // If DB is not ready or empty
  }

  try {
    const { getDeviceMedia } = await import('@/lib/services/media')
    const devMedia = await getDeviceMedia('all', 500)
    photosCount += devMedia.images.length
    videosCount += devMedia.videos.length
    mediaBytes += devMedia.images.reduce((acc, it) => acc + it.size, 0)
    mediaBytes += devMedia.videos.reduce((acc, it) => acc + it.size, 0)
  } catch {
    // ignore
  }

  const saved = getStoredStorageStats()
  const storagePermission = saved?.storagePermission ?? 'granted'
  const mediaPermission = saved?.mediaPermission ?? 'granted'

  const stats: StorageStats = {
    availableBytes,
    totalBytes,
    usedBytes: Math.max(usedBytes, mediaBytes),
    photosCount,
    videosCount,
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

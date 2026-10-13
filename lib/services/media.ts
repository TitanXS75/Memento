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
      reader.onload = () => {
        const dataUrl = reader.result as string
        const item: DeviceMediaItem = {
          id: `web_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          date: file.lastModified || Date.now(),
          mimeType: file.type,
          type: isVideo ? 'video' : 'photo',
          uri: dataUrl,
          thumbnail: isImage ? dataUrl : undefined,
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

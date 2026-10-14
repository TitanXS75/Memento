import { Capacitor } from '@capacitor/core'
import { NativeDeviceMedia } from '@/lib/services/media'

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

/**
 * Cross-platform archive sharing and download service.
 */
export async function shareOrDownloadFile(options: {
  blob: Blob
  filename: string
  title?: string
}): Promise<{ shared: boolean; downloaded: boolean }> {
  const { blob, filename, title = filename } = options

  // 1. If Capacitor native platform on Android/iOS, use native Intent share
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = await blobToBase64(blob)
      const res = await NativeDeviceMedia.shareZipFile({ data: base64, filename, title })
      if (res && res.success) {
        return { shared: true, downloaded: false }
      }
    } catch (err) {
      console.warn('Native shareZipFile failed, trying web fallback:', err)
    }
  }

  // 2. Try Web Share API with File (Native OS share sheet on supported Android/iOS/Desktop)
  if (typeof navigator !== 'undefined' && 'canShare' in navigator && navigator.share) {
    try {
      const file = new File([blob], filename, { type: 'application/zip' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          files: [file],
        })
        return { shared: true, downloaded: false }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        // User cancelled the share dialog
        return { shared: false, downloaded: false }
      }
      console.warn('Share with file failed, falling back to download:', err)
    }
  }

  // 3. Fallback: Trigger browser direct download
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return { shared: false, downloaded: true }
  } catch (err) {
    console.error('File download failed:', err)
    throw err
  }
}

/**
 * Direct file save to Downloads folder or browser download.
 */
export async function saveZipToDevice(blob: Blob, filename: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = await blobToBase64(blob)
      const res = await NativeDeviceMedia.saveZipFile({ data: base64, filename })
      if (res && res.success) {
        return true
      }
    } catch (err) {
      console.warn('Native saveZipFile failed, trying browser download:', err)
    }
  }

  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return true
  } catch (err) {
    console.error('Save to device failed:', err)
    return false
  }
}

import { getDb } from '@/lib/db'
import { newId, now, type MediaItem, type Transfer } from '@/lib/db/schema'
import { sha256Hex } from '@/lib/services/hash'
import { generateImageThumbnail } from '@/lib/services/media'

export const CHUNK_SIZE = 1024 * 1024 * 2 // 2 MB per chunk
export const NEARBY_PORT = 7734

export interface LocalDeviceInfo {
  id: string
  displayName: string
  platform: 'android' | 'ios' | 'web' | 'desktop'
  ipAddress: string
  port: number
  isDiscoverable: boolean
}

export interface DiscoveredDevice {
  id: string
  displayName: string
  platform: 'android' | 'ios' | 'web' | 'desktop'
  ipAddress: string
  port: number
  lastSeenAt: string
  isAvailable: boolean
}

export interface TransferManifestItem {
  fileId: string
  filename: string
  mimeType: string
  mediaType: 'photo' | 'video'
  sizeBytes: number
  contentHash: string
  dataUrl?: string
  blob?: Blob
}

export interface IncomingTransferRequest {
  requestId: string
  senderDevice: DiscoveredDevice
  tripId?: string | null
  tripName?: string | null
  items: TransferManifestItem[]
  totalBytes: number
  createdAt: string
}

export interface ActiveTransferProgress {
  id: string
  fileId: string
  filename: string
  mediaType: 'photo' | 'video'
  direction: 'incoming' | 'outgoing'
  peerDeviceId: string
  peerDeviceName: string
  tripId?: string | null
  totalBytes: number
  transferredBytes: number
  currentChunk: number
  totalChunks: number
  speedBps: number
  status: 'pending' | 'connecting' | 'in_progress' | 'verifying' | 'completed' | 'failed' | 'cancelled'
  error?: string | null
  contentHash?: string | null
  startedAt: string
  completedAt?: string | null
}

const LOCAL_DEVICE_KEY = 'memento_device_identity'

/**
 * Get or create a persistent device identity.
 */
export function getOrCreateLocalDevice(): LocalDeviceInfo {
  if (typeof window === 'undefined') {
    return {
      id: 'server_dev',
      displayName: 'Server Device',
      platform: 'web',
      ipAddress: '127.0.0.1',
      port: NEARBY_PORT,
      isDiscoverable: false,
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_DEVICE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalDeviceInfo>
      if (parsed.id && parsed.displayName) {
        return {
          id: parsed.id,
          displayName: parsed.displayName,
          platform: parsed.platform ?? 'web',
          ipAddress: parsed.ipAddress ?? '192.168.1.100',
          port: parsed.port ?? NEARBY_PORT,
          isDiscoverable: parsed.isDiscoverable ?? true,
        }
      }
    }
  } catch {
    // ignore
  }

  // Derive initial display name from profile if available
  let name = 'My Memento Device'
  try {
    const prof = localStorage.getItem('memento-profile')
    if (prof) {
      const parsedProf = JSON.parse(prof) as { name?: string }
      if (parsedProf.name) {
        name = `${parsedProf.name}'s Device`
      }
    }
  } catch {
    // ignore
  }

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  let platform: LocalDeviceInfo['platform'] = 'web'
  if (/android/i.test(userAgent)) platform = 'android'
  else if (/iPad|iPhone|iPod/.test(userAgent)) platform = 'ios'
  else if (/Windows|Macintosh|Linux/.test(userAgent)) platform = 'desktop'

  const newDevice: LocalDeviceInfo = {
    id: `dev_${crypto.randomUUID().slice(0, 8)}`,
    displayName: name,
    platform,
    ipAddress: '192.168.1.100',
    port: NEARBY_PORT,
    isDiscoverable: true,
  }

  saveLocalDevice(newDevice)
  return newDevice
}

/**
 * Save updated local device identity.
 */
export function saveLocalDevice(device: LocalDeviceInfo): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LOCAL_DEVICE_KEY, JSON.stringify(device))
  } catch {
    // ignore
  }
}

/**
 * Slice an ArrayBuffer or Uint8Array into 2 MB chunks for stream transmission.
 */
export function sliceIntoChunks(data: Uint8Array, chunkSize: number = CHUNK_SIZE): Uint8Array[] {
  const chunks: Uint8Array[] = []
  let offset = 0
  while (offset < data.byteLength) {
    const end = Math.min(offset + chunkSize, data.byteLength)
    chunks.push(data.subarray(offset, end))
    offset = end
  }
  return chunks
}

/**
 * Assemble chunks into a single Uint8Array, compute SHA-256, and verify integrity.
 */
export async function assembleAndVerifyFile(
  chunks: Uint8Array[],
  expectedHash: string,
): Promise<{ verified: boolean; actualHash: string; data: Uint8Array }> {
  const totalLength = chunks.reduce((acc, c) => acc + c.byteLength, 0)
  const merged = new Uint8Array(totalLength)
  let pos = 0
  for (const chunk of chunks) {
    merged.set(chunk, pos)
    pos += chunk.byteLength
  }

  const actualHash = await sha256Hex(merged)
  const verified = actualHash.toLowerCase() === expectedHash.toLowerCase()
  return { verified, actualHash, data: merged }
}

/**
 * Check if a file with the given SHA-256 contentHash already exists in the local database.
 */
export async function checkForDuplicateMedia(contentHash: string): Promise<MediaItem | null> {
  try {
    const db = await getDb()
    const matches = await db.getAllFromIndex('mediaItems', 'by_contentHash', contentHash)
    const existing = matches.find((m) => m.availabilityStatus !== 'unavailable')
    return existing ?? null
  } catch {
    return null
  }
}

/**
 * Save a verified transferred media item into IndexedDB.
 */
export async function storeTransferredMediaItem(
  item: TransferManifestItem,
  fileData: Uint8Array,
  tripId?: string | null,
  sourceDeviceId?: string | null,
): Promise<MediaItem> {
  const blob = new Blob([fileData], { type: item.mimeType })
  const objectUrl = URL.createObjectURL(blob)

  let thumbnailUri: string | null = null
  if (item.mediaType === 'photo') {
    try {
      thumbnailUri = await generateImageThumbnail(objectUrl, 280)
    } catch {
      thumbnailUri = objectUrl
    }
  }

  const mediaRecord: MediaItem = {
    id: `m_${crypto.randomUUID()}`,
    tripId: tripId ?? 'unassigned',
    filename: item.filename,
    mimeType: item.mimeType,
    mediaType: item.mediaType,
    sizeBytes: item.sizeBytes,
    capturedAt: now(),
    contentHash: item.contentHash,
    localStorageReference: objectUrl,
    thumbnailUri,
    sourceDeviceId: sourceDeviceId ?? null,
    availabilityStatus: 'local',
    createdAt: now(),
  }

  const db = await getDb()
  await db.put('mediaItems', mediaRecord)
  return mediaRecord
}

/**
 * Record a transfer event into IndexedDB history.
 */
export async function recordTransferEvent(
  record: Omit<Transfer, 'id' | 'createdAt'>,
): Promise<Transfer> {
  const fullRecord: Transfer = {
    ...record,
    id: newId(),
    createdAt: now(),
  }
  try {
    const db = await getDb()
    await db.put('transfers', fullRecord)
  } catch (err) {
    console.error('Failed to record transfer in db:', err)
  }
  return fullRecord
}

/**
 * Convert a File object into a TransferManifestItem with SHA-256 hash.
 */
export async function prepareFileForTransfer(file: File): Promise<TransferManifestItem> {
  const arrayBuffer = await file.arrayBuffer()
  const contentHash = await sha256Hex(arrayBuffer)
  const isVideo = file.type.startsWith('video/')

  return {
    fileId: `file_${crypto.randomUUID().slice(0, 8)}`,
    filename: file.name,
    mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    mediaType: isVideo ? 'video' : 'photo',
    sizeBytes: file.size,
    contentHash,
    blob: file,
  }
}

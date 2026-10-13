import { getDb } from '@/lib/db'
import { now, type MediaItem, type Trip } from '@/lib/db/schema'
import {
  checkForDuplicateMedia,
  storeTransferredMediaItem,
  type LocalDeviceInfo,
  type TransferManifestItem,
} from '@/lib/services/transfer'

export interface TripSyncManifest {
  version: 1
  device: {
    id: string
    displayName: string
    platform: string
  }
  trip: Trip
  mediaItems: Array<{
    id: string
    filename: string
    mimeType: string
    mediaType: 'photo' | 'video'
    sizeBytes: number
    capturedAt: string
    contentHash: string
  }>
  exportedAt: string
}

export interface TripSyncDiff {
  tripId: string
  tripName: string
  metadataChanged: boolean
  remoteUpdatedAt: string
  localUpdatedAt: string
  commonCount: number
  toPullItems: TripSyncManifest['mediaItems']
  toPullBytes: number
  toPushItems: MediaItem[]
  toPushBytes: number
}

/**
 * Generate a portable sync manifest for a specific trip.
 */
export async function createTripSyncManifest(
  tripId: string,
  localDevice: LocalDeviceInfo,
): Promise<TripSyncManifest | null> {
  const db = await getDb()
  const trip = await db.get('trips', tripId)
  if (!trip) return null

  const items = await db.getAllFromIndex('mediaItems', 'by_tripId', tripId)
  const activeItems = items.filter((m) => m.availabilityStatus !== 'unavailable' && m.contentHash)

  return {
    version: 1,
    device: {
      id: localDevice.id,
      displayName: localDevice.displayName,
      platform: localDevice.platform,
    },
    trip,
    mediaItems: activeItems.map((m) => ({
      id: m.id,
      filename: m.filename,
      mimeType: m.mimeType,
      mediaType: m.mediaType,
      sizeBytes: m.sizeBytes,
      capturedAt: m.capturedAt,
      contentHash: m.contentHash!,
    })),
    exportedAt: now(),
  }
}

/**
 * Compare local trip state with a remote trip sync manifest.
 */
export function calculateTripSyncDiff(
  localTrip: Trip | null,
  localMedia: MediaItem[],
  remoteManifest: TripSyncManifest,
): TripSyncDiff {
  const localHashes = new Set(
    localMedia
      .filter((m) => m.availabilityStatus !== 'unavailable' && m.contentHash)
      .map((m) => m.contentHash!),
  )

  const remoteHashes = new Set(remoteManifest.mediaItems.map((m) => m.contentHash))

  // Items remote has that local doesn't have
  const toPullItems = remoteManifest.mediaItems.filter((m) => !localHashes.has(m.contentHash))
  const toPullBytes = toPullItems.reduce((acc, it) => acc + it.sizeBytes, 0)

  // Items local has that remote doesn't have
  const toPushItems = localMedia.filter(
    (m) => m.contentHash && !remoteHashes.has(m.contentHash) && m.availabilityStatus !== 'unavailable',
  )
  const toPushBytes = toPushItems.reduce((acc, it) => acc + it.sizeBytes, 0)

  const commonCount = remoteManifest.mediaItems.length - toPullItems.length

  const metadataChanged = localTrip
    ? new Date(remoteManifest.trip.updatedAt).getTime() > new Date(localTrip.updatedAt).getTime()
    : true

  return {
    tripId: remoteManifest.trip.id,
    tripName: remoteManifest.trip.name,
    metadataChanged,
    remoteUpdatedAt: remoteManifest.trip.updatedAt,
    localUpdatedAt: localTrip ? localTrip.updatedAt : '',
    commonCount,
    toPullItems,
    toPullBytes,
    toPushItems,
    toPushBytes,
  }
}

/**
 * Merge remote trip metadata into local database non-destructively.
 */
export async function mergeTripMetadata(remoteTrip: Trip): Promise<Trip> {
  const db = await getDb()
  const existing = await db.get('trips', remoteTrip.id)

  if (!existing) {
    const created: Trip = {
      ...remoteTrip,
      createdAt: now(),
      updatedAt: now(),
    }
    await db.put('trips', created)
    return created
  }

  // Merge date ranges to encompass both
  const start = existing.startDate < remoteTrip.startDate ? existing.startDate : remoteTrip.startDate
  const end = existing.endDate > remoteTrip.endDate ? existing.endDate : remoteTrip.endDate

  const merged: Trip = {
    ...existing,
    name: remoteTrip.name || existing.name,
    startDate: start,
    endDate: end,
    description: remoteTrip.description || existing.description,
    coverMediaId: existing.coverMediaId || remoteTrip.coverMediaId,
    updatedAt: now(),
  }

  await db.put('trips', merged)
  return merged
}

/**
 * Import a sync manifest file (JSON string or object) into local database.
 */
export async function applyTripSyncManifest(
  manifest: TripSyncManifest,
): Promise<{ trip: Trip; newItemsCount: number }> {
  const trip = await mergeTripMetadata(manifest.trip)
  let newItemsCount = 0

  for (const item of manifest.mediaItems) {
    const duplicate = await checkForDuplicateMedia(item.contentHash)
    if (!duplicate) {
      const manifestItem: TransferManifestItem = {
        fileId: item.id,
        filename: item.filename,
        mimeType: item.mimeType,
        mediaType: item.mediaType,
        sizeBytes: item.sizeBytes,
        contentHash: item.contentHash,
      }
      // Placeholder zero-data buffer until physical file transfer streams
      const placeholder = new Uint8Array(0)
      await storeTransferredMediaItem(manifestItem, placeholder, trip.id, manifest.device.id)
      newItemsCount++
    }
  }

  return { trip, newItemsCount }
}

/**
 * Export trip sync manifest as a downloadable .memento-sync file.
 */
export function exportSyncPackageAsJson(manifest: TripSyncManifest): string {
  return JSON.stringify(manifest, null, 2)
}

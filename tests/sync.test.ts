import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { closeDb, getDb } from '@/lib/db'
import type { MediaItem, Trip } from '@/lib/db/schema'
import {
  applyTripSyncManifest,
  calculateTripSyncDiff,
  createTripSyncManifest,
  mergeTripMetadata,
  type TripSyncManifest,
} from '@/lib/services/sync'

describe('Trip Sync Protocol Service', () => {
  beforeEach(() => {
    closeDb()
  })

  afterEach(() => {
    closeDb()
  })

  it('calculates sync diff between local and remote manifests accurately', () => {
    const localTrip: Trip = {
      id: 'trip-1',
      name: 'Goa Summer',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
      description: 'Trip to Goa beaches',
      coverMediaId: null,
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z',
      archivedAt: null,
    }

    const localMedia: MediaItem[] = [
      {
        id: 'm1',
        tripId: 'trip-1',
        filename: 'sunset.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        sizeBytes: 1000,
        capturedAt: '2026-06-02T18:00:00.000Z',
        contentHash: 'hash-common-1',
        localStorageReference: 'blob:mock',
        availabilityStatus: 'local',
        sourceDeviceId: null,
        createdAt: '2026-06-02T18:00:00.000Z',
      },
      {
        id: 'm2',
        tripId: 'trip-1',
        filename: 'my_boat.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        sizeBytes: 2500,
        capturedAt: '2026-06-03T11:00:00.000Z',
        contentHash: 'hash-local-only',
        localStorageReference: 'blob:mock',
        availabilityStatus: 'local',
        sourceDeviceId: null,
        createdAt: '2026-06-03T11:00:00.000Z',
      },
    ]

    const remoteManifest: TripSyncManifest = {
      version: 1,
      device: { id: 'peer-dev', displayName: 'Maya Phone', platform: 'ios' },
      trip: {
        ...localTrip,
        endDate: '2026-06-07',
        updatedAt: '2026-06-05T12:00:00.000Z',
      },
      mediaItems: [
        {
          id: 'remote-1',
          filename: 'sunset.jpg',
          mimeType: 'image/jpeg',
          mediaType: 'photo',
          sizeBytes: 1000,
          capturedAt: '2026-06-02T18:00:00.000Z',
          contentHash: 'hash-common-1',
        },
        {
          id: 'remote-2',
          filename: 'friend_group.jpg',
          mimeType: 'image/jpeg',
          mediaType: 'photo',
          sizeBytes: 3000,
          capturedAt: '2026-06-04T15:00:00.000Z',
          contentHash: 'hash-remote-only',
        },
      ],
      exportedAt: '2026-06-05T12:00:00.000Z',
    }

    const diff = calculateTripSyncDiff(localTrip, localMedia, remoteManifest)

    expect(diff.commonCount).toBe(1)
    expect(diff.toPullItems.length).toBe(1)
    expect(diff.toPullItems[0]?.filename).toBe('friend_group.jpg')
    expect(diff.toPullBytes).toBe(3000)

    expect(diff.toPushItems.length).toBe(1)
    expect(diff.toPushItems[0]?.filename).toBe('my_boat.jpg')
    expect(diff.toPushBytes).toBe(2500)
    expect(diff.metadataChanged).toBe(true)
  })

  it('merges trip metadata non-destructively expanding date ranges', async () => {
    const db = await getDb()
    const initialTrip: Trip = {
      id: 'trip-2',
      name: 'Tokyo Vacation',
      startDate: '2026-10-10',
      endDate: '2026-10-15',
      description: 'Initial notes',
      coverMediaId: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      archivedAt: null,
    }
    await db.put('trips', initialTrip)

    const remoteTrip: Trip = {
      id: 'trip-2',
      name: 'Tokyo Vacation',
      startDate: '2026-10-08', // Started 2 days earlier
      endDate: '2026-10-18',   // Ended 3 days later
      description: 'Expanded itinerary notes',
      coverMediaId: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-05T00:00:00.000Z',
      archivedAt: null,
    }

    const merged = await mergeTripMetadata(remoteTrip)

    expect(merged.startDate).toBe('2026-10-08')
    expect(merged.endDate).toBe('2026-10-18')
    expect(merged.description).toBe('Expanded itinerary notes')

    const persisted = await db.get('trips', 'trip-2')
    expect(persisted?.startDate).toBe('2026-10-08')
    expect(persisted?.endDate).toBe('2026-10-18')
  })

  it('generates and applies a full sync manifest', async () => {
    // Mock URL.createObjectURL
    if (typeof URL.createObjectURL !== 'function') {
      URL.createObjectURL = () => 'blob:mock-url'
    }

    const db = await getDb()
    const trip: Trip = {
      id: 'trip-3',
      name: 'Himalayan Trek',
      startDate: '2026-05-01',
      endDate: '2026-05-08',
      description: 'High altitude memories',
      coverMediaId: null,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      archivedAt: null,
    }
    await db.put('trips', trip)

    const media: MediaItem = {
      id: 'm-trek',
      tripId: 'trip-3',
      filename: 'peak_view.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'photo',
      sizeBytes: 4000,
      capturedAt: '2026-05-04T08:00:00.000Z',
      contentHash: 'hash-peak-123',
      localStorageReference: 'blob:mock',
      availabilityStatus: 'local',
      sourceDeviceId: null,
      createdAt: '2026-05-04T08:00:00.000Z',
    }
    await db.put('mediaItems', media)

    const manifest = await createTripSyncManifest('trip-3', {
      id: 'dev-1',
      displayName: 'Trekker Phone',
      platform: 'android',
      ipAddress: '192.168.1.5',
      port: 7734,
      isDiscoverable: true,
    })

    expect(manifest).not.toBeNull()
    expect(manifest?.mediaItems.length).toBe(1)
    expect(manifest?.mediaItems[0]?.contentHash).toBe('hash-peak-123')

    // Clear database to simulate distinct receiving device
    await db.delete('mediaItems', 'm-trek')
    await db.delete('trips', 'trip-3')

    const result = await applyTripSyncManifest(manifest!)
    expect(result.trip.name).toBe('Himalayan Trek')
    expect(result.newItemsCount).toBe(1)
  })
})

import type { DBSchema } from 'idb'

export const DB_NAME = 'memento'
export const DB_VERSION = 1

// ─── Domain types ────────────────────────────────────────────────────────────

export interface Trip {
  id: string
  name: string
  startDate: string        // YYYY-MM-DD
  endDate: string          // YYYY-MM-DD
  description: string
  coverMediaId: string | null
  createdAt: string        // ISO timestamp
  updatedAt: string        // ISO timestamp
  archivedAt: string | null
}

export interface Device {
  id: string
  displayName: string
  platform: 'android' | 'ios' | 'web'
  lastSeenAt: string
  trustStatus: 'trusted' | 'pending' | 'blocked'
}

export interface MediaItem {
  id: string
  tripId: string
  filename: string
  mimeType: string
  mediaType: 'photo' | 'video'
  sizeBytes: number
  capturedAt: string
  contentHash: string | null
  localStorageReference: string | null
  sourceDeviceId: string | null
  availabilityStatus: 'local' | 'remote_only' | 'unavailable'
  createdAt: string
}

export interface Transfer {
  id: string
  tripId: string | null
  peerDeviceId: string
  direction: 'incoming' | 'outgoing'
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  totalBytes: number
  transferredBytes: number
  createdAt: string
  completedAt: string | null
  failureReason: string | null
}

export interface Archive {
  id: string
  tripId: string
  filename: string
  selectedDates: string[]
  mediaItemIds: string[]
  photoCount: number
  videoCount: number
  totalSourceBytes: number
  archiveSizeBytes: number | null
  localStorageReference: string | null
  status: 'creating' | 'completed' | 'failed' | 'deleted'
  createdAt: string
}

// ─── idb schema ──────────────────────────────────────────────────────────────

export interface MementoDB extends DBSchema {
  trips: {
    key: string
    value: Trip
    indexes: {
      by_createdAt: string
      by_archivedAt: string
    }
  }
  devices: {
    key: string
    value: Device
    indexes: {
      by_lastSeenAt: string
    }
  }
  mediaItems: {
    key: string
    value: MediaItem
    indexes: {
      by_tripId: string
      by_capturedAt: string
      by_contentHash: string
    }
  }
  transfers: {
    key: string
    value: Transfer
    indexes: {
      by_tripId: string
      by_peerDeviceId: string
      by_status: string
    }
  }
  archives: {
    key: string
    value: Archive
    indexes: {
      by_tripId: string
      by_status: string
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function now(): string {
  return new Date().toISOString()
}

export function newId(): string {
  return crypto.randomUUID()
}

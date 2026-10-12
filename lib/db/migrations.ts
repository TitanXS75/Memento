import type { IDBPDatabase } from 'idb'
import type { MementoDB } from './schema'

type UpgradeFn = (db: IDBPDatabase<MementoDB>) => void

interface Migration {
  version: number
  up: UpgradeFn
}

const migrations: Migration[] = [
  {
    version: 1,
    up: (db) => {
      // trips
      const trips = db.createObjectStore('trips', { keyPath: 'id' })
      trips.createIndex('by_createdAt', 'createdAt')
      trips.createIndex('by_archivedAt', 'archivedAt')

      // devices
      const devices = db.createObjectStore('devices', { keyPath: 'id' })
      devices.createIndex('by_lastSeenAt', 'lastSeenAt')

      // mediaItems
      const media = db.createObjectStore('mediaItems', { keyPath: 'id' })
      media.createIndex('by_tripId', 'tripId')
      media.createIndex('by_capturedAt', 'capturedAt')
      media.createIndex('by_contentHash', 'contentHash')

      // transfers
      const transfers = db.createObjectStore('transfers', { keyPath: 'id' })
      transfers.createIndex('by_tripId', 'tripId')
      transfers.createIndex('by_peerDeviceId', 'peerDeviceId')
      transfers.createIndex('by_status', 'status')

      // archives
      const archives = db.createObjectStore('archives', { keyPath: 'id' })
      archives.createIndex('by_tripId', 'tripId')
      archives.createIndex('by_status', 'status')
    },
  },
  // Future migrations go here:
  // { version: 2, up: (db) => { ... } },
]

/**
 * Run all pending migrations from oldVersion up to current.
 * Called inside openDB's `upgrade` callback.
 */
export function runMigrations(
  db: IDBPDatabase<MementoDB>,
  oldVersion: number,
): void {
  for (const migration of migrations) {
    if (migration.version > oldVersion) {
      migration.up(db)
    }
  }
}

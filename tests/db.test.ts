import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { getDb, closeDb } from '@/lib/db'
import { newId, now } from '@/lib/db/schema'
import type { Trip } from '@/lib/db/schema'

describe('IndexedDB Integration', () => {
  beforeEach(() => {
    closeDb()
  })

  afterEach(() => {
    closeDb()
  })

  it('initializes database and creates all object stores and indexes', async () => {
    const db = await getDb()
    expect(db.objectStoreNames.contains('trips')).toBe(true)
    expect(db.objectStoreNames.contains('devices')).toBe(true)
    expect(db.objectStoreNames.contains('mediaItems')).toBe(true)
    expect(db.objectStoreNames.contains('transfers')).toBe(true)
    expect(db.objectStoreNames.contains('archives')).toBe(true)
  })

  it('can create, read, update, and delete trips', async () => {
    const db = await getDb()
    const trip: Trip = {
      id: newId(),
      name: 'Amalfi Coast Exploration',
      startDate: '2026-06-01',
      endDate: '2026-06-10',
      description: 'Family trip along Amalfi',
      coverMediaId: null,
      createdAt: now(),
      updatedAt: now(),
      archivedAt: null,
    }

    // Put
    await db.put('trips', trip)

    // Get
    const fetched = await db.get('trips', trip.id)
    expect(fetched).toBeDefined()
    expect(fetched?.name).toBe('Amalfi Coast Exploration')

    // Query index
    const byCreated = await db.getAllFromIndex('trips', 'by_createdAt')
    expect(byCreated.some((t) => t.id === trip.id)).toBe(true)

    // Update
    const updated: Trip = { ...trip, name: 'Amalfi Coast Roadtrip', updatedAt: now() }
    await db.put('trips', updated)
    const refetched = await db.get('trips', trip.id)
    expect(refetched?.name).toBe('Amalfi Coast Roadtrip')

    // Delete
    await db.delete('trips', trip.id)
    const afterDelete = await db.get('trips', trip.id)
    expect(afterDelete).toBeUndefined()
  })
})

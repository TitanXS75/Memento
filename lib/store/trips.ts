import { create } from 'zustand'
import { getDb } from '@/lib/db'
import { now, newId } from '@/lib/db/schema'
import type { Trip } from '@/lib/db/schema'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateTripInput {
  name: string
  startDate: string
  endDate: string
  description?: string
  coverMediaId?: string | null
}

interface TripsState {
  trips: Trip[]
  loading: boolean
  error: string | null

  // Actions
  loadTrips: () => Promise<void>
  createTrip: (input: CreateTripInput) => Promise<Trip>
  updateTrip: (id: string, patch: Partial<Omit<Trip, 'id' | 'createdAt'>>) => Promise<void>
  archiveTrip: (id: string) => Promise<void>
  restoreTrip: (id: string) => Promise<void>
  deleteTrip: (id: string) => Promise<void>
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTripsStore = create<TripsState>((set, get) => ({
  trips: [],
  loading: false,
  error: null,

  loadTrips: async () => {
    set({ loading: true, error: null })
    try {
      const db = await getDb()
      const all = await db.getAllFromIndex('trips', 'by_createdAt')
      // Newest first
      set({ trips: all.reverse(), loading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load trips'
      set({ error: message, loading: false })
    }
  },

  createTrip: async (input) => {
    const trip: Trip = {
      id: newId(),
      name: input.name.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      description: input.description?.trim() ?? '',
      coverMediaId: input.coverMediaId ?? null,
      createdAt: now(),
      updatedAt: now(),
      archivedAt: null,
    }

    try {
      const db = await getDb()
      await db.put('trips', trip)
      set((s) => ({ trips: [trip, ...s.trips] }))
      return trip
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create trip'
      set({ error: message })
      throw err
    }
  },

  updateTrip: async (id, patch) => {
    const existing = get().trips.find((t) => t.id === id)
    if (!existing) return

    const updated: Trip = { ...existing, ...patch, updatedAt: now() }

    try {
      const db = await getDb()
      await db.put('trips', updated)
      set((s) => ({ trips: s.trips.map((t) => (t.id === id ? updated : t)) }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update trip'
      set({ error: message })
      throw err
    }
  },

  archiveTrip: async (id) => {
    return get().updateTrip(id, { archivedAt: now() })
  },

  restoreTrip: async (id) => {
    return get().updateTrip(id, { archivedAt: null })
  },

  deleteTrip: async (id) => {
    try {
      const db = await getDb()
      // Mark all associated media as unavailable (don't delete records)
      const media = await db.getAllFromIndex('mediaItems', 'by_tripId', id)
      const tx = db.transaction(['trips', 'mediaItems'], 'readwrite')
      await tx.objectStore('trips').delete(id)
      for (const item of media) {
        await tx.objectStore('mediaItems').put({
          ...item,
          availabilityStatus: 'unavailable',
        })
      }
      await tx.done

      set((s) => ({ trips: s.trips.filter((t) => t.id !== id) }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete trip'
      set({ error: message })
      throw err
    }
  },
}))

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectActiveTrips = (s: TripsState) =>
  s.trips.filter((t) => !t.archivedAt)

export const selectArchivedTrips = (s: TripsState) =>
  s.trips.filter((t) => !!t.archivedAt)

export const selectTripById = (id: string) => (s: TripsState) =>
  s.trips.find((t) => t.id === id) ?? null

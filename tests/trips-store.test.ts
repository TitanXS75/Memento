import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { closeDb } from '@/lib/db'
import { useTripsStore, selectActiveTrips, selectArchivedTrips } from '@/lib/store/trips'

describe('Trips Zustand Store', () => {
  beforeEach(() => {
    closeDb()
    useTripsStore.setState({ trips: [], loading: false, error: null })
  })

  afterEach(() => {
    closeDb()
  })

  it('creates a new trip and updates store state', async () => {
    const store = useTripsStore.getState()
    const trip = await store.createTrip({
      name: 'Kyoto Autumn Walk',
      startDate: '2026-11-01',
      endDate: '2026-11-07',
      description: 'Temples and maple leaves',
    })

    expect(trip.id).toBeDefined()
    expect(trip.name).toBe('Kyoto Autumn Walk')
    expect(trip.archivedAt).toBeNull()

    const trips = useTripsStore.getState().trips
    expect(trips.length).toBe(1)
    expect(trips[0].name).toBe('Kyoto Autumn Walk')
  })

  it('archives and restores a trip', async () => {
    const store = useTripsStore.getState()
    const trip = await store.createTrip({
      name: 'Iceland Highlands',
      startDate: '2026-07-15',
      endDate: '2026-07-25',
    })

    expect(selectActiveTrips(useTripsStore.getState()).length).toBe(1)
    expect(selectArchivedTrips(useTripsStore.getState()).length).toBe(0)

    // Archive
    await store.archiveTrip(trip.id)
    expect(selectActiveTrips(useTripsStore.getState()).length).toBe(0)
    expect(selectArchivedTrips(useTripsStore.getState()).length).toBe(1)

    // Restore
    await store.restoreTrip(trip.id)
    expect(selectActiveTrips(useTripsStore.getState()).length).toBe(1)
    expect(selectArchivedTrips(useTripsStore.getState()).length).toBe(0)
  })

  it('deletes a trip', async () => {
    const store = useTripsStore.getState()
    const trip = await store.createTrip({
      name: 'Dolomites Trek',
      startDate: '2026-08-01',
      endDate: '2026-08-08',
    })

    expect(useTripsStore.getState().trips.length).toBe(1)

    await store.deleteTrip(trip.id)
    expect(useTripsStore.getState().trips.length).toBe(0)
  })
})

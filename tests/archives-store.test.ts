import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { closeDb } from '@/lib/db'
import { useArchivesStore } from '@/lib/store/archives'

describe('Archives Zustand Store', () => {
  beforeEach(() => {
    closeDb()
    useArchivesStore.setState({ archives: [], loading: false, error: null })
  })

  afterEach(() => {
    closeDb()
  })

  it('creates an archive record in IndexedDB and updates state', async () => {
    const store = useArchivesStore.getState()
    const arch = await store.createArchiveRecord({
      tripId: 'trip-1',
      filename: 'Goa_Trip_2026.zip',
      selectedDates: ['2026-10-10'],
      mediaItemIds: ['m1', 'm2'],
      photoCount: 2,
      videoCount: 0,
      totalSourceBytes: 1048576,
      archiveSizeBytes: 524288,
      localStorageReference: 'blob:http://localhost/dummy-zip',
      status: 'completed',
    })

    expect(arch.id).toBeDefined()
    expect(arch.filename).toBe('Goa_Trip_2026.zip')
    expect(arch.status).toBe('completed')

    const current = useArchivesStore.getState().archives
    expect(current.length).toBe(1)
    expect(current[0]?.id).toBe(arch.id)
  })

  it('updates an archive status', async () => {
    const store = useArchivesStore.getState()
    const arch = await store.createArchiveRecord({
      tripId: 'trip-2',
      filename: 'Kyoto_2026.zip',
      selectedDates: ['2026-11-01'],
      mediaItemIds: ['m3'],
      photoCount: 1,
      videoCount: 0,
      totalSourceBytes: 2048,
      archiveSizeBytes: null,
      localStorageReference: null,
      status: 'creating',
    })

    await store.updateArchive(arch.id, {
      status: 'completed',
      archiveSizeBytes: 1024,
      localStorageReference: 'blob:done',
    })

    const updated = useArchivesStore.getState().archives.find((a) => a.id === arch.id)
    expect(updated?.status).toBe('completed')
    expect(updated?.archiveSizeBytes).toBe(1024)
  })

  it('deletes an archive and removes from state', async () => {
    const store = useArchivesStore.getState()
    const arch = await store.createArchiveRecord({
      tripId: 'trip-3',
      filename: 'Rome_2026.zip',
      selectedDates: ['2026-06-01'],
      mediaItemIds: [],
      photoCount: 0,
      videoCount: 0,
      totalSourceBytes: 0,
      archiveSizeBytes: 0,
      localStorageReference: null,
      status: 'completed',
    })

    expect(useArchivesStore.getState().archives.length).toBe(1)

    await store.deleteArchive(arch.id)
    expect(useArchivesStore.getState().archives.length).toBe(0)
  })
})

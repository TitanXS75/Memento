import { create } from 'zustand'
import { getDb } from '@/lib/db'
import { newId, now, type Archive } from '@/lib/db/schema'

interface ArchivesState {
  archives: Archive[]
  loading: boolean
  error: string | null

  loadArchives: () => Promise<void>
  createArchiveRecord: (data: Omit<Archive, 'id' | 'createdAt'>) => Promise<Archive>
  updateArchive: (id: string, patch: Partial<Archive>) => Promise<void>
  deleteArchive: (id: string) => Promise<void>
}

export const useArchivesStore = create<ArchivesState>((set, get) => ({
  archives: [],
  loading: false,
  error: null,

  loadArchives: async () => {
    set({ loading: true, error: null })
    try {
      const db = await getDb()
      const all = await db.getAll('archives')
      // Recover interrupted archives: if status === 'creating', mark as failed
      const sanitized = all.map((arch) => {
        if (arch.status === 'creating') {
          return { ...arch, status: 'failed' as const }
        }
        return arch
      })
      // Filter out deleted and sort newest first
      const active = sanitized
        .filter((a) => a.status !== 'deleted')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      set({ archives: active, loading: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load archives'
      set({ error: msg, loading: false })
    }
  },

  createArchiveRecord: async (data) => {
    const record: Archive = {
      ...data,
      id: newId(),
      createdAt: now(),
    }
    try {
      const db = await getDb()
      await db.put('archives', record)
      set((s) => ({ archives: [record, ...s.archives] }))
      return record
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save archive record'
      set({ error: msg })
      throw err
    }
  },

  updateArchive: async (id, patch) => {
    const existing = get().archives.find((a) => a.id === id)
    if (!existing) return

    const updated: Archive = { ...existing, ...patch }
    try {
      const db = await getDb()
      await db.put('archives', updated)
      set((s) => ({
        archives: s.archives.map((a) => (a.id === id ? updated : a)),
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update archive'
      set({ error: msg })
      throw err
    }
  },

  deleteArchive: async (id) => {
    try {
      const db = await getDb()
      const item = await db.get('archives', id)
      if (item) {
        // Clean up object URL if stored in memory
        if (item.localStorageReference && item.localStorageReference.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(item.localStorageReference)
          } catch {
            // ignore
          }
        }
        await db.put('archives', { ...item, status: 'deleted' })
      }
      set((s) => ({ archives: s.archives.filter((a) => a.id !== id) }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete archive'
      set({ error: msg })
      throw err
    }
  },
}))

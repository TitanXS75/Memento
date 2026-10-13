import { create } from 'zustand'
import { getDb } from '@/lib/db'
import {
  recordTransferEvent,
  type ActiveTransferProgress,
} from '@/lib/services/transfer'
import type { Transfer } from '@/lib/db/schema'

interface TransfersState {
  activeTransfers: ActiveTransferProgress[]
  history: Transfer[]
  loading: boolean
  error: string | null

  loadHistory: () => Promise<void>
  addActiveTransfer: (transfer: ActiveTransferProgress) => void
  updateProgress: (
    id: string,
    transferredBytes: number,
    currentChunk: number,
    speedBps: number,
  ) => void
  setStatus: (
    id: string,
    status: ActiveTransferProgress['status'],
    error?: string | null,
  ) => Promise<void>
  cancelTransfer: (id: string) => Promise<void>
  retryTransfer: (id: string) => Promise<void>
  clearCompleted: () => void
}

export const useTransfersStore = create<TransfersState>((set, get) => ({
  activeTransfers: [],
  history: [],
  loading: false,
  error: null,

  loadHistory: async () => {
    set({ loading: true, error: null })
    try {
      const db = await getDb()
      const all = await db.getAll('transfers')
      const sorted = all.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      set({ history: sorted, loading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load transfer history'
      set({ error: message, loading: false })
    }
  },

  addActiveTransfer: (transfer) => {
    set((s) => ({
      activeTransfers: [transfer, ...s.activeTransfers.filter((t) => t.id !== transfer.id)],
    }))
  },

  updateProgress: (id, transferredBytes, currentChunk, speedBps) => {
    set((s) => ({
      activeTransfers: s.activeTransfers.map((t) => {
        if (t.id !== id) return t
        return {
          ...t,
          transferredBytes,
          currentChunk,
          speedBps,
          status: 'in_progress',
        }
      }),
    }))
  },

  setStatus: async (id, status, error = null) => {
    const target = get().activeTransfers.find((t) => t.id === id)
    if (!target) return

    const nowIso = new Date().toISOString()
    const updated: ActiveTransferProgress = {
      ...target,
      status,
      error,
      completedAt: status === 'completed' || status === 'failed' || status === 'cancelled' ? nowIso : null,
    }

    set((s) => ({
      activeTransfers: s.activeTransfers.map((t) => (t.id === id ? updated : t)),
    }))

    // If final state reached, record into IndexedDB history
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      const dbRecord: Omit<Transfer, 'id' | 'createdAt'> = {
        tripId: target.tripId ?? null,
        peerDeviceId: target.peerDeviceId,
        direction: target.direction,
        status,
        totalBytes: target.totalBytes,
        transferredBytes: status === 'completed' ? target.totalBytes : target.transferredBytes,
        completedAt: nowIso,
        failureReason: error,
      }
      const saved = await recordTransferEvent(dbRecord)
      set((s) => ({ history: [saved, ...s.history] }))
    }
  },

  cancelTransfer: async (id) => {
    await get().setStatus(id, 'cancelled', 'Cancelled by user')
  },

  retryTransfer: async (id) => {
    const target = get().activeTransfers.find((t) => t.id === id)
    if (!target) return

    set((s) => ({
      activeTransfers: s.activeTransfers.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'pending',
              error: null,
              transferredBytes: 0,
              currentChunk: 0,
              speedBps: 0,
            }
          : t,
      ),
    }))
  },

  clearCompleted: () => {
    set((s) => ({
      activeTransfers: s.activeTransfers.filter(
        (t) => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'failed',
      ),
    }))
  },
}))

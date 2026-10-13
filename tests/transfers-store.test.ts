import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { closeDb } from '@/lib/db'
import { useTransfersStore } from '@/lib/store/transfers'
import type { ActiveTransferProgress } from '@/lib/services/transfer'

describe('Transfers Store', () => {
  beforeEach(() => {
    closeDb()
    useTransfersStore.setState({ activeTransfers: [], history: [], loading: false, error: null })
  })

  afterEach(() => {
    closeDb()
  })

  it('adds an active transfer and updates progress', () => {
    const store = useTransfersStore.getState()
    const item: ActiveTransferProgress = {
      id: 't-1',
      fileId: 'f-1',
      filename: 'sample.mp4',
      mediaType: 'video',
      direction: 'incoming',
      peerDeviceId: 'dev-phone',
      peerDeviceName: 'Pixel 8',
      totalBytes: 10485760,
      transferredBytes: 0,
      currentChunk: 0,
      totalChunks: 5,
      speedBps: 0,
      status: 'pending',
      startedAt: new Date().toISOString(),
    }

    store.addActiveTransfer(item)
    expect(useTransfersStore.getState().activeTransfers.length).toBe(1)

    store.updateProgress('t-1', 2097152, 1, 1048576)
    const updated = useTransfersStore.getState().activeTransfers[0]
    expect(updated?.transferredBytes).toBe(2097152)
    expect(updated?.currentChunk).toBe(1)
    expect(updated?.speedBps).toBe(1048576)
    expect(updated?.status).toBe('in_progress')
  })

  it('marks transfer completed and appends to history', async () => {
    const store = useTransfersStore.getState()
    const item: ActiveTransferProgress = {
      id: 't-2',
      fileId: 'f-2',
      filename: 'photo.jpg',
      mediaType: 'photo',
      direction: 'outgoing',
      peerDeviceId: 'peer-iphone',
      peerDeviceName: 'iPhone 15',
      totalBytes: 524288,
      transferredBytes: 524288,
      currentChunk: 1,
      totalChunks: 1,
      speedBps: 524288,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    }

    store.addActiveTransfer(item)
    await store.setStatus('t-2', 'completed')

    const current = useTransfersStore.getState()
    const active = current.activeTransfers.find((t) => t.id === 't-2')
    expect(active?.status).toBe('completed')
    expect(current.history.length).toBe(1)
    expect(current.history[0]?.peerDeviceId).toBe('peer-iphone')
    expect(current.history[0]?.status).toBe('completed')
  })

  it('cancels an active transfer', async () => {
    const store = useTransfersStore.getState()
    const item: ActiveTransferProgress = {
      id: 't-3',
      fileId: 'f-3',
      filename: 'video.mov',
      mediaType: 'video',
      direction: 'incoming',
      peerDeviceId: 'peer-laptop',
      peerDeviceName: 'MacBook',
      totalBytes: 2000,
      transferredBytes: 500,
      currentChunk: 1,
      totalChunks: 4,
      speedBps: 500,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    }

    store.addActiveTransfer(item)
    await store.cancelTransfer('t-3')

    const active = useTransfersStore.getState().activeTransfers.find((t) => t.id === 't-3')
    expect(active?.status).toBe('cancelled')
    expect(active?.error).toBe('Cancelled by user')
  })
})

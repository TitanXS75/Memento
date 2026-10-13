import { create } from 'zustand'
import {
  assembleAndVerifyFile,
  checkForDuplicateMedia,
  CHUNK_SIZE,
  getOrCreateLocalDevice,
  saveLocalDevice,
  sliceIntoChunks,
  storeTransferredMediaItem,
  type ActiveTransferProgress,
  type DiscoveredDevice,
  type IncomingTransferRequest,
  type LocalDeviceInfo,
  type TransferManifestItem,
} from '@/lib/services/transfer'
import { useTransfersStore } from '@/lib/store/transfers'

export type DiscoveryStatus = 'idle' | 'discovering' | 'stopped' | 'timeout' | 'error'

interface NearbyState {
  localDevice: LocalDeviceInfo
  discoveryStatus: DiscoveryStatus
  discoveredDevices: DiscoveredDevice[]
  connectedDevice: DiscoveredDevice | null
  incomingRequest: IncomingTransferRequest | null
  discoveryTimerId: number | null
  error: string | null

  // Actions
  init: () => void
  updateDisplayName: (name: string) => void
  startDiscovery: () => void
  stopDiscovery: () => void
  connectManual: (ip: string, port?: number) => Promise<DiscoveredDevice>
  disconnect: () => void
  setIncomingRequest: (req: IncomingTransferRequest | null) => void
  acceptIncomingRequest: () => Promise<void>
  declineIncomingRequest: () => void
  sendMediaToDevice: (
    targetDevice: DiscoveredDevice,
    items: TransferManifestItem[],
    tripId?: string | null,
    tripName?: string | null,
  ) => Promise<void>
}

let discoveryBroadcastChannel: BroadcastChannel | null = null

export const useNearbyStore = create<NearbyState>((set, get) => ({
  localDevice: getOrCreateLocalDevice(),
  discoveryStatus: 'idle',
  discoveredDevices: [],
  connectedDevice: null,
  incomingRequest: null,
  discoveryTimerId: null,
  error: null,

  init: () => {
    const local = getOrCreateLocalDevice()
    set({ localDevice: local })

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      if (!discoveryBroadcastChannel) {
        discoveryBroadcastChannel = new BroadcastChannel('memento_lan_discovery')
        discoveryBroadcastChannel.onmessage = (event) => {
          const msg = event.data as {
            type: string
            device?: DiscoveredDevice
            request?: IncomingTransferRequest
          }
          if (!msg) return

          if (msg.type === 'ANNOUNCE' && msg.device && msg.device.id !== get().localDevice.id) {
            set((s) => {
              const existingIndex = s.discoveredDevices.findIndex((d) => d.id === msg.device!.id)
              const updatedDevices = [...s.discoveredDevices]
              if (existingIndex >= 0) {
                updatedDevices[existingIndex] = msg.device!
              } else {
                updatedDevices.push(msg.device!)
              }
              return { discoveredDevices: updatedDevices }
            })
          } else if (msg.type === 'INCOMING_REQUEST' && msg.request) {
            if (msg.request.senderDevice.id !== get().localDevice.id) {
              set({ incomingRequest: msg.request })
            }
          }
        }
      }
    }
  },

  updateDisplayName: (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const updated: LocalDeviceInfo = { ...get().localDevice, displayName: trimmed }
    saveLocalDevice(updated)
    set({ localDevice: updated })
  },

  startDiscovery: () => {
    const currentTimer = get().discoveryTimerId
    if (currentTimer) clearTimeout(currentTimer)

    set({ discoveryStatus: 'discovering', error: null })

    // Announce presence on LAN channel
    if (discoveryBroadcastChannel) {
      const dev = get().localDevice
      discoveryBroadcastChannel.postMessage({
        type: 'ANNOUNCE',
        device: {
          id: dev.id,
          displayName: dev.displayName,
          platform: dev.platform,
          ipAddress: dev.ipAddress,
          port: dev.port,
          lastSeenAt: new Date().toISOString(),
          isAvailable: true,
        },
      })
    }

    // Set 30-second timeout if no devices found
    const timer = setTimeout(() => {
      const state = get()
      if (state.discoveryStatus === 'discovering' && state.discoveredDevices.length === 0) {
        set({ discoveryStatus: 'timeout' })
      }
    }, 30000)

    set({ discoveryTimerId: timer as unknown as number })
  },

  stopDiscovery: () => {
    const currentTimer = get().discoveryTimerId
    if (currentTimer) clearTimeout(currentTimer)
    set({ discoveryStatus: 'stopped', discoveryTimerId: null })
  },

  connectManual: async (ip, port = 7734) => {
    const cleanIp = ip.trim()
    if (!cleanIp) throw new Error('IP address cannot be empty')

    const newPeer: DiscoveredDevice = {
      id: `peer_${cleanIp.replace(/\./g, '_')}`,
      displayName: `Peer (${cleanIp})`,
      platform: 'android',
      ipAddress: cleanIp,
      port,
      lastSeenAt: new Date().toISOString(),
      isAvailable: true,
    }

    set((s) => ({
      discoveredDevices: [
        newPeer,
        ...s.discoveredDevices.filter((d) => d.ipAddress !== cleanIp),
      ],
      connectedDevice: newPeer,
    }))

    return newPeer
  },

  disconnect: () => {
    set({ connectedDevice: null })
  },

  setIncomingRequest: (req) => {
    set({ incomingRequest: req })
  },

  acceptIncomingRequest: async () => {
    const req = get().incomingRequest
    if (!req) return

    set({ incomingRequest: null })
    const transfersStore = useTransfersStore.getState()

    for (const item of req.items) {
      const transferId = `incoming_${crypto.randomUUID().slice(0, 8)}`
      const totalBytes = item.sizeBytes
      const chunksCount = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE))

      const activeItem: ActiveTransferProgress = {
        id: transferId,
        fileId: item.fileId,
        filename: item.filename,
        mediaType: item.mediaType,
        direction: 'incoming',
        peerDeviceId: req.senderDevice.id,
        peerDeviceName: req.senderDevice.displayName,
        tripId: req.tripId ?? null,
        totalBytes,
        transferredBytes: 0,
        currentChunk: 0,
        totalChunks: chunksCount,
        speedBps: 0,
        status: 'connecting',
        contentHash: item.contentHash,
        startedAt: new Date().toISOString(),
      }

      transfersStore.addActiveTransfer(activeItem)

      try {
        // Check for duplicate
        const duplicate = await checkForDuplicateMedia(item.contentHash)
        if (duplicate) {
          // If duplicate, still record but mark as duplicate/completed
          await transfersStore.setStatus(transferId, 'completed', 'File already exists in library')
          continue
        }

        // Simulate or stream chunk reception
        let fileData: Uint8Array
        if (item.blob) {
          const buf = await item.blob.arrayBuffer()
          fileData = new Uint8Array(buf)
        } else {
          // Fallback dummy payload for demonstration
          fileData = new Uint8Array(totalBytes)
        }

        const chunks = sliceIntoChunks(fileData, CHUNK_SIZE)
        let transferred = 0
        const startTime = Date.now()

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          if (!chunk) continue
          transferred += chunk.byteLength
          const elapsed = (Date.now() - startTime) / 1000 || 0.1
          const speed = Math.round(transferred / elapsed)

          transfersStore.updateProgress(transferId, transferred, i + 1, speed)
          // Yield to main thread for responsive UI
          await new Promise((r) => setTimeout(r, 60))
        }

        // Verify SHA-256
        await transfersStore.setStatus(transferId, 'verifying')
        const verification = await assembleAndVerifyFile(chunks, item.contentHash)

        if (!verification.verified) {
          await transfersStore.setStatus(
            transferId,
            'failed',
            'Integrity check failed (SHA-256 mismatch)',
          )
          continue
        }

        // Store into IndexedDB mediaItems
        await storeTransferredMediaItem(
          item,
          verification.data,
          req.tripId,
          req.senderDevice.id,
        )

        await transfersStore.setStatus(transferId, 'completed')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transfer failed'
        await transfersStore.setStatus(transferId, 'failed', msg)
      }
    }
  },

  declineIncomingRequest: () => {
    set({ incomingRequest: null })
  },

  sendMediaToDevice: async (targetDevice, items, tripId = null, tripName = null) => {
    const local = get().localDevice
    const totalBytes = items.reduce((acc, it) => acc + it.sizeBytes, 0)
    const requestId = `req_${crypto.randomUUID().slice(0, 8)}`

    const requestPayload: IncomingTransferRequest = {
      requestId,
      senderDevice: {
        id: local.id,
        displayName: local.displayName,
        platform: local.platform,
        ipAddress: local.ipAddress,
        port: local.port,
        lastSeenAt: new Date().toISOString(),
        isAvailable: true,
      },
      tripId,
      tripName,
      items,
      totalBytes,
      createdAt: new Date().toISOString(),
    }

    // Broadcast transfer request to peer
    if (discoveryBroadcastChannel) {
      discoveryBroadcastChannel.postMessage({
        type: 'INCOMING_REQUEST',
        request: requestPayload,
      })
    }

    // Register active outgoing items
    const transfersStore = useTransfersStore.getState()
    for (const item of items) {
      const transferId = `outgoing_${crypto.randomUUID().slice(0, 8)}`
      const chunksCount = Math.max(1, Math.ceil(item.sizeBytes / CHUNK_SIZE))

      const activeItem: ActiveTransferProgress = {
        id: transferId,
        fileId: item.fileId,
        filename: item.filename,
        mediaType: item.mediaType,
        direction: 'outgoing',
        peerDeviceId: targetDevice.id,
        peerDeviceName: targetDevice.displayName,
        tripId,
        totalBytes: item.sizeBytes,
        transferredBytes: 0,
        currentChunk: 0,
        totalChunks: chunksCount,
        speedBps: 0,
        status: 'in_progress',
        contentHash: item.contentHash,
        startedAt: new Date().toISOString(),
      }

      transfersStore.addActiveTransfer(activeItem)

      try {
        let fileData: Uint8Array
        if (item.blob) {
          const buf = await item.blob.arrayBuffer()
          fileData = new Uint8Array(buf)
        } else {
          fileData = new Uint8Array(item.sizeBytes)
        }

        const chunks = sliceIntoChunks(fileData, CHUNK_SIZE)
        let transferred = 0
        const startTime = Date.now()

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          if (!chunk) continue
          transferred += chunk.byteLength
          const elapsed = (Date.now() - startTime) / 1000 || 0.1
          const speed = Math.round(transferred / elapsed)

          transfersStore.updateProgress(transferId, transferred, i + 1, speed)
          await new Promise((r) => setTimeout(r, 60))
        }

        await transfersStore.setStatus(transferId, 'completed')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Outgoing transfer failed'
        await transfersStore.setStatus(transferId, 'failed', msg)
      }
    }
  },
}))

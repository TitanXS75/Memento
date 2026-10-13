import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { closeDb } from '@/lib/db'
import { useNearbyStore } from '@/lib/store/nearby'
import type { IncomingTransferRequest } from '@/lib/services/transfer'

describe('Nearby Store', () => {
  beforeEach(() => {
    closeDb()
    useNearbyStore.setState({
      discoveryStatus: 'idle',
      discoveredDevices: [],
      connectedDevice: null,
      incomingRequest: null,
      error: null,
    })
  })

  afterEach(() => {
    closeDb()
  })

  it('manages discovery status lifecycle', () => {
    const store = useNearbyStore.getState()
    expect(store.discoveryStatus).toBe('idle')

    store.startDiscovery()
    expect(useNearbyStore.getState().discoveryStatus).toBe('discovering')

    store.stopDiscovery()
    expect(useNearbyStore.getState().discoveryStatus).toBe('stopped')
  })

  it('connects manually to peer IP address', async () => {
    const store = useNearbyStore.getState()
    const peer = await store.connectManual('192.168.1.55', 7734)

    expect(peer.ipAddress).toBe('192.168.1.55')
    expect(peer.port).toBe(7734)

    const state = useNearbyStore.getState()
    expect(state.discoveredDevices.length).toBe(1)
    expect(state.connectedDevice?.ipAddress).toBe('192.168.1.55')
  })

  it('handles incoming request acceptance and decline', () => {
    const store = useNearbyStore.getState()
    const req: IncomingTransferRequest = {
      requestId: 'req-1',
      senderDevice: {
        id: 'sender-1',
        displayName: 'Alice Phone',
        platform: 'android',
        ipAddress: '192.168.1.12',
        port: 7734,
        lastSeenAt: new Date().toISOString(),
        isAvailable: true,
      },
      items: [],
      totalBytes: 0,
      createdAt: new Date().toISOString(),
    }

    store.setIncomingRequest(req)
    expect(useNearbyStore.getState().incomingRequest).not.toBeNull()

    store.declineIncomingRequest()
    expect(useNearbyStore.getState().incomingRequest).toBeNull()
  })
})

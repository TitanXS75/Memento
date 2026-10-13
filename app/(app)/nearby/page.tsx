'use client'

import {
  ArrowDownUp,
  History,
  Info,
  Laptop,
  Plus,
  RefreshCw,
  Send,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { DeviceCard } from '@/components/app/DeviceCard'
import { IncomingTransferModal } from '@/components/app/IncomingTransferModal'
import { ManualConnectModal } from '@/components/app/ManualConnectModal'
import { SendMediaModal } from '@/components/app/SendMediaModal'
import { TransferQueueItem } from '@/components/app/TransferQueueItem'
import { formatBytes } from '@/lib/services/hash'
import type { DiscoveredDevice, TransferManifestItem } from '@/lib/services/transfer'
import { useNearbyStore } from '@/lib/store/nearby'
import { useTransfersStore } from '@/lib/store/transfers'

export default function NearbyPage() {
  const {
    localDevice,
    discoveryStatus,
    discoveredDevices,
    connectedDevice,
    incomingRequest,
    init,
    startDiscovery,
    stopDiscovery,
    connectManual,
    acceptIncomingRequest,
    declineIncomingRequest,
    sendMediaToDevice,
  } = useNearbyStore()

  const {
    activeTransfers,
    history,
    loadHistory,
    cancelTransfer,
    retryTransfer,
    clearCompleted,
  } = useTransfersStore()

  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [sendTargetDevice, setSendTargetDevice] = useState<DiscoveredDevice | null>(null)
  const [activeTab, setActiveTab] = useState<'discover' | 'transfers' | 'history'>('discover')

  useEffect(() => {
    init()
    loadHistory().catch(() => {})
  }, [init, loadHistory])

  const handleToggleDiscovery = () => {
    if (discoveryStatus === 'discovering') {
      stopDiscovery()
    } else {
      startDiscovery()
    }
  }

  const handleOpenSend = (device: DiscoveredDevice) => {
    setSendTargetDevice(device)
  }

  const handleSendConfirm = async (
    targetDevice: DiscoveredDevice,
    items: TransferManifestItem[],
    tripId?: string | null,
    tripName?: string | null,
  ) => {
    await sendMediaToDevice(targetDevice, items, tripId, tripName)
    setActiveTab('transfers')
  }

  const completedTransfersCount = activeTransfers.filter(
    (t) => t.status === 'completed' || t.status === 'cancelled',
  ).length

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow">Direct LAN Transfer</p>
          <h1 className="mt-1 font-sans text-4xl">Nearby devices</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="secondary-button text-xs py-2 px-3"
            id="open-manual-ip-modal-btn"
          >
            <Plus size={14} aria-hidden="true" />
            <span>Connect via IP</span>
          </button>
          <button
            type="button"
            onClick={handleToggleDiscovery}
            className="primary-button text-xs py-2 px-3.5"
            id="nearby-discover-btn"
          >
            <RefreshCw
              size={14}
              className={discoveryStatus === 'discovering' ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            <span>
              {discoveryStatus === 'discovering' ? 'Stop Searching' : 'Find Devices'}
            </span>
          </button>
        </div>
      </div>

      {/* Local Device & Network Status Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Wifi size={18} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {localDevice.displayName}
              </span>
              <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] text-[var(--muted)]">
                This device
              </span>
            </div>
            <p className="text-xs text-[var(--muted)]">
              IP: {localDevice.ipAddress} · Port: {localDevice.port}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--muted)]">
          <Info size={14} className="text-[var(--accent)]" aria-hidden="true" />
          <span>Local Wi-Fi / Hotspot only. Zero cloud servers.</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-3 border-b border-[var(--border)] pb-2 text-sm">
        <button
          type="button"
          onClick={() => setActiveTab('discover')}
          className={`pb-2 font-medium transition-colors ${
            activeTab === 'discover'
              ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Discovered Peers ({discoveredDevices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transfers')}
          className={`pb-2 font-medium transition-colors ${
            activeTab === 'transfers'
              ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Active Transfers ({activeTransfers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-2 font-medium transition-colors ${
            activeTab === 'history'
              ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Transfer History ({history.length})
        </button>
      </div>

      {/* Tab 1: Discover */}
      {activeTab === 'discover' && (
        <div className="module-enter mt-6 space-y-4">
          {discoveryStatus === 'discovering' && (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-4 text-sm text-[var(--accent)]">
              <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
              <span>Scanning local network for other devices with Memento open…</span>
            </div>
          )}

          {discoveryStatus === 'timeout' && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
              <WifiOff size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-medium">No devices found nearby</p>
                <p className="mt-0.5">
                  Ensure the other device is connected to the same Wi-Fi router or hotspot and has Memento open. You can also use &ldquo;Connect via IP&rdquo; above.
                </p>
              </div>
            </div>
          )}

          {discoveredDevices.length === 0 ? (
            <div className="surface-card flex flex-col items-center justify-center py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--muted)]">
                <Wifi size={24} aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-sans text-xl font-medium">Ready to transfer</h3>
              <p className="mt-2 max-w-sm text-xs text-[var(--muted)]">
                Tap &ldquo;Find Devices&rdquo; to discover other phones on your Wi-Fi, or connect directly using IP address.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {discoveredDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  isConnected={connectedDevice?.id === device.id}
                  onSend={handleOpenSend}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Active Transfers */}
      {activeTab === 'transfers' && (
        <div className="module-enter mt-6 space-y-4">
          {completedTransfersCount > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearCompleted}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Clear completed
              </button>
            </div>
          )}

          {activeTransfers.length === 0 ? (
            <div className="surface-card flex flex-col items-center justify-center py-12 text-center">
              <ArrowDownUp size={24} className="text-[var(--muted)]" aria-hidden="true" />
              <h3 className="mt-3 font-sans text-lg font-medium">No active transfers</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Initiate a send to a nearby device or receive incoming media.
              </p>
            </div>
          ) : (
            activeTransfers.map((item) => (
              <TransferQueueItem
                key={item.id}
                transfer={item}
                onCancel={cancelTransfer}
                onRetry={retryTransfer}
              />
            ))
          )}
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <div className="module-enter mt-6 space-y-3">
          {history.length === 0 ? (
            <div className="surface-card flex flex-col items-center justify-center py-12 text-center">
              <History size={24} className="text-[var(--muted)]" aria-hidden="true" />
              <h3 className="mt-3 font-sans text-lg font-medium">No transfer history</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Completed or failed transfers will appear here.
              </p>
            </div>
          ) : (
            history.map((record) => (
              <div
                key={record.id}
                className="surface-card flex items-center justify-between p-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--foreground)]">
                      {record.direction === 'incoming' ? 'Received from' : 'Sent to'}{' '}
                      {record.peerDeviceId}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        record.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : record.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-slate-500/10 text-[var(--muted)]'
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[var(--muted)]">
                    {formatBytes(record.transferredBytes)} transferred ·{' '}
                    {new Date(record.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <ManualConnectModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onConnect={async (ip, port) => {
          await connectManual(ip, port)
        }}
      />

      <SendMediaModal
        device={sendTargetDevice}
        isOpen={!!sendTargetDevice}
        onClose={() => setSendTargetDevice(null)}
        onSend={handleSendConfirm}
      />

      <IncomingTransferModal
        request={incomingRequest}
        onAccept={acceptIncomingRequest}
        onDecline={declineIncomingRequest}
      />
    </>
  )
}

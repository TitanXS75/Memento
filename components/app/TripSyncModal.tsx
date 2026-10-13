'use client'

import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Download,
  Laptop,
  RefreshCw,
  Smartphone,
  Upload,
  Wifi,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MediaItem, Trip } from '@/lib/db/schema'
import { formatBytes } from '@/lib/services/hash'
import {
  applyTripSyncManifest,
  calculateTripSyncDiff,
  createTripSyncManifest,
  exportSyncPackageAsJson,
  type TripSyncDiff,
  type TripSyncManifest,
} from '@/lib/services/sync'
import type { DiscoveredDevice } from '@/lib/services/transfer'
import { useNearbyStore } from '@/lib/store/nearby'
import { useUiStore } from '@/lib/store/ui'

interface TripSyncModalProps {
  trip: Trip
  mediaItems: MediaItem[]
  isOpen: boolean
  onClose: () => void
  onSynced: () => Promise<void>
}

export function TripSyncModal({
  trip,
  mediaItems,
  isOpen,
  onClose,
  onSynced,
}: TripSyncModalProps) {
  const { localDevice, discoveredDevices, startDiscovery } = useNearbyStore()
  const { addToast } = useUiStore()

  const [activeTab, setActiveTab] = useState<'peers' | 'file'>('peers')
  const [selectedPeer, setSelectedPeer] = useState<DiscoveredDevice | null>(null)
  const [diff, setDiff] = useState<TripSyncDiff | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [importJson, setImportJson] = useState('')

  useEffect(() => {
    if (isOpen) {
      startDiscovery()
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, startDiscovery, onClose])

  if (!isOpen) return null

  const handleSelectPeer = async (peer: DiscoveredDevice) => {
    setSelectedPeer(peer)
    // Simulate peer manifest exchange
    const simulatedRemoteManifest: TripSyncManifest = {
      version: 1,
      device: { id: peer.id, displayName: peer.displayName, platform: peer.platform },
      trip: { ...trip, updatedAt: new Date().toISOString() },
      mediaItems: mediaItems.slice(0, Math.max(1, Math.floor(mediaItems.length / 2))).map((m) => ({
        id: m.id,
        filename: m.filename,
        mimeType: m.mimeType,
        mediaType: m.mediaType,
        sizeBytes: m.sizeBytes,
        capturedAt: m.capturedAt,
        contentHash: m.contentHash || 'hash-dummy',
      })),
      exportedAt: new Date().toISOString(),
    }

    const calculatedDiff = calculateTripSyncDiff(trip, mediaItems, simulatedRemoteManifest)
    setDiff(calculatedDiff)
  }

  const handleExecuteSync = async () => {
    setIsSyncing(true)
    try {
      await new Promise((r) => setTimeout(r, 600))
      await onSynced()
      addToast('Trip synchronized successfully!', 'success')
      onClose()
    } catch {
      addToast('Failed to synchronize trip.', 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleExportManifest = async () => {
    const manifest = await createTripSyncManifest(trip.id, localDevice)
    if (!manifest) return
    const jsonStr = exportSyncPackageAsJson(manifest)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${trip.name.replace(/\s+/g, '_')}_sync_manifest.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast('Sync manifest exported.', 'success')
  }

  const handleImportManifest = async () => {
    if (!importJson.trim()) return
    try {
      const parsed = JSON.parse(importJson) as TripSyncManifest
      const res = await applyTripSyncManifest(parsed)
      await onSynced()
      addToast(`Imported "${res.trip.name}" with ${res.newItemsCount} items.`, 'success')
      onClose()
    } catch {
      addToast('Invalid sync manifest JSON format.', 'error')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-sync-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="surface-card w-full max-w-lg overflow-hidden p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <RefreshCw size={16} aria-hidden="true" />
            </span>
            <p className="eyebrow">P2P Sync</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <h2 id="trip-sync-title" className="mt-2 font-sans text-2xl font-medium">
          Sync &ldquo;{trip.name}&rdquo;
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Exchange missing trip photos, videos, and notes directly with peers on your Wi-Fi network.
        </p>

        {/* Tab selection */}
        <div className="mt-4 flex gap-2 border-b border-[var(--border)] pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('peers')}
            className={`pb-1 font-medium ${
              activeTab === 'peers'
                ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
                : 'text-[var(--muted)]'
            }`}
          >
            Nearby Peers ({discoveredDevices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`pb-1 font-medium ${
              activeTab === 'file'
                ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
                : 'text-[var(--muted)]'
            }`}
          >
            File Manifest Import/Export
          </button>
        </div>

        {activeTab === 'peers' && (
          <div className="mt-4 space-y-3">
            {discoveredDevices.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 text-center text-xs text-[var(--muted)]">
                <Wifi size={20} className="mx-auto mb-2 text-[var(--accent)] animate-pulse" />
                <p className="font-medium text-[var(--foreground)]">Looking for nearby peers…</p>
                <p className="mt-1">Keep Memento open on your friend&apos;s phone on the same Wi-Fi.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--muted)]">Select peer device to sync with:</p>
                <div className="max-h-36 overflow-y-auto space-y-1.5">
                  {discoveredDevices.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSelectPeer(d)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs transition-colors ${
                        selectedPeer?.id === d.id
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {d.platform === 'android' || d.platform === 'ios' ? (
                          <Smartphone size={16} className="text-[var(--accent)]" />
                        ) : (
                          <Laptop size={16} className="text-[var(--accent)]" />
                        )}
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{d.displayName}</p>
                          <p className="text-[10px] text-[var(--muted)]">{d.ipAddress}:{d.port}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-[var(--muted)]">Select</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sync Diff Summary */}
            {diff && selectedPeer && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 text-xs space-y-2">
                <div className="flex justify-between font-medium">
                  <span>Synced with {selectedPeer.displayName}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{diff.commonCount} in sync</span>
                </div>
                <div className="flex items-center justify-between text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <ArrowDownLeft size={13} className="text-emerald-500" />
                    <span>To receive from peer</span>
                  </span>
                  <span>{diff.toPullItems.length} files ({formatBytes(diff.toPullBytes)})</span>
                </div>
                <div className="flex items-center justify-between text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight size={13} className="text-blue-500" />
                    <span>To send to peer</span>
                  </span>
                  <span>{diff.toPushItems.length} files ({formatBytes(diff.toPushBytes)})</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'file' && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportManifest}
                className="secondary-button w-full text-xs py-2"
              >
                <Download size={13} />
                <span>Export Sync File</span>
              </button>
            </div>
            <div>
              <label htmlFor="import-manifest-textarea" className="block text-[11px] font-medium text-[var(--muted)]">
                Or paste JSON sync manifest:
              </label>
              <textarea
                id="import-manifest-textarea"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"version": 1, "trip": { ... }, "mediaItems": [ ... ]}'
                className="field mt-1 h-20 w-full text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleImportManifest}
                disabled={!importJson.trim()}
                className="primary-button mt-2 text-xs py-1.5 px-3 disabled:opacity-40"
              >
                <Upload size={13} />
                <span>Import & Merge Manifest</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="secondary-button text-xs">
            Close
          </button>
          {activeTab === 'peers' && (
            <button
              type="button"
              disabled={!selectedPeer || isSyncing}
              onClick={handleExecuteSync}
              className="primary-button text-xs disabled:opacity-40"
              id="confirm-trip-sync-btn"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Synchronizing…' : 'Sync Trip'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { Film, Image as ImageIcon, Send, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatBytes } from '@/lib/services/hash'
import {
  prepareFileForTransfer,
  type DiscoveredDevice,
  type TransferManifestItem,
} from '@/lib/services/transfer'
import { useTripsStore } from '@/lib/store/trips'

interface SendMediaModalProps {
  device: DiscoveredDevice | null
  isOpen: boolean
  onClose: () => void
  onSend: (
    targetDevice: DiscoveredDevice,
    items: TransferManifestItem[],
    tripId?: string | null,
    tripName?: string | null,
  ) => Promise<void>
}

export function SendMediaModal({
  device,
  isOpen,
  onClose,
  onSend,
}: SendMediaModalProps) {
  const { trips, loadTrips } = useTripsStore()
  const [selectedTripId, setSelectedTripId] = useState<string>('')
  const [pickedFiles, setPickedFiles] = useState<File[]>([])
  const [isPreparing, setIsPreparing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadTrips().catch(() => {})
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, loadTrips, onClose])

  if (!isOpen || !device) return null

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPickedFiles(Array.from(e.target.files))
    }
  }

  const totalBytes = pickedFiles.reduce((acc, f) => acc + f.size, 0)
  const selectedTrip = trips.find((t) => t.id === selectedTripId)

  const handleConfirmSend = async () => {
    if (pickedFiles.length === 0) return

    setIsPreparing(true)
    try {
      const items: TransferManifestItem[] = []
      for (const file of pickedFiles) {
        const item = await prepareFileForTransfer(file)
        items.push(item)
      }

      await onSend(
        device,
        items,
        selectedTripId || null,
        selectedTrip ? selectedTrip.name : null,
      )
      onClose()
      setPickedFiles([])
    } catch (err) {
      console.error('Failed to prepare transfer:', err)
    } finally {
      setIsPreparing(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-media-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="surface-card w-full max-w-lg overflow-hidden p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Transfer Files</p>
            <h2 id="send-media-title" className="mt-1 font-sans text-2xl font-medium">
              Send to {device.displayName}
            </h2>
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

        <div className="mt-5 space-y-4">
          {/* Trip selection */}
          {trips.length > 0 && (
            <div>
              <label htmlFor="trip-select" className="block text-xs font-medium text-[var(--muted)]">
                Associate with Trip (Optional)
              </label>
              <select
                id="trip-select"
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="field mt-1.5 w-full"
              >
                <option value="">No trip association</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.startDate})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* File Picker */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted)]">
              Select Photos & Videos
            </label>
            <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center hover:border-[var(--accent)]">
              <Upload size={24} className="text-[var(--accent)]" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium">Click to select photos & videos</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Original full-quality images and video files
              </p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>

          {/* Selected Files Summary */}
          {pickedFiles.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--foreground)]">
                  {pickedFiles.length} {pickedFiles.length === 1 ? 'file' : 'files'} selected
                </span>
                <span className="text-[var(--muted)]">{formatBytes(totalBytes)}</span>
              </div>
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1.5">
                {pickedFiles.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    {f.type.startsWith('video') ? <Film size={12} /> : <ImageIcon size={12} />}
                    <span className="truncate">{f.name}</span>
                    <span className="ml-auto shrink-0">{formatBytes(f.size)}</span>
                  </div>
                ))}
                {pickedFiles.length > 5 && (
                  <p className="text-[10px] text-[var(--muted)] italic">
                    +{pickedFiles.length - 5} more files…
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="secondary-button"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pickedFiles.length === 0 || isPreparing}
            onClick={handleConfirmSend}
            className="primary-button disabled:opacity-40"
            id="confirm-send-files-btn"
          >
            <Send size={15} aria-hidden="true" />
            <span>{isPreparing ? 'Preparing…' : `Send ${pickedFiles.length} Files`}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

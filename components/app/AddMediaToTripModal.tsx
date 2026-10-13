'use client'

import { Calendar, Check, FolderDown, Image as ImageIcon, Plus, RefreshCw, Video, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Trip } from '@/lib/db/schema'
import { formatBytes } from '@/lib/services/hash'
import {
  addMediaToTrip,
  addWebMediaItems,
  getDeviceMedia,
  type DeviceMediaItem,
} from '@/lib/services/media'

interface AddMediaToTripModalProps {
  trip: Trip
  existingMediaUrls: Set<string>
  onClose: () => void
  onAdded: (count: number) => void
}

export function AddMediaToTripModal({
  trip,
  existingMediaUrls,
  onClose,
  onAdded,
}: AddMediaToTripModalProps) {
  const [loading, setLoading] = useState(true)
  const [deviceItems, setDeviceItems] = useState<DeviceMediaItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterTripDatesOnly, setFilterTripDatesOnly] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tripStart = useMemo(() => new Date(trip.startDate + 'T00:00:00').getTime(), [trip.startDate])
  const tripEnd = useMemo(() => new Date(trip.endDate + 'T23:59:59').getTime(), [trip.endDate])

  const loadMedia = async () => {
    setLoading(true)
    try {
      const { images, videos } = await getDeviceMedia('all', 150)
      const combined = [...images, ...videos].sort((a, b) => b.date - a.date)
      setDeviceItems(combined)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
  }, [])

  const availableItems = useMemo(() => {
    return deviceItems.filter((item) => {
      if (existingMediaUrls.has(item.uri)) return false
      if (filterTripDatesOnly) {
        return item.date >= tripStart && item.date <= tripEnd
      }
      return true
    })
  }, [deviceItems, existingMediaUrls, filterTripDatesOnly, tripStart, tripEnd])

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === availableItems.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(availableItems.map((it) => it.id)))
  }

  const handleImportSelected = async () => {
    const toImport = deviceItems.filter((it) => selectedIds.has(it.id))
    if (toImport.length === 0) return

    await addMediaToTrip(
      trip.id,
      toImport.map((it) => ({
        filename: it.name,
        mimeType: it.mimeType,
        mediaType: it.type,
        sizeBytes: it.size,
        capturedAt: new Date(it.date).toISOString(),
        storageUri: it.uri,
        thumbnailUri: it.thumbnail,
        durationSeconds: it.duration ? Math.round(it.duration / 1000) : null,
      }))
    )

    onAdded(toImport.length)
    onClose()
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const added = await addWebMediaItems(e.target.files)
    if (added.length > 0) {
      await addMediaToTrip(
        trip.id,
        added.map((it) => ({
          filename: it.name,
          mimeType: it.mimeType,
          mediaType: it.type,
          sizeBytes: it.size,
          capturedAt: new Date(it.date).toISOString(),
          storageUri: it.uri,
          thumbnailUri: it.thumbnail,
        }))
      )
      onAdded(added.length)
      onClose()
    }
  }

  return (
    <div
      className="modal-backdrop z-50 p-2 sm:p-6"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="modal-card max-h-[90vh] max-w-xl overflow-hidden flex flex-col p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Add media to trip"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <p className="eyebrow">Trip Media</p>
            <h2 className="font-sans text-2xl">Add photos & videos</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)]">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Filter & Controls bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <label className="flex cursor-pointer items-center gap-2 select-none text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={filterTripDatesOnly}
              onChange={(e) => setFilterTripDatesOnly(e.target.checked)}
              className="rounded accent-[var(--accent)]"
            />
            <span className="flex items-center gap-1">
              <Calendar size={13} className="text-[var(--accent)]" />
              Only photos during trip ({trip.startDate} to {trip.endDate})
            </span>
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-1 font-medium hover:border-[var(--accent)]"
          >
            <Plus size={13} /> Select from files
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileInput} />
        </div>

        {/* Available Items Grid */}
        <div className="mt-3 min-h-[220px] max-h-[50vh] flex-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-strong)]/30 p-2">
          {loading ? (
            <div className="flex h-40 flex-col items-center justify-center text-xs text-[var(--muted)]">
              <RefreshCw size={20} className="animate-spin text-[var(--accent)]" />
              <span className="mt-2">Reading device media…</span>
            </div>
          ) : availableItems.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center p-4 text-center text-xs text-[var(--muted)]">
              <p>No new device media matching criteria.</p>
              {filterTripDatesOnly && (
                <button
                  type="button"
                  onClick={() => setFilterTripDatesOnly(false)}
                  className="mt-2 text-[var(--accent)] underline"
                >
                  Show all device media instead
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {availableItems.map((item) => {
                const selected = selectedIds.has(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSelect(item.id)}
                    className={`relative aspect-square overflow-hidden rounded-lg border text-left transition ${
                      selected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40' : 'border-[var(--border)] hover:border-[var(--muted)]'
                    }`}
                  >
                    {item.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnail} alt={item.name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-[var(--surface-strong)]">
                        {item.type === 'video' ? <Video size={20} /> : <ImageIcon size={20} />}
                      </div>
                    )}
                    <div className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 backdrop-blur-xs">
                      {selected ? <Check size={13} className="text-white" /> : <div className="size-2 rounded-full border border-white/60" />}
                    </div>
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[9px] text-white">
                      {formatBytes(item.size)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
          {availableItems.length > 0 && (
            <button type="button" onClick={handleSelectAll} className="secondary-button py-1 px-3">
              {selectedIds.size === availableItems.length ? 'Deselect all' : 'Select all'}
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="secondary-button py-1.5 px-3">
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleImportSelected}
              className="primary-button py-1.5 px-4 disabled:opacity-40"
            >
              <FolderDown size={14} /> Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} to trip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

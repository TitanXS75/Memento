'use client'

import { Calendar, Filter, Image as ImageIcon, Play, Plus, Star, Trash2, Video } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { MediaItem, Trip } from '@/lib/db/schema'
import { formatBytes } from '@/lib/services/hash'
import { AddMediaToTripModal } from './AddMediaToTripModal'
import { MediaLightboxModal } from './MediaLightboxModal'

interface TripMediaGalleryProps {
  trip: Trip
  mediaItems: MediaItem[]
  loading: boolean
  onRefresh: () => void
  onSetCover: (item: MediaItem) => void
  onDeleteMedia: (item: MediaItem) => void
}

function getDateKey(isoString: string): string {
  try {
    const d = new Date(isoString)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return 'Other'
  }
}

function formatDateHeader(key: string): string {
  if (key === 'Other') return 'Media'
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export function TripMediaGallery({
  trip,
  mediaItems,
  loading,
  onRefresh,
  onSetCover,
  onDeleteMedia,
}: TripMediaGalleryProps) {
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'video'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null)

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return mediaItems
    return mediaItems.filter((it) => it.mediaType === filterType)
  }, [mediaItems, filterType])

  const grouped = useMemo(() => {
    const map = new Map<string, MediaItem[]>()
    filteredItems.forEach((it) => {
      const key = getDateKey(it.capturedAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(it)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => ({
        key,
        title: formatDateHeader(key),
        items,
        totalBytes: items.reduce((acc, it) => acc + it.sizeBytes, 0),
      }))
  }, [filteredItems])

  const existingUris = useMemo(() => {
    const s = new Set<string>()
    mediaItems.forEach((it) => {
      if (it.localStorageReference) s.add(it.localStorageReference)
    })
    return s
  }, [mediaItems])

  return (
    <div className="mt-8 space-y-6">
      {/* Top Gallery Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`rounded-full px-3 py-1 font-medium transition ${
              filterType === 'all' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            All ({mediaItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('photo')}
            className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium transition ${
              filterType === 'photo' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <ImageIcon size={12} />
            Photos ({mediaItems.filter((m) => m.mediaType === 'photo').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('video')}
            className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium transition ${
              filterType === 'video' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <Video size={12} />
            Videos ({mediaItems.filter((m) => m.mediaType === 'video').length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="primary-button text-xs"
        >
          <Plus size={14} /> Add photos & videos
        </button>
      </div>

      {/* Gallery Content */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[var(--muted)]">Loading trip media…</div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-14 text-center">
          <ImageIcon size={32} className="text-[var(--muted)]" />
          <p className="mt-3 text-sm font-medium">No {filterType !== 'all' ? filterType + 's' : 'media'} in this trip yet</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Import photos from your device storage or camera roll.</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="secondary-button mt-4 text-xs"
          >
            <Plus size={13} /> Add media now
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-1.5 text-xs">
                <span className="font-medium text-[var(--foreground)]">{group.title}</span>
                <span className="text-[11px] text-[var(--muted)]">
                  {group.items.length} items • {formatBytes(group.totalBytes)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {group.items.map((item) => {
                  const isCover = trip.coverMediaId === item.id
                  const thumb = item.thumbnailUri || item.localStorageReference || ''
                  const globalIdx = filteredItems.findIndex((it) => it.id === item.id)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePreviewIndex(globalIdx)}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[var(--accent)] hover:shadow-xs"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-[var(--surface-strong)]">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={item.filename}
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            {item.mediaType === 'video' ? <Video size={24} /> : <ImageIcon size={24} />}
                          </div>
                        )}

                        {isCover && (
                          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-xs">
                            <Star size={10} className="fill-white" /> Cover
                          </span>
                        )}

                        {item.mediaType === 'video' && (
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                            <Play size={10} className="fill-white" />
                          </div>
                        )}
                      </div>

                      <div className="p-2">
                        <p className="truncate text-xs font-medium" title={item.filename}>
                          {item.filename}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[var(--muted)]">{formatBytes(item.sizeBytes)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Media Modal */}
      {showAddModal && (
        <AddMediaToTripModal
          trip={trip}
          existingMediaUrls={existingUris}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            onRefresh()
            setShowAddModal(false)
          }}
        />
      )}

      {/* Lightbox Modal */}
      {activePreviewIndex !== null && (
        <MediaLightboxModal
          items={filteredItems}
          currentIndex={activePreviewIndex}
          isCover={filteredItems[activePreviewIndex]?.id === trip.coverMediaId}
          onClose={() => setActivePreviewIndex(null)}
          onNavigate={(newIdx) => setActivePreviewIndex(newIdx)}
          onSetCover={(item) => onSetCover(item)}
          onDelete={(item) => {
            onDeleteMedia(item)
            setActivePreviewIndex(null)
          }}
        />
      )}
    </div>
  )
}

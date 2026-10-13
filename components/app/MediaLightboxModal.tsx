'use client'

import { Calendar, ChevronLeft, ChevronRight, Clock, HardDrive, Info, Maximize2, Play, Star, Trash2, X } from 'lucide-react'
import { useEffect } from 'react'
import type { MediaItem } from '@/lib/db/schema'
import { formatBytes } from '@/lib/services/hash'

interface MediaLightboxModalProps {
  items: MediaItem[]
  currentIndex: number
  isCover?: boolean
  onClose: () => void
  onNavigate: (index: number) => void
  onSetCover?: (item: MediaItem) => void
  onDelete?: (item: MediaItem) => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function MediaLightboxModal({
  items,
  currentIndex,
  isCover,
  onClose,
  onNavigate,
  onSetCover,
  onDelete,
}: MediaLightboxModalProps) {
  const item = items[currentIndex]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1)
      else if (e.key === 'ArrowRight' && currentIndex < items.length - 1) onNavigate(currentIndex + 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, items.length, onClose, onNavigate])

  if (!item) return null

  const isPhoto = item.mediaType === 'photo'
  const mediaSrc = item.localStorageReference || item.thumbnailUri || ''

  return (
    <div
      className="modal-backdrop z-50 p-2 sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal-card max-h-[92vh] max-w-2xl overflow-y-auto p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Media preview"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="min-w-0 pr-2">
            <p className="eyebrow">{isPhoto ? 'Photo' : 'Video'} • {currentIndex + 1} of {items.length}</p>
            <h3 className="truncate font-sans text-xl text-[var(--foreground)]">{item.filename}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] transition"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Media Frame */}
        <div className="relative mt-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-black/10 dark:bg-black/40">
          {mediaSrc ? (
            isPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaSrc}
                alt={item.filename}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            ) : (
              <video
                src={mediaSrc}
                controls
                playsInline
                className="max-h-full max-w-full rounded-lg"
              />
            )
          ) : (
            <div className="flex flex-col items-center gap-2 text-[var(--muted)]">
              {isPhoto ? <Maximize2 size={36} /> : <Play size={36} />}
              <span className="text-xs">Original media item</span>
            </div>
          )}

          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <button
              type="button"
              onClick={() => onNavigate(currentIndex - 1)}
              aria-label="Previous item"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white shadow-md backdrop-blur-xs transition hover:bg-black/80"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
          )}
          {currentIndex < items.length - 1 && (
            <button
              type="button"
              onClick={() => onNavigate(currentIndex + 1)}
              aria-label="Next item"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white shadow-md backdrop-blur-xs transition hover:bg-black/80"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Metadata Details */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl bg-[var(--surface-strong)] p-3.5 text-xs">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="shrink-0 text-[var(--accent)]" />
            <span className="text-[var(--muted)]">Captured:</span>
            <span className="truncate font-medium text-[var(--foreground)]">{formatDate(item.capturedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={13} className="shrink-0 text-[var(--accent)]" />
            <span className="text-[var(--muted)]">Time:</span>
            <span className="font-medium text-[var(--foreground)]">{formatTime(item.capturedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive size={13} className="shrink-0 text-[var(--accent)]" />
            <span className="text-[var(--muted)]">Size:</span>
            <span className="font-medium text-[var(--foreground)]">{formatBytes(item.sizeBytes)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Info size={13} className="shrink-0 text-[var(--accent)]" />
            <span className="text-[var(--muted)]">MIME:</span>
            <span className="truncate font-medium uppercase text-[var(--foreground)]">{item.mimeType || item.mediaType}</span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            {onSetCover && isPhoto && (
              <button
                type="button"
                onClick={() => onSetCover(item)}
                className={`secondary-button text-xs ${isCover ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
              >
                <Star size={13} className={isCover ? 'fill-[var(--accent)]' : ''} aria-hidden="true" />
                <span>{isCover ? 'Cover Photo' : 'Set as Cover'}</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="secondary-button text-xs text-[var(--coral)] hover:border-[var(--coral)]"
              >
                <Trash2 size={13} aria-hidden="true" />
                <span>Remove from trip</span>
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} className="primary-button text-xs">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

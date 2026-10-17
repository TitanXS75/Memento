'use client'

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  HardDrive,
  Info,
  Maximize2,
  Play,
  Star,
  Trash2,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MediaItem } from '@/lib/db/schema'
import type { DeviceMediaItem } from '@/lib/services/media'
import { formatBytes } from '@/lib/services/hash'

export type LightboxItem = MediaItem | DeviceMediaItem

export interface MediaLightboxModalProps<T extends LightboxItem = LightboxItem> {
  items: T[]
  currentIndex: number
  isCover?: boolean
  onClose: () => void
  onNavigate: (index: number) => void
  onSetCover?: (item: T) => void
  onDelete?: (item: T) => void
}

function getItemSrc(item: LightboxItem): string {
  if ('localStorageReference' in item && item.localStorageReference) return item.localStorageReference
  if ('thumbnailUri' in item && item.thumbnailUri) return item.thumbnailUri
  if ('thumbnail' in item && item.thumbnail) return item.thumbnail
  return ''
}

function getItemTitle(item: LightboxItem): string {
  if ('filename' in item) return item.filename
  if ('name' in item) return item.name
  return 'Media'
}

function getItemType(item: LightboxItem): 'photo' | 'video' {
  if ('mediaType' in item) return item.mediaType
  if ('type' in item) return item.type
  return 'photo'
}

function getItemSize(item: LightboxItem): number {
  if ('sizeBytes' in item) return item.sizeBytes
  if ('size' in item) return item.size
  return 0
}

function getItemDate(item: LightboxItem): string {
  const raw = 'capturedAt' in item ? item.capturedAt : 'date' in item ? item.date : undefined
  if (!raw) return ''
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return String(raw)
  }
}

function getItemTime(item: LightboxItem): string {
  const raw = 'capturedAt' in item ? item.capturedAt : 'date' in item ? item.date : undefined
  if (!raw) return ''
  try {
    return new Date(raw).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function getItemResolution(item: LightboxItem): string | null {
  const w = 'width' in item && typeof item.width === 'number' ? item.width : undefined
  const h = 'height' in item && typeof item.height === 'number' ? item.height : undefined
  if (!w || !h) return null
  const mp = ((w * h) / 1000000).toFixed(1)
  return `${w} × ${h} (${mp} MP)`
}

function getItemDuration(item: LightboxItem): string | null {
  const ms =
    'durationMs' in item && typeof item.durationMs === 'number'
      ? item.durationMs
      : 'duration' in item && typeof item.duration === 'number'
        ? item.duration
        : undefined

  if (typeof ms !== 'number' || ms <= 0) return null
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function MediaLightboxModal<T extends LightboxItem = LightboxItem>({
  items,
  currentIndex,
  isCover,
  onClose,
  onNavigate,
  onSetCover,
  onDelete,
}: MediaLightboxModalProps<T>) {
  const [showInfo, setShowInfo] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const item = items[currentIndex]

  // Reset zoom on navigation
  const handleNavigate = useCallback(
    (index: number) => {
      setIsZoomed(false)
      onNavigate(index)
    },
    [onNavigate]
  )

  // Lock body scroll
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && currentIndex > 0) handleNavigate(currentIndex - 1)
      else if (e.key === 'ArrowRight' && currentIndex < items.length - 1) handleNavigate(currentIndex + 1)
      else if (e.key.toLowerCase() === 'i') setShowInfo((prev) => !prev)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, items.length, onClose, handleNavigate])

  if (!item) return null

  const isPhoto = getItemType(item) === 'photo'
  const title = getItemTitle(item)
  const src = getItemSrc(item)
  const size = getItemSize(item)
  const dateFormatted = getItemDate(item)
  const timeFormatted = getItemTime(item)
  const resolution = getItemResolution(item)
  const duration = getItemDuration(item)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (deltaX > 50 && currentIndex > 0) handleNavigate(currentIndex - 1)
    else if (deltaX < -50 && currentIndex < items.length - 1) handleNavigate(currentIndex + 1)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white select-none backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Floating Glass Header */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-3 sm:p-5 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewer"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition backdrop-blur-md shrink-0"
          >
            <X size={20} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h3 className="truncate text-sm sm:text-base font-medium text-white/95">{title}</h3>
            <p className="text-[11px] text-white/60">
              {currentIndex + 1} of {items.length} {dateFormatted ? `• ${dateFormatted}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isPhoto && src && (
            <button
              type="button"
              onClick={() => setIsZoomed((z) => !z)}
              aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
              className={`flex size-9 items-center justify-center rounded-full transition backdrop-blur-md ${
                isZoomed ? 'bg-[var(--accent)] text-white' : 'bg-white/10 hover:bg-white/20 text-white/90'
              }`}
            >
              {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowInfo((s) => !s)}
            aria-label={showInfo ? 'Hide details' : 'Show details'}
            className={`flex size-9 items-center justify-center rounded-full transition backdrop-blur-md ${
              showInfo ? 'bg-[var(--accent)] text-white' : 'bg-white/10 hover:bg-white/20 text-white/90'
            }`}
          >
            <Info size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main Full-Size Gallery Canvas */}
      <main
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden p-2 sm:p-4 min-h-0"
        onClick={(e) => {
          if (e.target === e.currentTarget && !showInfo) onClose()
        }}
      >
        {src ? (
          isPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={title}
              onClick={() => setIsZoomed((z) => !z)}
              className={`max-h-[84vh] sm:max-h-[88vh] max-w-full object-contain transition-transform duration-200 select-none shadow-2xl ${
                isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
              }`}
            />
          ) : (
            <video
              src={src}
              controls
              autoPlay
              playsInline
              className="max-h-[84vh] sm:max-h-[88vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
          )
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/60">
            {isPhoto ? <Maximize2 size={48} /> : <Video size={48} />}
            <span className="text-sm font-medium">{title}</span>
            <span className="text-xs text-white/40">Media preview unavailable</span>
          </div>
        )}

        {/* Floating Left Navigation Chevron */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleNavigate(currentIndex - 1)
            }}
            aria-label="Previous image"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 flex size-11 sm:size-12 items-center justify-center rounded-full bg-black/40 hover:bg-black/75 border border-white/10 text-white shadow-xl backdrop-blur-md transition-all active:scale-95"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
        )}

        {/* Floating Right Navigation Chevron */}
        {currentIndex < items.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleNavigate(currentIndex + 1)
            }}
            aria-label="Next image"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex size-11 sm:size-12 items-center justify-center rounded-full bg-black/40 hover:bg-black/75 border border-white/10 text-white shadow-xl backdrop-blur-md transition-all active:scale-95"
          >
            <ChevronRight size={24} aria-hidden="true" />
          </button>
        )}
      </main>

      {/* Floating Bottom Action Bar */}
      <footer className="absolute bottom-0 inset-x-0 z-30 flex items-center justify-between p-3 sm:p-5 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          {onSetCover && isPhoto && (
            <button
              type="button"
              onClick={() => onSetCover(item)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition active:scale-95 ${
                isCover ? 'bg-[var(--accent)] text-white' : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              <Star size={13} className={isCover ? 'fill-white' : ''} aria-hidden="true" />
              <span>{isCover ? 'Cover Photo' : 'Set as Cover'}</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-[var(--coral)]/80 text-white hover:text-white px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition active:scale-95"
            >
              <Trash2 size={13} aria-hidden="true" />
              <span>Delete</span>
            </button>
          )}
        </div>

        {/* Unobtrusive center file badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/70 backdrop-blur-md">
          {size > 0 && <span>{formatBytes(size)}</span>}
          {resolution && (
            <>
              <span>•</span>
              <span>{resolution}</span>
            </>
          )}
          {duration && (
            <>
              <span>•</span>
              <span>{duration}</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 hover:bg-white/25 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md transition"
        >
          Done
        </button>
      </footer>

      {/* Slide-over Info Drawer (only when toggled) */}
      {showInfo && (
        <aside
          className="absolute right-3 sm:right-6 top-16 sm:top-20 z-40 w-72 sm:w-80 rounded-2xl border border-white/15 bg-black/80 p-4 text-xs text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          role="complementary"
          aria-label="Media details"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <span className="font-semibold text-white/90">Media Details</span>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="rounded-full p-1 text-white/60 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {dateFormatted && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-white/60">
                  <Calendar size={13} className="text-[var(--accent)]" /> Date
                </span>
                <span className="font-medium text-white/90">{dateFormatted}</span>
              </div>
            )}
            {timeFormatted && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-white/60">
                  <Clock size={13} className="text-[var(--accent)]" /> Time
                </span>
                <span className="font-medium text-white/90">{timeFormatted}</span>
              </div>
            )}
            {size > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-white/60">
                  <HardDrive size={13} className="text-[var(--accent)]" /> Size
                </span>
                <span className="font-medium text-white/90">{formatBytes(size)}</span>
              </div>
            )}
            {resolution && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-white/60">
                  <Maximize2 size={13} className="text-[var(--accent)]" /> Resolution
                </span>
                <span className="font-medium text-white/90">{resolution}</span>
              </div>
            )}
            {duration && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-white/60">
                  <Play size={13} className="text-[var(--accent)]" /> Duration
                </span>
                <span className="font-medium text-white/90">{duration}</span>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

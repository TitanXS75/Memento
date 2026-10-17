'use client'

import { useState } from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Maximize2,
  MoreVertical,
  Package,
  Play,
  ShieldCheck,
  Video,
} from 'lucide-react'
import type { DeviceMediaItem } from '@/lib/services/media'
import { formatBytes } from '@/lib/services/hash'

export interface MediaDateGroup {
  dateKey: string
  shortDate: string
  fullDate: string
  headerLabel: string
  items: DeviceMediaItem[]
  photos: DeviceMediaItem[]
  videos: DeviceMediaItem[]
  totalBytes: number
}

interface DateMediaListProps {
  dates: MediaDateGroup[]
  loading: boolean
  permissionGranted: boolean
  onRequestPermission: () => void
  onSelectFiles: () => void
  onPreviewItem: (item: DeviceMediaItem, groupItems?: DeviceMediaItem[]) => void
  onOpenZipModal: (dateKey: string, dateLabel: string, items: DeviceMediaItem[]) => void
}

function formatDayNumber(dateKey: string): string {
  const [, , d] = dateKey.split('-').map(Number)
  return String(d || '')
}

function formatMonthShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const targetDate = new Date(y, m - 1, d)
  return targetDate.toLocaleDateString([], { month: 'short' }).toUpperCase()
}

function formatWeekday(dateKey: string): string {
  try {
    const [y, m, d] = dateKey.split('-').map(Number)
    if (!y || !m || !d) return ''
    const targetDate = new Date(y, m - 1, d)
    return targetDate.toLocaleDateString([], { weekday: 'long' })
  } catch {
    return ''
  }
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatTimeOnly(timestamp: number): string {
  if (!timestamp) return ''
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function DateMediaList({
  dates,
  loading,
  permissionGranted,
  onRequestPermission,
  onSelectFiles,
  onPreviewItem,
  onOpenZipModal,
}: DateMediaListProps) {
  const [openMenuDateKey, setOpenMenuDateKey] = useState<string | null>(null)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  const toggleExpand = (dateKey: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        <p className="mt-3 text-sm text-[var(--muted)]">Gathering dates from phone media…</p>
      </div>
    )
  }

  if (dates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center">
        <Calendar size={34} className="text-[var(--muted)]" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-[var(--foreground)]">No media dates found</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--muted)] leading-relaxed">
          {!permissionGranted
            ? 'Grant storage permission to browse photos and videos on your phone by date.'
            : 'No media items discovered on your device yet.'}
        </p>
        <div className="mt-5 flex gap-3">
          {!permissionGranted ? (
            <button
              type="button"
              onClick={onRequestPermission}
              className="primary-button text-xs"
            >
              <ShieldCheck size={15} />
              <span>Grant permission</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSelectFiles}
              className="secondary-button text-xs"
            >
              Select files from phone
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3" onClick={() => { if (openMenuDateKey) setOpenMenuDateKey(null) }}>
      {dates.map((group) => {
        const isExpanded = expandedDates.has(group.dateKey)
        const isMenuOpen = openMenuDateKey === group.dateKey

        return (
          <div
            key={group.dateKey}
            className="surface-card p-4 transition-all hover:border-[var(--border-strong)]"
          >
            <div className="flex items-center justify-between gap-3">
              {/* Left: Date Badge + Title + Subtitle */}
              <button
                type="button"
                onClick={() => toggleExpand(group.dateKey)}
                className="flex items-center gap-3.5 min-w-0 flex-1 text-left"
              >
                <div className="flex flex-col items-center justify-center size-12 rounded-xl bg-[var(--surface-strong)] border border-[var(--border)] shrink-0 text-center select-none">
                  <span className="text-[10px] font-bold tracking-wider text-[var(--accent)]">
                    {formatMonthShort(group.dateKey)}
                  </span>
                  <span className="text-base font-semibold leading-none text-[var(--foreground)]">
                    {formatDayNumber(group.dateKey)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[var(--accent-soft)]/80 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
                      {formatWeekday(group.dateKey)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)] truncate">
                    {group.items.length} {group.items.length === 1 ? 'item' : 'items'} ·{' '}
                    {group.photos.length} photos, {group.videos.length} videos ·{' '}
                    {formatBytes(group.totalBytes)}
                  </p>
                </div>
              </button>

              {/* Right: Expand Toggle + 3-dots Menu Button */}
              <div className="flex items-center gap-1 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => toggleExpand(group.dateKey)}
                  aria-label={isExpanded ? 'Collapse media' : 'Expand media'}
                  className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] transition"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => setOpenMenuDateKey(isMenuOpen ? null : group.dateKey)}
                  aria-label={`Options for ${group.shortDate}`}
                  className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--accent)] transition"
                >
                  <MoreVertical size={16} />
                </button>

                {/* 3-dots popup menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuDateKey(null)
                        onOpenZipModal(group.dateKey, group.shortDate, group.items)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition"
                    >
                      <Package size={15} className="text-[var(--accent)] shrink-0" />
                      <div>
                        <span>Compress to ZIP</span>
                        <p className="text-[10px] text-[var(--muted)]">Package items from this date</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuDateKey(null)
                        toggleExpand(group.dateKey)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] transition border-t border-[var(--border)] mt-1 pt-1.5"
                    >
                      <ImageIcon size={14} className="shrink-0" />
                      <span>{isExpanded ? 'Hide photos & videos' : 'Preview thumbnails'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Expanded Inline Thumbnails */}
            {isExpanded && (
              <div className="mt-4 pt-3.5 border-t border-[var(--border)]">
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onPreviewItem(item, group.items)}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-left transition hover:border-[var(--accent)]"
                    >
                      {item.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          loading="lazy"
                          className="size-full object-cover transition duration-200 group-hover:scale-105"
                        />
                      ) : item.type === 'video' ? (
                        <div className="flex size-full items-center justify-center text-[var(--accent)]">
                          <Video size={22} />
                        </div>
                      ) : (
                        <div className="flex size-full items-center justify-center text-[var(--muted)]">
                          <ImageIcon size={22} />
                        </div>
                      )}

                      {item.type === 'video' && (
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-sm bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
                          <Play size={8} className="fill-white" />
                          <span>{formatDuration(item.duration)}</span>
                        </div>
                      )}

                      <div className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
                        <Maximize2 size={10} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

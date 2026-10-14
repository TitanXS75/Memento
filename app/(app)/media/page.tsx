'use client'

import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  HardDrive,
  Image as ImageIcon,
  Info,
  Maximize2,
  MoreVertical,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addWebMediaItems,
  checkMediaPermission,
  getDeviceMedia,
  requestMediaPermission,
  type DeviceMediaItem,
  type MediaPermissionStatus,
} from '@/lib/services/media'
import { formatBytes } from '@/lib/services/hash'
import { useUiStore } from '@/lib/store/ui'
import { DateMediaList, type MediaDateGroup } from '@/components/app/DateMediaList'
import { DateZipModal } from '@/components/app/DateZipModal'

type DateFilterPreset = 'all' | 'today' | 'week' | 'month' | 'custom'

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatDateFull(timestamp: number): string {
  if (!timestamp) return ''
  try {
    return new Date(timestamp).toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
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

function getDateKey(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const targetDate = new Date(y, m - 1, d)
  const now = new Date()

  const todayKey = getDateKey(now.getTime())
  const yesterdayKey = getDateKey(now.getTime() - 86400000)

  if (dateKey === todayKey) return 'Today'
  if (dateKey === yesterdayKey) return 'Yesterday'

  return targetDate.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: targetDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function formatDayMonthOnly(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const targetDate = new Date(y, m - 1, d)
  return targetDate.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  })
}

function formatShortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const targetDate = new Date(y, m - 1, d)
  return targetDate.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatResolution(width?: number, height?: number): string | null {
  if (!width || !height) return null
  const mp = ((width * height) / 1000000).toFixed(1)
  return `${width} × ${height} (${mp} MP)`
}

export default function MediaPage() {
  const { addToast } = useUiStore()
  const [viewMode, setViewMode] = useState<'dates' | 'grid'>('dates')
  const [activeBlock, setActiveBlock] = useState<'images' | 'videos'>('images')
  const [images, setImages] = useState<DeviceMediaItem[]>([])
  const [videos, setVideos] = useState<DeviceMediaItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [permission, setPermission] = useState<MediaPermissionStatus>({
    granted: false,
    status: 'prompt',
  })
  const [previewItem, setPreviewItem] = useState<DeviceMediaItem | null>(null)
  const [activeZipDate, setActiveZipDate] = useState<{
    dateKey: string
    dateLabel: string
    items: DeviceMediaItem[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Date filtering state
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showFilterBar, setShowFilterBar] = useState<boolean>(false)

  const loadMedia = async () => {
    setLoading(true)
    try {
      const perm = await checkMediaPermission()
      setPermission(perm)

      if (perm.granted) {
        const media = await getDeviceMedia('all', 200)
        // Sort chronologically (newest first)
        const sortedImages = [...media.images].sort((a, b) => b.date - a.date)
        const sortedVideos = [...media.videos].sort((a, b) => b.date - a.date)
        setImages(sortedImages)
        setVideos(sortedVideos)
      }
    } catch (err) {
      console.error('Failed to load media:', err)
      addToast('Could not load device media', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
  }, [])

  const handleRequestPermission = async () => {
    const res = await requestMediaPermission()
    setPermission(res)
    if (res.granted) {
      addToast('Media permission granted!', 'success')
      await loadMedia()
    } else {
      addToast('Media access was not granted.', 'info')
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const added = await addWebMediaItems(e.target.files)
    if (added.length > 0) {
      addToast(`Added ${added.length} media item(s)`, 'success')
      await loadMedia()
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const sourceItems = activeBlock === 'images' ? images : videos

  // Apply Date Filter
  const filteredItems = useMemo(() => {
    if (dateFilter === 'all') return sourceItems

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    if (dateFilter === 'today') {
      return sourceItems.filter((item) => item.date >= startOfToday)
    }

    if (dateFilter === 'week') {
      const sevenDaysAgo = startOfToday - 7 * 86400000
      return sourceItems.filter((item) => item.date >= sevenDaysAgo)
    }

    if (dateFilter === 'month') {
      const thirtyDaysAgo = startOfToday - 30 * 86400000
      return sourceItems.filter((item) => item.date >= thirtyDaysAgo)
    }

    if (dateFilter === 'custom') {
      let filtered = sourceItems
      if (customStartDate) {
        const startTimestamp = new Date(customStartDate + 'T00:00:00').getTime()
        filtered = filtered.filter((item) => item.date >= startTimestamp)
      }
      if (customEndDate) {
        const endTimestamp = new Date(customEndDate + 'T23:59:59').getTime()
        filtered = filtered.filter((item) => item.date <= endTimestamp)
      }
      return filtered
    }

    return sourceItems
  }, [sourceItems, dateFilter, customStartDate, customEndDate])

  // Arrange properly by Date groups
  const groupedByDate = useMemo(() => {
    const groups: { dateKey: string; label: string; items: DeviceMediaItem[]; totalBytes: number }[] = []
    const map = new Map<string, DeviceMediaItem[]>()

    filteredItems.forEach((item) => {
      const key = getDateKey(item.date)
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(item)
    })

    const sortedKeys = Array.from(map.keys()).sort().reverse()
    sortedKeys.forEach((key) => {
      const items = map.get(key)!
      const totalBytes = items.reduce((acc, it) => acc + (it.size || 0), 0)
      groups.push({
        dateKey: key,
        label: formatDateHeader(key),
        items,
        totalBytes,
      })
    })

    return groups
  }, [filteredItems])

  const allDeviceItems = useMemo(() => {
    return [...images, ...videos].sort((a, b) => b.date - a.date)
  }, [images, videos])

  const allDatesList = useMemo<MediaDateGroup[]>(() => {
    const map = new Map<string, DeviceMediaItem[]>()
    allDeviceItems.forEach((item) => {
      const key = getDateKey(item.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, dateItems]) => {
        const photos = dateItems.filter((i) => i.type === 'photo')
        const vids = dateItems.filter((i) => i.type === 'video')
        const totalBytes = dateItems.reduce((acc, it) => acc + (it.size || 0), 0)
        return {
          dateKey,
          shortDate: formatDayMonthOnly(dateKey),
          fullDate: formatShortDate(dateKey),
          headerLabel: formatDateHeader(dateKey),
          items: dateItems,
          photos,
          videos: vids,
          totalBytes,
        }
      })
  }, [allDeviceItems])

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 sm:pb-4">
        <div>
          <p className="eyebrow">Device storage</p>
          <h1 className="mt-1 font-sans text-3xl sm:text-4xl">Media library</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilterBar(!showFilterBar)}
            aria-label="Filter by date"
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              dateFilter !== 'all' || showFilterBar
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)]'
            }`}
          >
            <Filter size={13} aria-hidden="true" />
            <span>Dates</span>
            {dateFilter !== 'all' && (
              <span className="size-1.5 rounded-full bg-white" />
            )}
          </button>
          <button
            type="button"
            onClick={loadMedia}
            disabled={loading}
            aria-label="Refresh media library"
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[var(--accent)]' : ''} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
          >
            <Plus size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Select files</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      <div className="module-enter mt-3 space-y-5">
        {/* Permission Request Banner (if not granted) */}
        {!permission.granted && (
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--coral)]/30 bg-[var(--coral)]/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--coral)]/15 text-[var(--coral)]">
                <AlertCircle size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Phone media permission needed
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                  Memento needs access to your photos and videos to arrange your memories chronologically and share them offline.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestPermission}
              className="primary-button shrink-0 justify-center text-xs"
            >
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Grant permission</span>
            </button>
          </div>
        )}

        {/* View Mode Switcher: Dates View vs Media Grid */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('dates')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition ${
                viewMode === 'dates'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Calendar size={13} />
              <span>Dates View</span>
              <span className="rounded-full bg-black/15 dark:bg-white/15 px-1.5 py-0.2 text-[10px]">
                {allDatesList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition ${
                viewMode === 'grid'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <ImageIcon size={13} />
              <span>Media Grid</span>
              <span className="rounded-full bg-black/15 dark:bg-white/15 px-1.5 py-0.2 text-[10px]">
                {images.length + videos.length}
              </span>
            </button>
          </div>

          <p className="hidden sm:block text-xs text-[var(--muted)]">
            {viewMode === 'dates'
              ? 'Organized by dates · Convert any date to ZIP'
              : 'Category browsing · Original phone files'}
          </p>
        </div>

        {viewMode === 'dates' ? (
          <DateMediaList
            dates={allDatesList}
            loading={loading}
            permissionGranted={permission.granted}
            onRequestPermission={handleRequestPermission}
            onSelectFiles={() => fileInputRef.current?.click()}
            onPreviewItem={(item) => setPreviewItem(item)}
            onOpenZipModal={(dateKey, dateLabel, items) => {
              setActiveZipDate({ dateKey, dateLabel, items })
            }}
          />
        ) : (
          <div className="space-y-5">
            {/* Two Interactive Category Blocks: Images & Videos */}
            <div className="grid grid-cols-2 gap-4">
              {/* Images Block */}
              <button
                type="button"
                onClick={() => setActiveBlock('images')}
                className={`flex flex-col items-start rounded-2xl border p-4 sm:p-5 text-left transition-all ${
                  activeBlock === 'images'
                    ? 'border-[var(--accent)] bg-[var(--surface-strong)] shadow-xs ring-1 ring-[var(--accent)]/30'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl transition ${
                      activeBlock === 'images'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface-strong)] text-[var(--muted)]'
                    }`}
                  >
                    <ImageIcon size={20} aria-hidden="true" />
                  </div>
                  {activeBlock === 'images' && (
                    <CheckCircle2 size={16} className="text-[var(--accent)]" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-3.5 font-sans text-xl sm:text-2xl font-normal text-[var(--foreground)]">
                  Images
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {loading ? 'Checking…' : `${images.length} ${images.length === 1 ? 'photo' : 'photos'}`}
                </p>
              </button>

              {/* Videos Block */}
              <button
                type="button"
                onClick={() => setActiveBlock('videos')}
                className={`flex flex-col items-start rounded-2xl border p-4 sm:p-5 text-left transition-all ${
                  activeBlock === 'videos'
                    ? 'border-[var(--accent)] bg-[var(--surface-strong)] shadow-xs ring-1 ring-[var(--accent)]/30'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl transition ${
                      activeBlock === 'videos'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface-strong)] text-[var(--muted)]'
                    }`}
                  >
                    <Video size={20} aria-hidden="true" />
                  </div>
                  {activeBlock === 'videos' && (
                    <CheckCircle2 size={16} className="text-[var(--accent)]" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-3.5 font-sans text-xl sm:text-2xl font-normal text-[var(--foreground)]">
                  Videos
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {loading ? 'Checking…' : `${videos.length} ${videos.length === 1 ? 'video' : 'videos'}`}
                </p>
              </button>
            </div>

            {/* Date Filter Bar */}
            {(showFilterBar || dateFilter !== 'all') && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)]">
                    <Calendar size={14} className="text-[var(--accent)]" />
                    <span>Filter by capture date</span>
                  </div>
                  {dateFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('all')
                        setCustomStartDate('')
                        setCustomEndDate('')
                      }}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:border-[var(--coral)] hover:text-[var(--coral)] transition"
                    >
                      Reset filter
                    </button>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'All dates' },
                      { id: 'today', label: 'Today' },
                      { id: 'week', label: 'Past 7 days' },
                      { id: 'month', label: 'Past 30 days' },
                      { id: 'custom', label: 'Custom range…' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDateFilter(id)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        dateFilter === id
                          ? 'bg-[var(--accent)] text-white font-medium'
                          : 'bg-[var(--surface-strong)] text-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Custom Range Inputs */}
                {dateFilter === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-3 pt-2">
                    <label className="text-[11px] text-[var(--muted)]">
                      Start Date
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="field mt-1 text-xs"
                      />
                    </label>
                    <label className="text-[11px] text-[var(--muted)]">
                      End Date
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="field mt-1 text-xs"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Media Grid Arranged Properly by Dates */}
            <div>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <RefreshCw size={26} className="animate-spin text-[var(--accent)]" />
                  <p className="mt-3 text-sm text-[var(--muted)]">Reading photo & video details…</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center">
                  {activeBlock === 'images' ? (
                    <ImageIcon size={32} className="text-[var(--muted)]" aria-hidden="true" />
                  ) : (
                    <Video size={32} className="text-[var(--muted)]" aria-hidden="true" />
                  )}
                  <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                    {activeBlock === 'images' ? 'No images found' : 'No videos found'}
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-[var(--muted)] leading-relaxed">
                    {!permission.granted
                      ? 'Grant storage permission to view media stored on your phone.'
                      : dateFilter !== 'all'
                      ? 'No items found matching the selected date filter.'
                      : `No ${activeBlock} discovered on device storage yet.`}
                  </p>
                  <div className="mt-4 flex gap-3">
                    {!permission.granted ? (
                      <button
                        type="button"
                        onClick={handleRequestPermission}
                        className="primary-button text-xs"
                      >
                        Grant permission
                      </button>
                    ) : dateFilter !== 'all' ? (
                      <button
                        type="button"
                        onClick={() => setDateFilter('all')}
                        className="secondary-button text-xs"
                      >
                        Clear date filter
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="secondary-button text-xs"
                      >
                        Select files
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedByDate.map((group) => (
                    <section key={group.dateKey} className="space-y-3">
                      {/* Date Section Header */}
                      <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-1.5">
                        <div className="flex items-baseline gap-2">
                          <h2 className="text-sm font-medium text-[var(--foreground)]">
                            {group.label}
                          </h2>
                          <span className="text-[11px] text-[var(--muted)]">
                            {group.dateKey}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--muted)]">
                            {group.items.length} {group.items.length === 1 ? 'item' : 'items'} • {formatBytes(group.totalBytes)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveZipDate({
                                dateKey: group.dateKey,
                                dateLabel: group.label,
                                items: group.items,
                              })
                            }
                            title={`Make ZIP for ${group.label}`}
                            className="rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--accent)] transition"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Photos / Videos Grid for this date */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[var(--accent)] hover:shadow-xs"
                          >
                            {/* Thumbnail / Media Container */}
                            <div className="relative aspect-square w-full overflow-hidden bg-[var(--surface-strong)]">
                              {item.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.thumbnail}
                                  alt={item.name}
                                  loading="lazy"
                                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : item.type === 'video' ? (
                                <div className="flex size-full items-center justify-center bg-[var(--surface-strong)] text-[var(--accent)]">
                                  <Video size={30} aria-hidden="true" />
                                </div>
                              ) : (
                                <div className="flex size-full items-center justify-center bg-[var(--surface-strong)] text-[var(--muted)]">
                                  <ImageIcon size={30} aria-hidden="true" />
                                </div>
                              )}

                              {/* Video Duration Badge */}
                              {item.type === 'video' && (
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                                  <Play size={10} className="fill-white" aria-hidden="true" />
                                  <span>{formatDuration(item.duration)}</span>
                                </div>
                              )}

                              {/* Hover action icon */}
                              <div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
                                <Maximize2 size={12} />
                              </div>
                            </div>

                            {/* Metadata Bar */}
                            <div className="p-2.5">
                              <p className="truncate text-xs font-medium text-[var(--foreground)]" title={item.name}>
                                {item.name}
                              </p>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--muted)]">
                                <span>{formatBytes(item.size)}</span>
                                <span>{formatTimeOnly(item.date)}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Media Detail & Preview Modal */}
      {previewItem && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewItem(null)
          }}
        >
          <div
            className="modal-card max-w-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-preview-title"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="min-w-0 pr-3">
                <p className="eyebrow">{previewItem.type === 'photo' ? 'Photo Details' : 'Video Details'}</p>
                <h3 id="media-preview-title" className="truncate font-sans text-xl">
                  {previewItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                aria-label="Close preview"
                className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface-strong)] transition"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Media Image / Video Preview */}
            <div className="mt-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-black/30">
              {previewItem.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewItem.thumbnail}
                  alt={previewItem.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[var(--muted)]">
                  {previewItem.type === 'photo' ? <ImageIcon size={36} /> : <Video size={36} />}
                  <span className="text-xs">Original media on phone storage</span>
                </div>
              )}
            </div>

            {/* Detailed Metadata Grid */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl bg-[var(--surface-strong)] p-3 text-xs">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="shrink-0 text-[var(--accent)]" />
                <span className="text-[var(--muted)]">Date:</span>
                <span className="truncate font-medium text-[var(--foreground)]">{formatDateFull(previewItem.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={13} className="shrink-0 text-[var(--accent)]" />
                <span className="text-[var(--muted)]">Time:</span>
                <span className="font-medium text-[var(--foreground)]">{formatTimeOnly(previewItem.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive size={13} className="shrink-0 text-[var(--accent)]" />
                <span className="text-[var(--muted)]">Size:</span>
                <span className="font-medium text-[var(--foreground)]">{formatBytes(previewItem.size)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Info size={13} className="shrink-0 text-[var(--accent)]" />
                <span className="text-[var(--muted)]">Format:</span>
                <span className="truncate font-medium uppercase text-[var(--foreground)]">
                  {previewItem.mimeType ? previewItem.mimeType.split('/')[1] : previewItem.type}
                </span>
              </div>
              {previewItem.width && previewItem.height ? (
                <div className="col-span-2 flex items-center gap-2 border-t border-[var(--border)] pt-2">
                  <Maximize2 size={13} className="shrink-0 text-[var(--accent)]" />
                  <span className="text-[var(--muted)]">Resolution:</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {formatResolution(previewItem.width, previewItem.height)}
                  </span>
                </div>
              ) : null}
              {previewItem.duration ? (
                <div className="col-span-2 flex items-center gap-2 border-t border-[var(--border)] pt-2">
                  <Play size={13} className="shrink-0 text-[var(--accent)]" />
                  <span className="text-[var(--muted)]">Duration:</span>
                  <span className="font-medium text-[var(--foreground)]">{formatDuration(previewItem.duration)}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="secondary-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date ZIP Export Modal */}
      {activeZipDate && (
        <DateZipModal
          isOpen={!!activeZipDate}
          onClose={() => setActiveZipDate(null)}
          dateKey={activeZipDate.dateKey}
          dateLabel={activeZipDate.dateLabel}
          items={activeZipDate.items}
        />
      )}
    </>
  )
}

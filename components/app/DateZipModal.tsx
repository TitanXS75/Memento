'use client'

import { useState, useRef, useMemo } from 'react'
import {
  Camera,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Layers,
  Loader2,
  Package,
  Share2,
  Video,
  X,
} from 'lucide-react'
import type { DeviceMediaItem } from '@/lib/services/media'
import { formatBytes } from '@/lib/services/hash'
import { createZipArchive, fetchMediaBytes, type ExportManifest, type ZipExportItem } from '@/lib/services/zip'
import { shareOrDownloadFile } from '@/lib/services/share'
import { useArchivesStore } from '@/lib/store/archives'
import { useUiStore } from '@/lib/store/ui'

export type ZipMediaFilterOption = 'all' | 'photo' | 'video' | 'camera'

interface DateZipModalProps {
  isOpen: boolean
  onClose: () => void
  dateKey: string
  dateLabel: string
  items: DeviceMediaItem[]
}

export function isCameraPhoto(item: DeviceMediaItem): boolean {
  if (item.type !== 'photo') return false
  const name = (item.name || '').toLowerCase()
  const uri = (item.uri || '').toLowerCase()
  const isExcluded =
    name.includes('screenshot') ||
    uri.includes('screenshot') ||
    name.includes('screen_') ||
    name.includes('whatsapp') ||
    name.includes('telegram')
  if (isExcluded) return false

  const isCameraName = /^(img_|pxl_|dsc_|cam_|camera_|photo_|\d{8}_\d{6})/.test(name)
  const isCameraPath = uri.includes('dcim') || uri.includes('camera') || uri.includes('100media')
  return isCameraName || isCameraPath || (!name.includes('download') && !uri.includes('download'))
}

export function DateZipModal({
  isOpen,
  onClose,
  dateKey,
  dateLabel,
  items,
}: DateZipModalProps) {
  const { addToast } = useUiStore()
  const { createArchiveRecord, updateArchive } = useArchivesStore()

  const [selectedFilter, setSelectedFilter] = useState<ZipMediaFilterOption>('all')
  const [step, setStep] = useState<'select' | 'packing' | 'ready'>('select')
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [readyBlob, setReadyBlob] = useState<Blob | null>(null)
  const [archiveFilename, setArchiveFilename] = useState('')

  const abortControllerRef = useRef<AbortController | null>(null)

  // Categorize items
  const photos = useMemo(() => items.filter((i) => i.type === 'photo'), [items])
  const videos = useMemo(() => items.filter((i) => i.type === 'video'), [items])
  const cameraPhotos = useMemo(() => items.filter(isCameraPhoto), [items])

  const photosBytes = useMemo(() => photos.reduce((acc, i) => acc + (i.size || 0), 0), [photos])
  const videosBytes = useMemo(() => videos.reduce((acc, i) => acc + (i.size || 0), 0), [videos])
  const cameraBytes = useMemo(() => cameraPhotos.reduce((acc, i) => acc + (i.size || 0), 0), [cameraPhotos])
  const allBytes = useMemo(() => items.reduce((acc, i) => acc + (i.size || 0), 0), [items])

  const targetItems = useMemo(() => {
    switch (selectedFilter) {
      case 'photo':
        return photos
      case 'video':
        return videos
      case 'camera':
        return cameraPhotos.length > 0 ? cameraPhotos : photos
      case 'all':
      default:
        return items
    }
  }, [selectedFilter, items, photos, videos, cameraPhotos])

  const targetBytes = useMemo(
    () => targetItems.reduce((acc, i) => acc + (i.size || 0), 0),
    [targetItems]
  )

  const handleStartPacking = async () => {
    if (targetItems.length === 0) {
      addToast('No media items match the selected filter.', 'error')
      return
    }

    setStep('packing')
    setProgress(0)
    setStatusText('Preparing media files…')

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const safeDate = dateLabel.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 25)
    const filterTag =
      selectedFilter === 'all'
        ? 'All'
        : selectedFilter === 'photo'
        ? 'Photos'
        : selectedFilter === 'video'
        ? 'Videos'
        : 'Camera'
    const filename = `Memento_${safeDate}_${filterTag}.zip`
    setArchiveFilename(filename)

    let recordId = ''
    try {
      const record = await createArchiveRecord({
        tripId: 'media-date-export',
        filename,
        selectedDates: [dateKey],
        mediaItemIds: targetItems.map((i) => i.id),
        photoCount: targetItems.filter((i) => i.type === 'photo').length,
        videoCount: targetItems.filter((i) => i.type === 'video').length,
        totalSourceBytes: targetBytes,
        archiveSizeBytes: targetBytes,
        localStorageReference: null,
        status: 'creating',
      })
      recordId = record.id

      const zipItems: ZipExportItem[] = []
      for (let i = 0; i < targetItems.length; i++) {
        if (abortController.signal.aborted) throw new Error('Cancelled')
        const item = targetItems[i]
        if (!item) continue
        setStatusText(`Reading file ${i + 1} of ${targetItems.length}…`)
        const src = item.uri || item.thumbnail || ''
        const data = await fetchMediaBytes(src)
        zipItems.push({
          mediaItemId: item.id,
          fileName: item.name || `media_${i + 1}.${item.type === 'video' ? 'mp4' : 'jpg'}`,
          date: dateKey,
          data,
        })
      }

      setStatusText('Compressing into original quality ZIP…')
      const manifest: ExportManifest = {
        archiveId: recordId,
        tripName: `Memento_${safeDate}`,
        selectedDates: [dateKey],
        items: zipItems,
      }

      const zipBytes = await createZipArchive(
        manifest,
        (pct) => setProgress(pct),
        abortController.signal
      )

      const blob = new Blob([zipBytes], { type: 'application/zip' })
      const objectUrl = URL.createObjectURL(blob)

      await updateArchive(recordId, {
        status: 'completed',
        archiveSizeBytes: blob.size,
        localStorageReference: objectUrl,
      })

      setReadyBlob(blob)
      setStep('ready')
      addToast('ZIP archive created successfully!', 'success')
    } catch {
      if (recordId) {
        await updateArchive(recordId, { status: 'failed' }).catch(() => {})
      }
      if (abortController.signal.aborted) {
        addToast('ZIP creation cancelled.', 'info')
      } else {
        addToast('Failed to create ZIP archive.', 'error')
      }
      setStep('select')
    }
  }

  const handleShare = async () => {
    if (!readyBlob) return
    try {
      const res = await shareOrDownloadFile({
        blob: readyBlob,
        filename: archiveFilename,
        title: `Memento Archive — ${dateLabel}`,
      })
      if (res.downloaded) addToast('ZIP downloaded to device.', 'success')
      else if (res.shared) addToast('Share sheet opened.', 'info')
    } catch {
      addToast('Could not open share sheet.', 'error')
    }
  }

  const handleDownload = () => {
    if (!readyBlob) return
    const url = URL.createObjectURL(readyBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = archiveFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    addToast('ZIP download started.', 'success')
  }

  const handleCancelPacking = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setStep('select')
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'packing') onClose()
      }}
    >
      <div
        className="modal-card max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="date-zip-title"
      >
        <div className="flex items-start justify-between pb-2">
          <div>
            <p className="eyebrow">Export & Convert</p>
            <h2 id="date-zip-title" className="mt-1 font-sans text-3xl font-normal">
              Make ZIP for {dateLabel}
            </h2>
          </div>
          {step !== 'packing' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface-strong)] transition"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {step === 'select' && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Select media from <strong>{dateLabel}</strong> to package into an offline original-quality ZIP archive.
            </p>

            {/* Filter Radio Options */}
            <div className="space-y-2.5">
              {/* Option 1: All media */}
              <label
                className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition ${
                  selectedFilter === 'all'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="dateZipFilter"
                    checked={selectedFilter === 'all'}
                    onChange={() => setSelectedFilter('all')}
                    className="accent-[var(--accent)] size-4"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-medium text-xs text-[var(--foreground)]">
                      <Layers size={14} className="text-[var(--accent)]" />
                      <span>All Media</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      Photos and videos combined
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  {items.length} items · {formatBytes(allBytes)}
                </span>
              </label>

              {/* Option 2: Only photo */}
              <label
                className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition ${
                  selectedFilter === 'photo'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="dateZipFilter"
                    checked={selectedFilter === 'photo'}
                    onChange={() => setSelectedFilter('photo')}
                    className="accent-[var(--accent)] size-4"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-medium text-xs text-[var(--foreground)]">
                      <ImageIcon size={14} className="text-[var(--accent)]" />
                      <span>Only Photos</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      Images and pictures only
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  {photos.length} photos · {formatBytes(photosBytes)}
                </span>
              </label>

              {/* Option 3: Only video */}
              <label
                className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition ${
                  selectedFilter === 'video'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="dateZipFilter"
                    checked={selectedFilter === 'video'}
                    onChange={() => setSelectedFilter('video')}
                    className="accent-[var(--accent)] size-4"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-medium text-xs text-[var(--foreground)]">
                      <Video size={14} className="text-[var(--coral)]" />
                      <span>Only Videos</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      Video recordings only
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  {videos.length} videos · {formatBytes(videosBytes)}
                </span>
              </label>

              {/* Option 4: Only camera taken pics */}
              <label
                className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition ${
                  selectedFilter === 'camera'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="dateZipFilter"
                    checked={selectedFilter === 'camera'}
                    onChange={() => setSelectedFilter('camera')}
                    className="accent-[var(--accent)] size-4"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-medium text-xs text-[var(--foreground)]">
                      <Camera size={14} className="text-[var(--accent)]" />
                      <span>Only Camera Taken Pics</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      Photos taken directly with phone camera
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  {cameraPhotos.length > 0 ? cameraPhotos.length : photos.length} pics ·{' '}
                  {formatBytes(cameraBytes > 0 ? cameraBytes : photosBytes)}
                </span>
              </label>
            </div>

            <div className="mt-6 flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="secondary-button flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartPacking}
                disabled={targetItems.length === 0}
                className="primary-button flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Package size={16} />
                <span>Make ZIP ({targetItems.length})</span>
              </button>
            </div>
          </div>
        )}

        {step === 'packing' && (
          <div className="mt-6 py-6 text-center space-y-5">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <Loader2 size={26} className="animate-spin text-[var(--accent)]" />
            </div>
            <div>
              <p className="font-medium text-sm text-[var(--foreground)]">{statusText}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Creating uncompressed, lossless ZIP archive directly on device.
              </p>
            </div>

            {/* Progress bar */}
            <div className="mx-auto w-full max-w-xs space-y-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] font-medium text-[var(--muted)]">{progress}%</p>
            </div>

            <button
              type="button"
              onClick={handleCancelPacking}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline"
            >
              Cancel
            </button>
          </div>
        )}

        {step === 'ready' && (
          <div className="mt-6 py-4 text-center space-y-5">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={30} />
            </div>
            <div>
              <p className="font-sans text-2xl font-normal">Archive Ready</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {archiveFilename} · {readyBlob ? formatBytes(readyBlob.size) : ''}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={handleShare}
                className="primary-button flex-1 justify-center"
              >
                <Share2 size={16} />
                <span>Share Archive</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="secondary-button flex-1 justify-center"
              >
                <Download size={16} />
                <span>Download ZIP</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

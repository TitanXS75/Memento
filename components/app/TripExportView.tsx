'use client'

import { ArrowLeft, Loader2, Package, XCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ExportStepDateMedia } from '@/components/app/ExportStepDateMedia'
import { ExportStepReview } from '@/components/app/ExportStepReview'
import type { MediaItem } from '@/lib/db/schema'
import { getTripMediaItems } from '@/lib/services/media'
import { buildArchiveFilename, createZipArchive, fetchMediaBytes, type ExportManifest, type ZipExportItem } from '@/lib/services/zip'
import { useArchivesStore } from '@/lib/store/archives'
import { useTripsStore } from '@/lib/store/trips'
import { useUiStore } from '@/lib/store/ui'

interface TripExportViewProps {
  id: string
}

function getDateKey(iso: string): string {
  try {
    return iso.split('T')[0] ?? iso.slice(0, 10)
  } catch {
    return 'Other'
  }
}

export function TripExportView({ id }: TripExportViewProps) {
  const { trips, loadTrips } = useTripsStore(useShallow((s) => ({ trips: s.trips, loadTrips: s.loadTrips })))
  const { createArchiveRecord, updateArchive } = useArchivesStore()
  const { addToast } = useUiStore()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'photo' | 'video'>('all')

  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [readyBlob, setReadyBlob] = useState<Blob | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => { loadTrips() }, [loadTrips])
  const trip = trips.find((t) => t.id === id)

  const loadMedia = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const items = await getTripMediaItems(id)
      setMediaItems(items)
      const dates = new Set<string>()
      items.forEach((it) => dates.add(getDateKey(it.capturedAt)))
      setSelectedDates(dates)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadMedia() }, [loadMedia])

  const dateGroups = useMemo(() => {
    const map = new Map<string, MediaItem[]>()
    mediaItems.forEach((it) => {
      const key = getDateKey(it.capturedAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(it)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [mediaItems])

  const exportableItems = useMemo(() => {
    return mediaItems.filter((item) => {
      const dateKey = getDateKey(item.capturedAt)
      if (!selectedDates.has(dateKey)) return false
      if (mediaTypeFilter !== 'all' && item.mediaType !== mediaTypeFilter) return false
      return true
    })
  }, [mediaItems, selectedDates, mediaTypeFilter])

  const filename = useMemo(() => {
    if (!trip) return 'archive.zip'
    return buildArchiveFilename(trip.name, Array.from(selectedDates))
  }, [trip, selectedDates])

  const totalBytes = useMemo(() => {
    return exportableItems.reduce((acc, it) => acc + it.sizeBytes, 0)
  }, [exportableItems])

  const handleStartPacking = async () => {
    if (!trip || exportableItems.length === 0) return
    setStep(4)
    setProgress(0)
    setStatusMessage('Reading media files…')
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const archiveRecord = await createArchiveRecord({
      tripId: trip.id,
      filename,
      selectedDates: Array.from(selectedDates),
      mediaItemIds: exportableItems.map((it) => it.id),
      photoCount: exportableItems.filter((m) => m.mediaType === 'photo').length,
      videoCount: exportableItems.filter((m) => m.mediaType === 'video').length,
      totalSourceBytes: totalBytes,
      archiveSizeBytes: null,
      localStorageReference: null,
      status: 'creating',
    })

    try {
      const zipItems: ZipExportItem[] = []
      for (let i = 0; i < exportableItems.length; i++) {
        if (abortController.signal.aborted) throw new Error('Cancelled')
        const item = exportableItems[i]
        if (!item) continue
        setStatusMessage(`Reading item ${i + 1} of ${exportableItems.length}…`)
        const src = item.localStorageReference || item.thumbnailUri || ''
        const data = await fetchMediaBytes(src)
        zipItems.push({
          mediaItemId: item.id,
          fileName: item.filename,
          date: getDateKey(item.capturedAt),
          data,
        })
      }

      setStatusMessage('Compressing into ZIP…')
      const manifest: ExportManifest = {
        archiveId: archiveRecord.id,
        tripName: trip.name,
        selectedDates: Array.from(selectedDates),
        items: zipItems,
      }

      const zipBytes = await createZipArchive(manifest, (pct) => setProgress(pct), abortController.signal)
      const blob = new Blob([zipBytes], { type: 'application/zip' })
      const objectUrl = URL.createObjectURL(blob)

      await updateArchive(archiveRecord.id, {
        status: 'completed',
        archiveSizeBytes: blob.size,
        localStorageReference: objectUrl,
      })

      setReadyBlob(blob)
      addToast('ZIP archive created successfully!', 'success')
    } catch {
      await updateArchive(archiveRecord.id, { status: 'failed' })
      addToast(abortController.signal.aborted ? 'Export cancelled.' : 'Failed to create ZIP.', 'info')
      setStep(3)
    }
  }

  if (!loading && trips.length > 0 && !trip) notFound()

  return (
    <>
      <Link href={`/trips/${id}`} className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={14} aria-hidden="true" /> Back to trip
      </Link>
      <div className="mt-5">
        <p className="eyebrow">Export & Share</p>
        <h1 className="mt-1 font-sans text-4xl">Package Trip Memories</h1>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--muted)]">Loading trip media…</div>
      ) : mediaItems.length === 0 ? (
        <div className="surface-card mt-8 flex flex-col items-center gap-4 py-16 text-center">
          <Package size={36} className="text-[var(--muted)]" />
          <p className="text-base font-medium">No media in this trip yet</p>
          <p className="max-w-xs text-xs text-[var(--muted)]">Add photos and videos to this trip before creating an export archive.</p>
          <Link href={`/trips/${id}`} className="primary-button text-xs">Back to trip gallery</Link>
        </div>
      ) : step === 4 ? (
        readyBlob ? (
          <ExportStepReview
            tripName={trip?.name || 'Trip'}
            filename={filename}
            photoCount={exportableItems.filter((m) => m.mediaType === 'photo').length}
            videoCount={exportableItems.filter((m) => m.mediaType === 'video').length}
            totalBytes={totalBytes}
            onStartPacking={() => {}}
            onBack={() => setStep(3)}
            readyBlob={readyBlob}
          />
        ) : (
          <div className="surface-card mt-8 flex flex-col items-center gap-5 p-8 text-center">
            <Loader2 size={36} className="animate-spin text-[var(--accent)]" />
            <div>
              <h2 className="font-sans text-2xl font-medium">Creating ZIP Archive</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">{statusMessage}</p>
            </div>
            <div className="w-full max-w-md">
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--surface-strong)]">
                <div className="h-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-right text-xs font-mono text-[var(--muted)]">{progress}%</p>
            </div>
            <button type="button" onClick={() => abortControllerRef.current?.abort()} className="secondary-button text-xs">
              <XCircle size={14} /> Cancel Packaging
            </button>
          </div>
        )
      ) : step === 3 ? (
        <ExportStepReview
          tripName={trip?.name || 'Trip'}
          filename={filename}
          photoCount={exportableItems.filter((m) => m.mediaType === 'photo').length}
          videoCount={exportableItems.filter((m) => m.mediaType === 'video').length}
          totalBytes={totalBytes}
          onStartPacking={handleStartPacking}
          onBack={() => setStep(2)}
          readyBlob={null}
        />
      ) : (
        <ExportStepDateMedia
          step={step as 1 | 2}
          dateGroups={dateGroups}
          selectedDates={selectedDates}
          onToggleDate={(dk) => {
            const next = new Set(selectedDates)
            if (next.has(dk)) next.delete(dk)
            else next.add(dk)
            setSelectedDates(next)
          }}
          onToggleAllDates={() => {
            setSelectedDates(selectedDates.size === dateGroups.length ? new Set() : new Set(dateGroups.map(([d]) => d)))
          }}
          mediaTypeFilter={mediaTypeFilter}
          onSelectMediaType={(f) => setMediaTypeFilter(f)}
          canProceed={selectedDates.size > 0 && exportableItems.length > 0}
          onNext={() => setStep((s) => (s + 1) as 2 | 3)}
          onBack={() => setStep((s) => (s - 1) as 1 | 2)}
        />
      )}
    </>
  )
}

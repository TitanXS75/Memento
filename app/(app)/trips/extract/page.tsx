'use client'

import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  FileArchive,
  FolderDown,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { formatBytes } from '@/lib/services/hash'
import {
  extractMediaFromZip,
  inspectZipBuffer,
  inspectZipFile,
  type ZipInspectionResult,
} from '@/lib/services/zip-extractor'
import { useArchivesStore } from '@/lib/store/archives'
import { useTripsStore } from '@/lib/store/trips'
import { useUiStore } from '@/lib/store/ui'

export default function ZipExtractorPage() {
  const router = useRouter()
  const { addToast } = useUiStore()
  const { trips, loadTrips, createTrip } = useTripsStore(
    useShallow((s) => ({
      trips: s.trips,
      loadTrips: s.loadTrips,
      createTrip: s.createTrip,
    }))
  )
  const { archives, loadArchives, deleteArchive } = useArchivesStore(
    useShallow((s) => ({
      archives: s.archives,
      loadArchives: s.loadArchives,
      deleteArchive: s.deleteArchive,
    }))
  )

  const [inspections, setInspections] = useState<ZipInspectionResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Selected archive for extraction
  const [selectedZip, setSelectedZip] = useState<ZipInspectionResult | null>(null)
  const [extractMode, setExtractMode] = useState<'new' | 'existing'>('new')
  const [newTripName, setNewTripName] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [selectedExistingTripId, setSelectedExistingTripId] = useState('')
  const [deleteAfterExtract, setDeleteAfterExtract] = useState(true)

  // Progress state
  const [isExtracting, setIsExtracting] = useState(false)
  const [progressPct, setProgressPct] = useState(0)
  const [currentFileName, setCurrentFileName] = useState('')
  const [completedTripId, setCompletedTripId] = useState<string | null>(null)
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    loadTrips()
    loadArchives()
  }, [loadTrips, loadArchives])

  // Automatically inspect any known Memento archives on storage
  useEffect(() => {
    if (archives.length === 0) return

    const loadKnownArchives = async () => {
      for (const arch of archives) {
        if (!arch.localStorageReference) continue
        const alreadyInList = inspections.some(
          (i) => i.archiveId === arch.id || i.fileName === arch.filename
        )
        if (alreadyInList) continue

        try {
          const res = await fetch(arch.localStorageReference)
          const buf = await res.arrayBuffer()
          const inspected = await inspectZipBuffer(arch.filename, new Uint8Array(buf), arch.id)
          setInspections((prev) => {
            if (prev.some((p) => p.archiveId === arch.id)) return prev
            return [inspected, ...prev]
          })
        } catch {
          // Ignore if reference is stale
        }
      }
    }

    loadKnownArchives()
  }, [archives, inspections])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsAnalyzing(true)

    try {
      const fileList = Array.from(files)
      for (const f of fileList) {
        if (!f.name.toLowerCase().endsWith('.zip') && f.type !== 'application/zip') {
          addToast(`"${f.name}" is not a valid ZIP file`, 'error')
          continue
        }

        try {
          const result = await inspectZipFile(f)
          setInspections((prev) => {
            const filtered = prev.filter((p) => p.fileName !== result.fileName)
            return [result, ...filtered]
          })

          // Auto-select if first ZIP
          if (!selectedZip) {
            handleSelectZip(result)
          }
        } catch (err) {
          console.error('Inspection failed for', f.name, err)
          addToast(`Could not read "${f.name}"`, 'error')
        }
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSelectZip = (zip: ZipInspectionResult) => {
    setSelectedZip(zip)
    setCompletedTripId(null)
    setCompletedCount(0)

    setNewTripName(
      zip.suggestedTripName ||
        zip.fileName
          .replace(/\.zip$/i, '')
          .replace(/[-_]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
    )

    const fallbackDate = new Date().toISOString().split('T')[0] || ''
    setNewStartDate(zip.suggestedStartDate || fallbackDate)
    setNewEndDate(zip.suggestedEndDate || fallbackDate)

    if (trips.length > 0 && !selectedExistingTripId) {
      setSelectedExistingTripId(trips[0]?.id ?? '')
    }
  }

  const handleStartExtraction = async () => {
    if (!selectedZip) return

    let targetTripId = selectedExistingTripId

    if (extractMode === 'new') {
      if (!newTripName.trim()) {
        addToast('Please enter a trip name', 'error')
        return
      }

      try {
        const todayFallback = new Date().toISOString().split('T')[0] ?? ''
        const created = await createTrip({
          name: newTripName.trim(),
          startDate: newStartDate || todayFallback,
          endDate: newEndDate || todayFallback,
          description: `Extracted from ${selectedZip.fileName}`,
        })
        targetTripId = created.id
      } catch (err) {
        console.error('Failed to create trip for extraction:', err)
        addToast('Failed to create target trip', 'error')
        return
      }
    }

    if (!targetTripId) {
      addToast('Please choose or create a destination trip', 'error')
      return
    }

    let buffer = selectedZip.rawBuffer
    if (!buffer && selectedZip.archiveId) {
      const arch = archives.find((a) => a.id === selectedZip.archiveId)
      if (arch?.localStorageReference) {
        try {
          const res = await fetch(arch.localStorageReference)
          buffer = new Uint8Array(await res.arrayBuffer())
        } catch {
          // ignore
        }
      }
    }

    if (!buffer) {
      addToast('ZIP buffer data is not available. Please re-select the ZIP file.', 'error')
      return
    }

    setIsExtracting(true)
    setProgressPct(0)
    setCurrentFileName('')

    try {
      const result = await extractMediaFromZip({
        buffer,
        inspection: selectedZip,
        tripId: targetTripId,
        onProgress: (pct: number, curFile: string) => {
          setProgressPct(pct)
          setCurrentFileName(curFile)
        },
      })

      setCompletedCount(result.count)
      setCompletedTripId(targetTripId)

      // Optionally delete the source archive if requested and registered in Memento
      if (deleteAfterExtract && selectedZip.archiveId) {
        try {
          await deleteArchive(selectedZip.archiveId)
          setInspections((prev) => prev.filter((p) => p.archiveId !== selectedZip.archiveId))
        } catch (delErr) {
          console.warn('Failed to delete source archive record:', delErr)
        }
      }

      addToast(`Extracted ${result.count} media items!`, 'success')
      await loadTrips()
    } catch (err) {
      console.error('Extraction failed:', err)
      addToast('Extraction failed: ' + ((err as Error)?.message || 'Unknown error'), 'error')
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent)] transition mb-2"
        >
          <ArrowLeft size={14} />
          <span>Back to Trips</span>
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Local Archiver</p>
            <h1 className="mt-1 font-sans text-4xl">ZIP Extractor</h1>
            <p className="mt-1.5 text-xs text-[var(--muted)] max-w-xl leading-relaxed">
              Find, inspect, and extract trip photos & videos from ZIP archives into Memento trips.
              All extraction happens privately on your device with no servers or cloud uploads.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload & Inspection on Left, Configuration & Actions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dropzone & Discovered Archives (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* File Picker & Drag Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              dragOver
                ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 scale-[0.99]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--surface-strong)]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--surface-strong)] border border-[var(--border)] text-[var(--accent)] transition group-hover:scale-110">
              {isAnalyzing ? (
                <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
              ) : (
                <Upload size={24} />
              )}
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
              {isAnalyzing ? 'Inspecting archive contents…' : 'Choose a ZIP file or drag here'}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Select any ZIP archive from phone storage, downloads, or backup folders
            </p>
            <button
              type="button"
              className="secondary-button mt-4 text-xs pointer-events-none"
            >
              <FileArchive size={14} className="text-[var(--accent)]" />
              <span>Browse files</span>
            </button>
          </div>

          {/* List of Analyzed Archives */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Available ZIP archives ({inspections.length})
              </h2>
              {inspections.length > 0 && (
                <span className="text-[11px] text-[var(--muted)]">
                  Click an archive to configure extraction
                </span>
              )}
            </div>

            {inspections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                <FileArchive size={28} className="mx-auto text-[var(--muted)]" />
                <p className="mt-2 text-xs font-medium text-[var(--muted)]">
                  No ZIP archives loaded yet
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  Upload a ZIP file above to scan for trip photos and videos.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {inspections.map((item) => {
                  const isSelected = selectedZip?.fileName === item.fileName

                  return (
                    <div
                      key={item.fileName + (item.archiveId || '')}
                      onClick={() => handleSelectZip(item)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--surface)] shadow-sm ring-2 ring-[var(--accent)]/30'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                              item.containsMedia
                                ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]'
                                : 'border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]'
                            }`}
                          >
                            <FileArchive size={20} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                              {item.fileName}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                              <span>{formatBytes(item.fileSizeBytes)}</span>
                              <span>•</span>
                              <span>{item.totalFiles} files</span>
                              {item.totalMediaBytes > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{formatBytes(item.totalMediaBytes)} media</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Selection Check indicator */}
                        <div className="shrink-0 pt-0.5">
                          <div
                            className={`flex size-5 items-center justify-center rounded-full border transition ${
                              isSelected
                                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                                : 'border-[var(--border)] bg-[var(--surface-strong)]'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>

                      {/* Smart Intelligence Badge & Media Breakdown */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5">
                        <div className="flex items-center gap-1.5">
                          {item.containsMedia ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                              <Sparkles size={12} />
                              <span>Contains Trip Media</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-black/5 dark:bg-white/5 px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                              <AlertCircle size={12} />
                              <span>No media files detected</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                          <span className="inline-flex items-center gap-1">
                            <ImageIcon size={13} className="text-[var(--accent)]" />
                            <strong className="text-[var(--foreground)]">{item.photoCount}</strong> photos
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Video size={13} className="text-[var(--accent)]" />
                            <strong className="text-[var(--foreground)]">{item.videoCount}</strong> videos
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Destination & Extraction Actions (5 cols on lg) */}
        <div className="lg:col-span-5">
          <div className="surface-card p-5 space-y-5 sticky top-6">
            <div className="border-b border-[var(--border)] pb-3">
              <h2 className="font-semibold text-base text-[var(--foreground)]">
                Extraction settings
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {selectedZip
                  ? `Selected: ${selectedZip.fileName}`
                  : 'Select an archive to proceed'}
              </p>
            </div>

            {selectedZip ? (
              <>
                {/* Destination Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-[var(--foreground)] block">
                    Save media to:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExtractMode('new')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition ${
                        extractMode === 'new'
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-xs'
                          : 'border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      <FolderPlus size={15} />
                      <span>New Trip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtractMode('existing')}
                      disabled={trips.length === 0}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition ${
                        extractMode === 'existing'
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-xs'
                          : 'border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)] hover:text-[var(--foreground)]'
                      } ${trips.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <FolderDown size={15} />
                      <span>Existing Trip</span>
                    </button>
                  </div>

                  {extractMode === 'new' ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                          Trip Name
                        </label>
                        <input
                          type="text"
                          value={newTripName}
                          onChange={(e) => setNewTripName(e.target.value)}
                          placeholder="e.g. Summer Road Trip 2026"
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                            Start date
                          </label>
                          <input
                            type="date"
                            value={newStartDate}
                            onChange={(e) => setNewStartDate(e.target.value)}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                            End date
                          </label>
                          <input
                            type="date"
                            value={newEndDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                        Select Destination Trip
                      </label>
                      <select
                        value={selectedExistingTripId}
                        onChange={(e) => setSelectedExistingTripId(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        {trips.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Auto-delete Checkbox */}
                <div className="pt-2 border-t border-[var(--border)]">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteAfterExtract}
                      onChange={(e) => setDeleteAfterExtract(e.target.checked)}
                      className="mt-0.5 size-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[var(--foreground)] block">
                        Delete ZIP file after extraction
                      </span>
                      <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                        Frees up phone storage once all original photos and videos are safely stored.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Progress Meter */}
                {isExtracting && (
                  <div className="space-y-2 rounded-xl bg-[var(--surface-strong)] p-3.5 border border-[var(--border)]">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-[var(--accent)]">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Extracting files…</span>
                      </span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className="h-full bg-[var(--accent)] transition-all duration-200"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    {currentFileName && (
                      <p className="truncate text-[10px] text-[var(--muted)] font-mono">
                        {currentFileName}
                      </p>
                    )}
                  </div>
                )}

                {/* Extraction Success Card */}
                {completedTripId && !isExtracting && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={18} />
                      <span className="text-xs font-bold">Extraction complete!</span>
                    </div>
                    <p className="text-xs text-[var(--foreground)]">
                      Successfully imported <strong>{completedCount}</strong> photos and videos into your trip.
                    </p>
                    <Link
                      href={`/trips/${completedTripId}`}
                      className="primary-button w-full text-xs py-2 inline-flex items-center justify-center gap-1.5"
                    >
                      <span>View Trip Gallery</span>
                    </Link>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartExtraction}
                    disabled={isExtracting || !selectedZip.containsMedia}
                    className="primary-button w-full h-11 text-xs justify-center"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Extracting media…</span>
                      </>
                    ) : (
                      <>
                        <FolderDown size={15} />
                        <span>
                          {selectedZip.containsMedia
                            ? `Extract ${selectedZip.photoCount + selectedZip.videoCount} media files`
                            : 'No media to extract'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-[var(--muted)]">
                <FileArchive size={28} className="mx-auto mb-2 opacity-40" />
                Select or upload a ZIP archive on the left to configure extraction settings.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

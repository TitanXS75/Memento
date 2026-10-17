'use client'

import {
  Archive,
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
  X,
} from 'lucide-react'
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

interface ZipExtractorModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ZipExtractorModal({ isOpen, onClose }: ZipExtractorModalProps) {
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

  // Extraction active step
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
    if (isOpen) {
      loadTrips()
      loadArchives()
    }
  }, [isOpen, loadTrips, loadArchives])

  // Check known Memento archives automatically
  useEffect(() => {
    if (!isOpen || archives.length === 0) return

    const loadKnownArchives = async () => {
      for (const arch of archives) {
        if (!arch.localStorageReference) continue
        const alreadyInList = inspections.some((i) => i.archiveId === arch.id || i.fileName === arch.filename)
        if (alreadyInList) continue

        try {
          // If stored as data URL or fetchable URL
          const res = await fetch(arch.localStorageReference)
          const buf = await res.arrayBuffer()
          const inspected = await inspectZipBuffer(arch.filename, new Uint8Array(buf), arch.id)
          setInspections((prev) => {
            if (prev.some((p) => p.archiveId === arch.id)) return prev
            return [inspected, ...prev]
          })
        } catch {
          // Ignore if inaccessible
        }
      }
    }

    loadKnownArchives()
  }, [isOpen, archives])

  if (!isOpen) return null

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsAnalyzing(true)

    try {
      const results: ZipInspectionResult[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.name.toLowerCase().endsWith('.zip')) {
          continue
        }
        try {
          const inspected = await inspectZipFile(file)
          results.push(inspected)
        } catch (err) {
          console.error('Failed to inspect zip:', err)
          addToast(`Could not read "${file.name}". Ensure it is a valid ZIP.`, 'error')
        }
      }

      if (results.length > 0) {
        setInspections((prev) => [...results, ...prev])
        addToast(`Scanned ${results.length} ZIP ${results.length === 1 ? 'file' : 'files'}.`, 'info')
      }
    } finally {
      setIsAnalyzing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleStartConfigure = (zip: ZipInspectionResult) => {
    setSelectedZip(zip)
    setNewTripName(zip.suggestedTripName)
    setNewStartDate(zip.suggestedStartDate)
    setNewEndDate(zip.suggestedEndDate)
    if (trips.length > 0) {
      setSelectedExistingTripId(trips[0].id)
    }
    setCompletedTripId(null)
  }

  const handleExecuteExtraction = async () => {
    if (!selectedZip || !selectedZip.rawBuffer) {
      addToast('ZIP file data is no longer in memory. Please select it again.', 'error')
      return
    }

    setIsExtracting(true)
    setProgressPct(0)
    setCurrentFileName('Preparing…')

    try {
      let targetTripId = selectedExistingTripId

      if (extractMode === 'new') {
        const trimmedName = newTripName.trim() || selectedZip.suggestedTripName || 'Imported Trip'
        const sDate = newStartDate || new Date().toISOString().slice(0, 10)
        const eDate = newEndDate || sDate

        const created = await createTrip({
          name: trimmedName,
          startDate: sDate,
          endDate: eDate,
          description: `Extracted from ${selectedZip.fileName} via Memento ZIP Extractor`,
        })
        targetTripId = created.id
      }

      const res = await extractMediaFromZip({
        buffer: selectedZip.rawBuffer,
        inspection: selectedZip,
        tripId: targetTripId,
        onProgress: (pct, fname) => {
          setProgressPct(pct)
          setCurrentFileName(fname)
        },
      })

      // Delete zip if requested
      if (deleteAfterExtract) {
        if (selectedZip.archiveId) {
          try {
            await deleteArchive(selectedZip.archiveId)
          } catch {
            // ignore
          }
        }
        // Remove from current inspections list
        setInspections((prev) => prev.filter((i) => i.id !== selectedZip.id))
      }

      setCompletedTripId(targetTripId)
      setCompletedCount(res.count)
      addToast(
        `Extracted ${res.count} items into "${extractMode === 'new' ? newTripName : 'Trip'}"!`,
        'success'
      )
    } catch (err) {
      console.error('Extraction error:', err)
      addToast('Failed to extract ZIP items.', 'error')
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div
      className="modal-backdrop z-50 p-2 sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExtracting) onClose()
      }}
    >
      <div
        className="modal-card max-h-[92vh] max-w-2xl overflow-y-auto p-4 sm:p-6 text-[var(--foreground)]"
        role="dialog"
        aria-modal="true"
        aria-label="ZIP Extractor"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-xs shrink-0">
              <FileArchive size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-sans text-xl">ZIP Extractor</h3>
              <p className="eyebrow text-[10px]">Smart Media Scanner</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isExtracting}
            aria-label="Close extractor"
            className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content View: Configure / Progress / List */}
        {selectedZip ? (
          <div className="mt-4 space-y-4">
            {completedTripId ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-8 px-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="mt-3 font-sans text-2xl">Extraction Complete!</h4>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Successfully imported {completedCount} photos & videos into your trip.
                  {deleteAfterExtract && ' Original ZIP file was removed to save storage.'}
                </p>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      router.push(`/trips/${completedTripId}`)
                    }}
                    className="primary-button text-xs"
                  >
                    View Trip Gallery
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedZip(null)
                      setCompletedTripId(null)
                    }}
                    className="secondary-button text-xs"
                  >
                    Extract Another ZIP
                  </button>
                </div>
              </div>
            ) : isExtracting ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-10 px-6 text-center">
                <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
                <h4 className="mt-4 font-sans text-xl">Extracting media…</h4>
                <p className="mt-1 max-w-sm truncate text-xs text-[var(--muted)]">
                  {currentFileName}
                </p>

                {/* Progress Bar */}
                <div className="mt-5 w-full max-w-md">
                  <div className="flex justify-between text-[11px] font-medium text-[var(--muted)] mb-1.5">
                    <span>Progress</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-strong)]">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-200"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected File Summary Banner */}
                <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/40 p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Archive size={16} className="shrink-0 text-[var(--accent)]" />
                      <span className="font-semibold truncate">{selectedZip.fileName}</span>
                    </div>
                    <span className="font-medium text-[var(--muted)] shrink-0">
                      {formatBytes(selectedZip.fileSizeBytes)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="flex items-center gap-1 rounded-md bg-white/70 dark:bg-black/40 px-2 py-0.5 text-emerald-700 dark:text-emerald-300 font-medium">
                      <Sparkles size={11} /> {selectedZip.photoCount} photos, {selectedZip.videoCount} videos
                    </span>
                    <span className="text-[var(--muted)]">
                      Total media: {formatBytes(selectedZip.totalMediaBytes)}
                    </span>
                  </div>
                </div>

                {/* Extraction Options Form */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-[var(--foreground)]">Destination Trip</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setExtractMode('new')}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                        extractMode === 'new'
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]/30 font-medium'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-strong)]'
                      }`}
                    >
                      <FolderPlus size={16} className="text-[var(--accent)]" />
                      <span>Create new trip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtractMode('existing')}
                      disabled={trips.length === 0}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left transition disabled:opacity-50 ${
                        extractMode === 'existing'
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]/30 font-medium'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-strong)]'
                      }`}
                    >
                      <FolderDown size={16} className="text-[var(--accent)]" />
                      <span>Add to existing trip</span>
                    </button>
                  </div>

                  {extractMode === 'new' ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-[11px] font-medium text-[var(--muted)]">Trip Name</label>
                        <input
                          type="text"
                          value={newTripName}
                          onChange={(e) => setNewTripName(e.target.value)}
                          placeholder="e.g. Goa Trip 2026"
                          className="field mt-1 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-medium text-[var(--muted)]">Start Date</label>
                          <input
                            type="date"
                            value={newStartDate}
                            onChange={(e) => setNewStartDate(e.target.value)}
                            className="field mt-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-[var(--muted)]">End Date</label>
                          <input
                            type="date"
                            value={newEndDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                            className="field mt-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <label className="text-[11px] font-medium text-[var(--muted)]">Select Trip</label>
                      <select
                        value={selectedExistingTripId}
                        onChange={(e) => setSelectedExistingTripId(e.target.value)}
                        className="field mt-1 text-xs"
                      >
                        {trips.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.startDate})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Delete ZIP Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2.5 text-xs text-[var(--foreground)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={deleteAfterExtract}
                        onChange={(e) => setDeleteAfterExtract(e.target.checked)}
                        className="size-4 rounded accent-[var(--accent)]"
                      />
                      <span>Delete original ZIP file after extraction (frees up storage)</span>
                    </label>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setSelectedZip(null)}
                    className="secondary-button text-xs"
                  >
                    Back to ZIPs
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteExtraction}
                    className="primary-button text-xs"
                  >
                    <FolderDown size={14} /> Start Extraction
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* File Dropzone & Scan Action */}
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
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                dragOver
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]/20'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--accent)] shadow-xs">
                {isAnalyzing ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <Upload size={24} />
                )}
              </div>

              <p className="mt-3 text-sm font-medium">
                {isAnalyzing ? 'Analyzing ZIP archives…' : 'Browse phone or drop ZIP files here'}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)] max-w-xs">
                Memento will intelligently inspect each archive and detect photos & videos ready for extraction.
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                className="primary-button mt-4 text-xs"
              >
                <Plus size={14} /> Select ZIP Files from Phone
              </button>
            </div>

            {/* List of Detected ZIPs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--foreground)]">
                  Discovered ZIP Archives ({inspections.length})
                </span>
                {inspections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setInspections([])}
                    className="text-[11px] text-[var(--muted)] hover:text-[var(--coral)]"
                  >
                    Clear list
                  </button>
                )}
              </div>

              {inspections.length === 0 ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-xs text-[var(--muted)]">
                  No ZIP files in the queue. Select a ZIP from your device storage above to analyze it.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {inspections.map((zip) => (
                    <div
                      key={zip.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 transition hover:border-[var(--accent)]/50"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${
                            zip.containsMedia
                              ? 'bg-[var(--accent)] text-white shadow-xs'
                              : 'bg-[var(--surface-strong)] text-[var(--muted)]'
                          }`}
                        >
                          <Archive size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold" title={zip.fileName}>
                            {zip.fileName}
                          </p>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5">
                            {formatBytes(zip.fileSizeBytes)} • {zip.totalFiles} files
                          </p>

                          {/* Intelligence Badges */}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                            {zip.containsMedia ? (
                              <>
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
                                  <Sparkles size={10} /> Contains Media
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-strong)] px-2 py-0.5 font-medium">
                                  <ImageIcon size={10} /> {zip.photoCount} photos
                                </span>
                                {zip.videoCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-strong)] px-2 py-0.5 font-medium">
                                    <Video size={10} /> {zip.videoCount} videos
                                  </span>
                                )}
                                <span className="text-[var(--muted)] truncate">
                                  Suggested: {zip.suggestedTripName}
                                </span>
                              </>
                            ) : (
                              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-300">
                                No photos/videos found ({zip.otherCount} other files)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {zip.containsMedia ? (
                          <button
                            type="button"
                            onClick={() => handleStartConfigure(zip)}
                            className="primary-button text-xs py-1.5 px-3"
                          >
                            <FolderDown size={13} /> Extract to Memento
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="secondary-button text-xs py-1.5 px-3 opacity-50 cursor-not-allowed"
                          >
                            No Media
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setInspections((prev) => prev.filter((i) => i.id !== zip.id))}
                          aria-label="Remove from list"
                          className="rounded-full p-1.5 text-[var(--muted)] hover:text-[var(--coral)] hover:bg-[var(--surface-strong)] transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

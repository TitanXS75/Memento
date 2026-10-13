'use client'

import { AlertCircle, Download, FileArchive, Package, RefreshCw, Share2, ShieldCheck, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import type { Archive } from '@/lib/db/schema'
import { formatBytes } from '@/lib/services/hash'
import { shareOrDownloadFile } from '@/lib/services/share'
import { useArchivesStore } from '@/lib/store/archives'
import { useUiStore } from '@/lib/store/ui'

interface ArchivesModalProps {
  onClose: () => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function ArchivesModal({ onClose }: ArchivesModalProps) {
  const { archives, loading, loadArchives, deleteArchive } = useArchivesStore()
  const { addToast } = useUiStore()
  const [deleteTarget, setDeleteTarget] = useState<Archive | null>(null)

  useEffect(() => {
    loadArchives()
  }, [loadArchives])

  const handleShare = async (archive: Archive) => {
    if (!archive.localStorageReference) {
      addToast('Archive file reference expired.', 'error')
      return
    }
    try {
      const res = await fetch(archive.localStorageReference)
      const blob = await res.blob()
      await shareOrDownloadFile({
        blob,
        filename: archive.filename,
        title: archive.filename,
      })
      addToast('Share triggered.', 'info')
    } catch {
      addToast('Could not share archive.', 'error')
    }
  }

  const handleDownload = (archive: Archive) => {
    if (!archive.localStorageReference) {
      addToast('Archive file reference expired.', 'error')
      return
    }
    const a = document.createElement('a')
    a.href = archive.localStorageReference
    a.download = archive.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    addToast('Download started.', 'success')
  }

  const confirmDeleteArchive = async () => {
    if (!deleteTarget) return
    try {
      await deleteArchive(deleteTarget.id)
      addToast('Archive deleted.', 'info')
      setDeleteTarget(null)
    } catch {
      addToast('Failed to delete archive.', 'error')
    }
  }

  return (
    <div
      className="modal-backdrop z-50 p-2 sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal-card max-h-[90vh] max-w-xl overflow-hidden flex flex-col p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Trip Archives"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <p className="eyebrow">Trip packages</p>
            <h2 className="font-sans text-2xl">Saved ZIP Archives</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => loadArchives()}
              disabled={loading}
              aria-label="Refresh archives"
              className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)] transition"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-[var(--accent)]' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close archives modal"
              className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)] transition"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Archives List */}
        <div className="mt-3 min-h-[220px] max-h-[55vh] flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex h-40 flex-col items-center justify-center text-xs text-[var(--muted)]">
              <RefreshCw size={20} className="animate-spin text-[var(--accent)]" />
              <span className="mt-2">Loading archives…</span>
            </div>
          ) : archives.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center p-6 text-[var(--muted)]">
              <Package size={34} className="mb-2" />
              <p className="text-sm font-medium text-[var(--foreground)]">No ZIP archives generated yet</p>
              <p className="mt-1 text-xs max-w-xs">
                Open any trip and tap &ldquo;Export ZIP&rdquo; to package photos and videos into an archive.
              </p>
            </div>
          ) : (
            archives.map((archive) => {
              const isCompleted = archive.status === 'completed'
              const isFailed = archive.status === 'failed'
              return (
                <div
                  key={archive.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)]/40 p-3.5 text-xs transition hover:border-[var(--accent)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-strong)] text-[var(--accent)]">
                        <FileArchive size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--foreground)]" title={archive.filename}>
                          {archive.filename}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                          {formatDate(archive.createdAt)} • {archive.photoCount} photos, {archive.videoCount} videos
                          {archive.archiveSizeBytes ? ` • ${formatBytes(archive.archiveSizeBytes)}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isCompleted ? (
                        <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                          Ready
                        </span>
                      ) : isFailed ? (
                        <span className="flex items-center gap-1 rounded-full bg-[var(--coral)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--coral)]">
                          <AlertCircle size={10} /> Interrupted
                        </span>
                      ) : (
                        <span className="rounded-full bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                          Creating…
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--border)]/60 pt-2.5">
                    {isCompleted && archive.localStorageReference && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleShare(archive)}
                          className="secondary-button py-1 px-2.5 text-xs"
                        >
                          <Share2 size={12} /> Share
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(archive)}
                          aria-label="Download ZIP"
                          className="secondary-button py-1 px-2.5 text-xs"
                        >
                          <Download size={12} /> Save
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(archive)}
                      aria-label="Delete archive"
                      className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--coral)]/10 hover:text-[var(--coral)] transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info & Done button */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
            <ShieldCheck size={14} className="text-[var(--accent)]" />
            <span>Deleting an archive never affects your camera roll.</span>
          </div>
          <button type="button" onClick={onClose} className="primary-button py-1.5 px-4 text-xs">
            Done
          </button>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this archive?"
          message={`"${deleteTarget.filename}" will be removed. Your original photos and videos are not affected.`}
          confirmLabel="Delete archive"
          destructive
          onConfirm={confirmDeleteArchive}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

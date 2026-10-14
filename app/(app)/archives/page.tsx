'use client'

import { AlertCircle, ArrowLeft, Download, FileArchive, Package, RefreshCw, Share2, ShieldCheck, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { EmptyState } from '@/components/app/EmptyState'
import type { Archive } from '@/lib/db/schema'
import { formatBytes } from '@/lib/services/hash'
import { shareOrDownloadFile } from '@/lib/services/share'
import { useArchivesStore } from '@/lib/store/archives'
import { useUiStore } from '@/lib/store/ui'

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

export default function ArchivesPage() {
  const router = useRouter()
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
    <div className="module-enter max-w-4xl space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/trips"
          className="inline-flex items-center gap-2 rounded-lg text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition py-1 pr-2"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to trips</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <p className="eyebrow">Trip packages</p>
          <h1 className="mt-1 font-sans text-4xl">Saved ZIP Archives</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadArchives()}
            disabled={loading}
            aria-label="Refresh archives"
            className="secondary-button h-10 px-3.5"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[var(--accent)]' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)]/40 px-3.5 py-2.5 text-xs text-[var(--muted)]">
        <ShieldCheck size={16} className="shrink-0 text-[var(--accent)]" />
        <span>Archives are stored locally on your device. Deleting an archive never affects your original camera roll or photos.</span>
      </div>

      {/* Archives List */}
      <div className="space-y-3.5">
        {loading && archives.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-xs text-[var(--muted)]">
            <RefreshCw size={22} className="animate-spin text-[var(--accent)]" />
            <span className="mt-3">Loading archives…</span>
          </div>
        ) : archives.length === 0 ? (
          <EmptyState
            title="No ZIP archives generated yet"
            description="Open any trip and tap 'Export ZIP' to package original quality photos and videos into an offline archive."
            actionLabel="Browse trips"
            onAction={() => router.push('/trips')}
          />
        ) : (
          <div className="grid gap-3.5">
            {archives.map((archive) => {
              const isCompleted = archive.status === 'completed'
              const isFailed = archive.status === 'failed'

              return (
                <div
                  key={archive.id}
                  className="surface-card flex flex-col justify-between gap-4 p-4 transition hover:border-[var(--accent)] sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-strong)] text-[var(--accent)]">
                      <FileArchive size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-sm text-[var(--foreground)]" title={archive.filename}>
                          {archive.filename}
                        </p>
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
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {formatDate(archive.createdAt)} • {archive.photoCount} photos, {archive.videoCount} videos
                        {archive.archiveSizeBytes ? ` • ${formatBytes(archive.archiveSizeBytes)}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center border-t border-[var(--border)]/50 pt-3 sm:border-0 sm:pt-0">
                    {isCompleted && archive.localStorageReference && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleShare(archive)}
                          className="secondary-button h-9 px-3 text-xs"
                          aria-label={`Share ${archive.filename}`}
                        >
                          <Share2 size={13} />
                          <span>Share</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(archive)}
                          className="secondary-button h-9 px-3 text-xs"
                          aria-label={`Save or download ${archive.filename}`}
                        >
                          <Download size={13} />
                          <span>Save</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(archive)}
                      aria-label="Delete archive"
                      className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--coral)]/10 hover:text-[var(--coral)] transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this archive?"
          message={`"${deleteTarget.filename}" will be removed from your saved packages. Your original photos and videos remain safe in your camera roll.`}
          confirmLabel="Delete archive"
          destructive
          onConfirm={confirmDeleteArchive}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

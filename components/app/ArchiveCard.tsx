'use client'

import { AlertCircle, Calendar, Download, FileArchive, HardDrive, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import type { Archive } from '@/lib/db/schema'
import { formatBytes } from '@/lib/services/hash'
import { shareOrDownloadFile } from '@/lib/services/share'
import { useUiStore } from '@/lib/store/ui'

interface ArchiveCardProps {
  archive: Archive
  onDelete: (id: string) => void
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

export function ArchiveCard({ archive, onDelete }: ArchiveCardProps) {
  const { addToast } = useUiStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isCompleted = archive.status === 'completed'
  const isFailed = archive.status === 'failed'

  const handleShare = async () => {
    if (!archive.localStorageReference) {
      addToast('Archive file is no longer cached in memory.', 'error')
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

  const handleDownload = () => {
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

  return (
    <>
      <div className="surface-card flex flex-col gap-4 p-5 transition-all hover:border-[var(--accent)] hover:shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className={`icon-box size-11 shrink-0 ${isFailed ? 'bg-[var(--coral)]/15 text-[var(--coral)]' : ''}`}>
              <FileArchive size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-sans text-lg font-medium text-[var(--foreground)]" title={archive.filename}>
                {archive.filename}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(archive.createdAt)}
                </span>
                {archive.archiveSizeBytes && (
                  <span className="flex items-center gap-1">
                    <HardDrive size={12} /> {formatBytes(archive.archiveSizeBytes)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {isCompleted ? (
              <span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
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

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
          <span className="text-[11px] text-[var(--muted)]">
            {archive.photoCount} photos • {archive.videoCount} videos
          </span>

          <div className="flex items-center gap-2">
            {isCompleted && archive.localStorageReference && (
              <>
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share archive"
                  className="secondary-button py-1 px-2.5 text-xs"
                >
                  <Share2 size={13} /> Share
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  aria-label="Download archive"
                  className="secondary-button py-1 px-2.5 text-xs"
                >
                  <Download size={13} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete archive"
              className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--coral)]/10 hover:text-[var(--coral)] transition"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this archive?"
          message={`"${archive.filename}" will be removed from saved archives. Your original photos and videos will remain completely untouched.`}
          confirmLabel="Delete archive"
          destructive
          onConfirm={() => {
            onDelete(archive.id)
            setConfirmDelete(false)
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}

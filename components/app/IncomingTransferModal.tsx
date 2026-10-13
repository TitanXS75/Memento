'use client'

import { ArrowDownLeft, Film, Image as ImageIcon, ShieldAlert, X } from 'lucide-react'
import { useEffect } from 'react'
import { formatBytes } from '@/lib/services/hash'
import type { IncomingTransferRequest } from '@/lib/services/transfer'

interface IncomingTransferModalProps {
  request: IncomingTransferRequest | null
  onAccept: () => void
  onDecline: () => void
}

export function IncomingTransferModal({
  request,
  onAccept,
  onDecline,
}: IncomingTransferModalProps) {
  useEffect(() => {
    if (!request) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDecline()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [request, onDecline])

  if (!request) return null

  const photoCount = request.items.filter((i) => i.mediaType === 'photo').length
  const videoCount = request.items.filter((i) => i.mediaType === 'video').length

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="surface-card w-full max-w-md overflow-hidden p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft size={18} aria-hidden="true" />
            </span>
            <p className="eyebrow text-emerald-600 dark:text-emerald-400">Incoming Share</p>
          </div>
          <button
            type="button"
            onClick={onDecline}
            className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="Decline and close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <h2 id="incoming-modal-title" className="mt-3 font-sans text-2xl font-medium">
          Receive media from {request.senderDevice.displayName}?
        </h2>

        <p className="mt-2 text-sm text-[var(--muted)]">
          {request.senderDevice.displayName} wants to send original media files to your device over
          the local Wi-Fi connection.
        </p>

        {/* Transfer Details Card */}
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">Total Size:</span>
            <span className="font-medium text-[var(--foreground)]">{formatBytes(request.totalBytes)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-[var(--muted)]">Items:</span>
            <span className="font-medium text-[var(--foreground)]">{request.items.length} files</span>
          </div>
          {request.tripName && (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-[var(--muted)]">Trip:</span>
              <span className="font-medium text-[var(--foreground)]">{request.tripName}</span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
            {photoCount > 0 && (
              <span className="flex items-center gap-1.5">
                <ImageIcon size={14} aria-hidden="true" />
                <span>{photoCount} {photoCount === 1 ? 'photo' : 'photos'}</span>
              </span>
            )}
            {videoCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Film size={14} aria-hidden="true" />
                <span>{videoCount} {videoCount === 1 ? 'video' : 'videos'}</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
          <ShieldAlert size={14} className="shrink-0 text-amber-500" aria-hidden="true" />
          <span>Files are verified with SHA-256 integrity checks upon arrival.</span>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="secondary-button"
            id="decline-incoming-btn"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="primary-button"
            id="accept-incoming-btn"
          >
            Accept & Save
          </button>
        </div>
      </div>
    </div>
  )
}

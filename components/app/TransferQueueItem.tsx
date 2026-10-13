'use client'

import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  RotateCw,
  X,
  XCircle,
} from 'lucide-react'
import { formatBytes } from '@/lib/services/hash'
import type { ActiveTransferProgress } from '@/lib/services/transfer'

interface TransferQueueItemProps {
  transfer: ActiveTransferProgress
  onCancel: (id: string) => void
  onRetry: (id: string) => void
}

export function TransferQueueItem({ transfer, onCancel, onRetry }: TransferQueueItemProps) {
  const percent = transfer.totalBytes > 0
    ? Math.min(100, Math.round((transfer.transferredBytes / transfer.totalBytes) * 100))
    : 0

  const isIncoming = transfer.direction === 'incoming'
  const isPhoto = transfer.mediaType === 'photo'

  const speedText = transfer.speedBps > 0 ? `${formatBytes(transfer.speedBps)}/s` : ''

  return (
    <div className="surface-card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--accent)]">
            {isPhoto ? <ImageIcon size={18} aria-hidden="true" /> : <Film size={18} aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--foreground)]" title={transfer.filename}>
              {transfer.filename}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1">
                {isIncoming ? (
                  <>
                    <ArrowDownLeft size={12} className="text-emerald-500" aria-hidden="true" />
                    <span>From {transfer.peerDeviceName}</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight size={12} className="text-blue-500" aria-hidden="true" />
                    <span>To {transfer.peerDeviceName}</span>
                  </>
                )}
              </span>
              <span>•</span>
              <span>{formatBytes(transfer.transferredBytes)} / {formatBytes(transfer.totalBytes)}</span>
              {speedText && transfer.status === 'in_progress' && (
                <>
                  <span>•</span>
                  <span className="text-[var(--accent)] font-medium">{speedText}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {transfer.status === 'completed' && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={13} aria-hidden="true" />
              <span>Done</span>
            </span>
          )}
          {transfer.status === 'verifying' && (
            <span className="animate-pulse rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              Verifying hash…
            </span>
          )}
          {transfer.status === 'failed' && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
              <XCircle size={13} aria-hidden="true" />
              <span>Failed</span>
            </span>
          )}
          {transfer.status === 'cancelled' && (
            <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
              Cancelled
            </span>
          )}

          {(transfer.status === 'in_progress' || transfer.status === 'pending') && (
            <button
              type="button"
              onClick={() => onCancel(transfer.id)}
              className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
              title="Cancel transfer"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}

          {transfer.status === 'failed' && (
            <button
              type="button"
              onClick={() => onRetry(transfer.id)}
              className="p-1 text-[var(--accent)] hover:opacity-80"
              title="Retry transfer"
            >
              <RotateCw size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(transfer.status === 'in_progress' || transfer.status === 'verifying' || transfer.status === 'pending') && (
        <div className="w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
            <span>Chunk {transfer.currentChunk} of {transfer.totalChunks}</span>
            <span>{percent}%</span>
          </div>
        </div>
      )}

      {transfer.error && (
        <p className="text-xs text-rose-500">{transfer.error}</p>
      )}
    </div>
  )
}

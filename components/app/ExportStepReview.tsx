'use client'

import { AlertTriangle, CheckCircle2, Download, Package, Share2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { formatBytes } from '@/lib/services/hash'
import { shareOrDownloadFile } from '@/lib/services/share'
import { useUiStore } from '@/lib/store/ui'

interface ExportStepReviewProps {
  tripName: string
  filename: string
  photoCount: number
  videoCount: number
  totalBytes: number
  onStartPacking: () => void
  onBack: () => void
  readyBlob: Blob | null
}

export function ExportStepReview({
  tripName,
  filename,
  photoCount,
  videoCount,
  totalBytes,
  onStartPacking,
  onBack,
  readyBlob,
}: ExportStepReviewProps) {
  const { addToast } = useUiStore()
  const isLarge = totalBytes > 500 * 1024 * 1024
  const isVeryLarge = totalBytes > 2 * 1024 * 1024 * 1024

  const handleShare = async () => {
    if (!readyBlob) return
    try {
      const res = await shareOrDownloadFile({
        blob: readyBlob,
        filename,
        title: `${tripName} Archive`,
      })
      if (res.downloaded) addToast('ZIP downloaded to device.', 'success')
      else if (res.shared) addToast('Share sheet opened.', 'info')
    } catch {
      addToast('Could not share archive.', 'error')
    }
  }

  const handleDirectDownload = () => {
    if (!readyBlob) return
    const url = URL.createObjectURL(readyBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    addToast('ZIP download started.', 'success')
  }

  if (readyBlob) {
    return (
      <div className="surface-card mt-6 flex flex-col items-center gap-5 p-6 text-center sm:p-8">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-md">
          <CheckCircle2 size={32} />
        </div>

        <div>
          <span className="eyebrow flex items-center justify-center gap-1">
            <Sparkles size={12} /> Archive Ready
          </span>
          <h2 className="mt-1 font-sans text-2xl sm:text-3xl font-medium">{filename}</h2>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            {photoCount} photos • {videoCount} videos • {formatBytes(readyBlob.size)}
          </p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleShare}
            className="primary-button justify-center py-2.5 text-sm"
          >
            <Share2 size={16} /> Share Archive
          </button>
          <button
            type="button"
            onClick={handleDirectDownload}
            className="secondary-button justify-center py-2.5 text-sm"
          >
            <Download size={16} /> Save to device
          </button>
          <Link
            href="/archives"
            className="mt-2 text-center text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline"
          >
            View all archives
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="surface-card mt-6 space-y-5 p-6">
      <div>
        <p className="eyebrow">Step 3 of 3 • Review</p>
        <h2 className="mt-1 font-sans text-2xl font-medium">Archive Summary</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-strong)] p-4 text-xs">
        <div>
          <span className="text-[var(--muted)]">Filename:</span>
          <p className="mt-0.5 truncate font-medium text-[var(--foreground)]" title={filename}>{filename}</p>
        </div>
        <div>
          <span className="text-[var(--muted)]">Estimated size:</span>
          <p className="mt-0.5 font-medium text-[var(--foreground)]">{formatBytes(totalBytes)}</p>
        </div>
        <div>
          <span className="text-[var(--muted)]">Photos:</span>
          <p className="mt-0.5 font-medium text-[var(--foreground)]">{photoCount}</p>
        </div>
        <div>
          <span className="text-[var(--muted)]">Videos:</span>
          <p className="mt-0.5 font-medium text-[var(--foreground)]">{videoCount}</p>
        </div>
      </div>

      {isLarge && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle size={18} className="shrink-0 text-amber-500" />
          <p>
            {isVeryLarge
              ? 'This archive exceeds 2 GB. Many messaging apps (WhatsApp, Telegram) have file size limits when sharing directly.'
              : 'This archive is over 500 MB. Compression and sharing may take extra time on mobile.'}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <button type="button" onClick={onBack} className="secondary-button text-xs">
          Back
        </button>
        <button
          type="button"
          onClick={onStartPacking}
          className="primary-button text-xs"
        >
          <Package size={14} /> Start ZIP Packaging
        </button>
      </div>
    </div>
  )
}

'use client'

import { ArrowLeft, Package } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'

interface Props {
  params: Promise<{ id: string }>
}

export default function TripExportPage({ params }: Props) {
  const { id } = use(params)

  return (
    <>
      <Link
        href={`/trips/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Back to trip
      </Link>

      <div className="mt-5">
        <p className="eyebrow">Export & Share</p>
        <h1 className="mt-1 font-sans text-4xl">Create ZIP archive</h1>
      </div>

      <div className="mt-10 flex flex-col items-center gap-6 py-16 text-center">
        <div className="icon-box size-16">
          <Package size={28} aria-hidden="true" />
        </div>
        <div>
          <p className="font-sans text-xl">ZIP export coming in Phase 4</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            Select trip dates, choose your media, and create an original-quality ZIP archive
            to share via WhatsApp, Telegram, or save to your device.
          </p>
        </div>
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--muted)]">
          This feature requires <code className="font-mono text-[var(--accent)]">fflate</code> and{' '}
          <code className="font-mono text-[var(--accent)]">@capacitor/filesystem</code> — scheduled for Phase 4.
        </p>
      </div>
    </>
  )
}

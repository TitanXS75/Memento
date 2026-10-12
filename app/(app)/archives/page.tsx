'use client'

import { Package } from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'

export default function ArchivesPage() {
  return (
    <>
      <p className="eyebrow">Packaged memories</p>
      <h1 className="mt-1 font-sans text-4xl">Archives</h1>

      <div className="module-enter mt-8">
        <EmptyState
          title="No archives yet"
          description="Create a ZIP archive from any trip's export page. Archives appear here and can be shared or saved to your device."
        />

        <div className="mt-10 surface-card">
          <div className="flex items-start gap-4">
            <div className="icon-box size-12 shrink-0">
              <Package size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">ZIP export — Phase 4</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                Original-quality ZIP archives will be built here using{' '}
                <code className="rounded bg-[var(--surface-strong)] px-1 py-0.5 font-mono text-xs">fflate</code>
                {' '}— streaming, no RAM overload, with progress tracking and cancellation.
                Archives will persist between sessions and can be shared again
                without recreating them.
              </p>
              <div className="mt-4 grid gap-1 text-xs text-[var(--muted)]">
                <p>✓ Trip/date folder structure</p>
                <p>✓ Original file bytes — no re-encoding</p>
                <p>✓ Native share sheet (WhatsApp, Telegram, Files…)</p>
                <p>✓ Delete archive without touching original media</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

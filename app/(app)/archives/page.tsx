'use client'

import { FolderArchive, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { ArchiveCard } from '@/components/app/ArchiveCard'
import { EmptyState } from '@/components/app/EmptyState'
import { useArchivesStore } from '@/lib/store/archives'
import { useUiStore } from '@/lib/store/ui'

export default function ArchivesPage() {
  const { archives, loading, loadArchives, deleteArchive } = useArchivesStore()
  const { addToast } = useUiStore()

  useEffect(() => {
    loadArchives()
  }, [loadArchives])

  const handleDelete = async (id: string) => {
    try {
      await deleteArchive(id)
      addToast('Archive removed.', 'info')
    } catch {
      addToast('Failed to delete archive.', 'error')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Packaged memories</p>
          <h1 className="mt-1 font-sans text-4xl">Archives</h1>
        </div>
        <button
          type="button"
          onClick={() => loadArchives()}
          disabled={loading}
          aria-label="Refresh archives"
          className="rounded-full border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-[var(--accent)]' : ''} />
        </button>
      </div>

      <div className="module-enter mt-8 space-y-6">
        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--muted)]">Loading archives…</div>
        ) : archives.length === 0 ? (
          <div className="space-y-6">
            <EmptyState
              title="No archives yet"
              description="Create an original-quality ZIP archive from any trip's export page. Archives appear here and can be shared or saved to your device."
            />
            <div className="flex justify-center">
              <Link href="/trips" className="primary-button text-xs">
                <Plus size={14} /> Open a trip to export
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {archives.map((archive) => (
              <ArchiveCard key={archive.id} archive={archive} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* Local Security & Privacy Reminder */}
        <div className="surface-card flex items-start gap-3.5 p-4 text-xs text-[var(--muted)]">
          <ShieldCheck size={18} className="shrink-0 text-[var(--accent)]" />
          <p className="leading-relaxed">
            Archives are generated entirely offline on your device using streaming compression.
            Deleting an archive removes only the cached package and never alters your camera roll.
          </p>
        </div>
      </div>
    </>
  )
}

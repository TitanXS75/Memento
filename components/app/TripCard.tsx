'use client'

import { Archive, Calendar, Download, FolderPlus, MoreHorizontal, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Trip } from '@/lib/db/schema'
import { ConfirmDialog } from './ConfirmDialog'

interface TripCardProps {
  trip: Trip
  onArchive?: (id: string) => void
  onRestore?: (id: string) => void
  onDelete?: (id: string) => void
  onShare?: (trip: Trip) => void
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: start.slice(0, 4) !== end.slice(0, 4) ? 'numeric' : undefined,
    })

  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}

export function TripCard({ trip, onArchive, onRestore, onDelete, onShare }: TripCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (trip.coverMediaId) {
      import('@/lib/db').then(({ getDb }) =>
        getDb().then((db) => {
          db.get('mediaItems', trip.coverMediaId!).then((item) => {
            if (active && item) {
              setCoverUrl(item.thumbnailUri || item.localStorageReference || null)
            }
          })
        })
      )
    } else {
      setCoverUrl(null)
    }
    return () => { active = false }
  }, [trip.coverMediaId])

  return (
    <>
      <div className="surface-card group relative flex flex-col overflow-hidden p-0 transition-all hover:border-[var(--accent)] hover:shadow-xs">
        {coverUrl && (
          <Link href={`/trips/${trip.id}`} className="relative h-32 w-full overflow-hidden bg-[var(--surface-strong)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt={trip.name} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </Link>
        )}

        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3.5">
            {!coverUrl && (
              <div className="icon-box size-11 shrink-0">
                <FolderPlus size={19} aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Link
                href={`/trips/${trip.id}`}
                className="block font-sans text-xl leading-snug hover:underline focus-visible:underline"
              >
                {trip.name}
              </Link>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <Calendar size={11} aria-hidden="true" />
                {formatDateRange(trip.startDate, trip.endDate)}
              </p>
              {trip.archivedAt && (
                <span className="mt-1.5 inline-flex items-center rounded-full bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Archived
                </span>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Trip options"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="rounded-full p-2 text-[var(--muted)] opacity-0 transition hover:bg-[var(--surface-strong)] group-hover:opacity-100 focus-visible:opacity-100"
              >
                <MoreHorizontal size={17} aria-hidden="true" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setMenuOpen(false)} />
                  <menu
                    role="menu"
                    aria-label="Trip actions"
                    className="absolute right-0 z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
                  >
                    {onShare && (
                      <li role="none">
                        <button
                          role="menuitem"
                          type="button"
                          className="flex w-full items-center gap-2.5 px-4 py-2 text-xs hover:bg-[var(--surface-strong)]"
                          onClick={() => { onShare(trip); setMenuOpen(false) }}
                        >
                          <Share2 size={13} aria-hidden="true" /> Share
                        </button>
                      </li>
                    )}
                    <li role="none">
                      <Link
                        role="menuitem"
                        href={`/trips/${trip.id}/export`}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-[var(--surface-strong)]"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Download size={13} aria-hidden="true" /> Export ZIP
                      </Link>
                    </li>
                    {trip.archivedAt ? (
                      onRestore && (
                        <li role="none">
                          <button
                            role="menuitem"
                            type="button"
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-xs hover:bg-[var(--surface-strong)]"
                            onClick={() => { onRestore(trip.id); setMenuOpen(false) }}
                          >
                            <Archive size={13} aria-hidden="true" /> Restore
                          </button>
                        </li>
                      )
                    ) : (
                      onArchive && (
                        <li role="none">
                          <button
                            role="menuitem"
                            type="button"
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-xs hover:bg-[var(--surface-strong)]"
                            onClick={() => { onArchive(trip.id); setMenuOpen(false) }}
                          >
                            <Archive size={13} aria-hidden="true" /> Archive
                          </button>
                        </li>
                      )
                    )}
                    {onDelete && (
                      <li role="none">
                        <button
                          role="menuitem"
                          type="button"
                          className="flex w-full items-center gap-2.5 px-4 py-2 text-xs text-[var(--coral)] hover:bg-[var(--coral)]/10"
                          onClick={() => { setConfirmDelete(true); setMenuOpen(false) }}
                        >
                          Delete trip
                        </button>
                      </li>
                    )}
                  </menu>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
            <Link href={`/trips/${trip.id}`} className="secondary-button text-xs py-1.5 px-3">
              Open Trip
            </Link>
            {onShare && (
              <button
                type="button"
                onClick={() => onShare(trip)}
                className="secondary-button text-xs py-1.5 px-3"
              >
                <Share2 size={12} aria-hidden="true" /> Share
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && onDelete && (
        <ConfirmDialog
          title="Delete trip?"
          message={`"${trip.name}" and its local data will be removed. Original photos in your camera roll are not affected.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => { onDelete(trip.id); setConfirmDelete(false) }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}

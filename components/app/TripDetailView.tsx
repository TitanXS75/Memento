'use client'

import { ArrowLeft, Calendar, Edit2, ImageIcon, Package, Trash2, Video } from 'lucide-react'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { EmptyState } from '@/components/app/EmptyState'
import { useTripsStore } from '@/lib/store/trips'
import { useUiStore } from '@/lib/store/ui'

interface TripDetailViewProps {
  id: string
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

export function TripDetailView({ id }: TripDetailViewProps) {
  const router = useRouter()
  const { trips, loading, loadTrips, archiveTrip, restoreTrip, deleteTrip, updateTrip } = useTripsStore(
    useShallow((s) => ({
      trips: s.trips,
      loading: s.loading,
      loadTrips: s.loadTrips,
      archiveTrip: s.archiveTrip,
      restoreTrip: s.restoreTrip,
      deleteTrip: s.deleteTrip,
      updateTrip: s.updateTrip,
    }))
  )
  const { addToast } = useUiStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => { loadTrips() }, [loadTrips])

  const trip = trips.find((t) => t.id === id)

  if (!loading && trips.length > 0 && !trip) {
    notFound()
  }

  if (loading || !trip) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--muted)]">
        Loading…
      </div>
    )
  }

  const handleDelete = async () => {
    await deleteTrip(trip.id)
    addToast('Trip deleted.', 'info')
    router.replace('/trips')
  }

  const handleSaveName = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    await updateTrip(trip.id, { name: trimmed })
    addToast('Trip name updated.', 'success')
    setEditingName(false)
  }

  return (
    <>
      {/* Back */}
      <Link
        href="/trips"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={14} aria-hidden="true" /> All trips
      </Link>

      {/* Header */}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                className="field text-2xl font-normal"
                aria-label="Edit trip name"
              />
              <button onClick={handleSaveName} className="primary-button text-sm">Save</button>
              <button onClick={() => setEditingName(false)} className="secondary-button text-sm">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="font-sans text-4xl">{trip.name}</h1>
              <button
                type="button"
                onClick={() => { setNameInput(trip.name); setEditingName(true) }}
                aria-label="Edit trip name"
                className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)]"
              >
                <Edit2 size={15} aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="mt-2 flex items-center gap-1.5 text-sm text-[var(--muted)]">
            <Calendar size={13} aria-hidden="true" />
            {formatDate(trip.startDate)}
            {trip.startDate !== trip.endDate && <> – {formatDate(trip.endDate)}</>}
          </div>
          {trip.description && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              {trip.description}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {trip.archivedAt ? (
            <button
              type="button"
              onClick={async () => { await restoreTrip(trip.id); addToast('Trip restored.', 'success') }}
              className="secondary-button"
            >
              Restore trip
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => { await archiveTrip(trip.id); addToast('Trip archived.', 'info') }}
              className="secondary-button"
            >
              Archive
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete trip"
            className="secondary-button text-[var(--coral)]"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Feature tabs placeholder — Phase 3 will add real media gallery */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="surface-card flex flex-col items-center gap-3 py-8 text-center">
          <div className="icon-box size-12">
            <ImageIcon size={22} aria-hidden="true" />
          </div>
          <p className="text-sm font-medium">Photos</p>
          <p className="text-2xl font-normal">0</p>
          <p className="text-xs text-[var(--muted)]">Media library coming in Phase 3</p>
        </div>
        <div className="surface-card flex flex-col items-center gap-3 py-8 text-center">
          <div className="icon-box size-12">
            <Video size={22} aria-hidden="true" />
          </div>
          <p className="text-sm font-medium">Videos</p>
          <p className="text-2xl font-normal">0</p>
          <p className="text-xs text-[var(--muted)]">Media library coming in Phase 3</p>
        </div>
        <div className="surface-card flex flex-col items-center gap-3 py-8 text-center">
          <div className="icon-box size-12">
            <Package size={22} aria-hidden="true" />
          </div>
          <p className="text-sm font-medium">Export & Share</p>
          <p className="text-xs text-[var(--muted)]">ZIP export coming in Phase 4</p>
          <Link href={`/trips/${trip.id}/export`} className="secondary-button text-xs">
            Open export
          </Link>
        </div>
      </div>

      {/* Gallery placeholder */}
      <div className="mt-10">
        <p className="eyebrow">Media</p>
        <h2 className="mt-1 font-sans text-2xl">Gallery</h2>
        <EmptyState
          title="No media imported yet"
          description="Media library access will be available in Phase 3 after Capacitor integration."
        />
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this trip?"
          message={`"${trip.name}" will be permanently removed. Your original camera roll photos are not affected.`}
          confirmLabel="Delete trip"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}

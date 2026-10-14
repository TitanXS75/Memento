'use client'

import { Package, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ArchivesModal } from '@/components/app/ArchivesModal'
import { CreateTripModal } from '@/components/app/CreateTripModal'
import { EmptyState } from '@/components/app/EmptyState'
import { TripCard } from '@/components/app/TripCard'
import { useArchivesStore } from '@/lib/store/archives'
import { useTripsStore } from '@/lib/store/trips'
import { useUiStore } from '@/lib/store/ui'

export default function TripsPage() {
  const { trips, loading, error, loadTrips, createTrip, archiveTrip, restoreTrip, deleteTrip } = useTripsStore(
    useShallow((s) => ({
      trips: s.trips,
      loading: s.loading,
      error: s.error,
      loadTrips: s.loadTrips,
      createTrip: s.createTrip,
      archiveTrip: s.archiveTrip,
      restoreTrip: s.restoreTrip,
      deleteTrip: s.deleteTrip,
    }))
  )
  const { archives, loadArchives } = useArchivesStore(
    useShallow((s) => ({ archives: s.archives, loadArchives: s.loadArchives }))
  )
  const { addToast } = useUiStore()

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showArchivesModal, setShowArchivesModal] = useState(false)

  useEffect(() => {
    loadTrips()
    loadArchives()
  }, [loadTrips, loadArchives])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return trips.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    )
  }, [trips, search])

  const displayedTrips = useMemo(() => filtered.filter((t) => !t.archivedAt), [filtered])

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your collection</p>
          <h1 className="mt-1 font-sans text-4xl">All trips</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="trips-archives-btn"
            onClick={() => setShowArchivesModal(true)}
            className="secondary-button h-11"
            aria-label="View exported ZIP archives"
          >
            <Package size={16} aria-hidden="true" />
            <span>Archives</span>
            {archives.length > 0 && (
              <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {archives.length}
              </span>
            )}
          </button>
          <button
            type="button"
            id="trips-create-btn"
            onClick={() => setShowCreate(true)}
            className="primary-button h-11"
          >
            <Plus size={16} aria-hidden="true" />
            <span>Create trip</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mt-7 flex items-center justify-between gap-3">
        <div className="flex flex-1 sm:max-w-md items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs">
          <Search size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trips by name or description…"
            aria-label="Search trips"
            className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--muted)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading && (
        <p className="mt-10 text-center text-sm text-[var(--muted)]">Loading trips…</p>
      )}

      {error && (
        <div role="alert" className="mt-6 rounded-xl bg-[var(--coral)]/10 px-4 py-3 text-sm text-[var(--coral)]">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="module-enter mt-8">
          {displayedTrips.length === 0 ? (
            <EmptyState
              title={
                search
                  ? 'No trips match your search.'
                  : 'No trips yet.'
              }
              description={
                !search
                  ? 'Create your first trip to get started.'
                  : undefined
              }
              actionLabel={!search ? 'Create a trip' : undefined}
              onAction={!search ? () => setShowCreate(true) : undefined}
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {displayedTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onArchive={async (tripId) => {
                    await archiveTrip(tripId)
                    addToast('Trip archived.', 'success')
                  }}
                  onRestore={async (tripId) => {
                    await restoreTrip(tripId)
                    addToast('Trip restored.', 'success')
                  }}
                  onDelete={async (tripId) => {
                    await deleteTrip(tripId)
                    addToast('Trip deleted.', 'info')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateTripModal
          onClose={() => setShowCreate(false)}
          onCreate={async (input) => {
            await createTrip(input)
            addToast('Trip created!', 'success')
          }}
        />
      )}

      {showArchivesModal && (
        <ArchivesModal onClose={() => setShowArchivesModal(false)} />
      )}
    </>
  )
}

'use client'

import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { CreateTripModal } from '@/components/app/CreateTripModal'
import { EmptyState } from '@/components/app/EmptyState'
import { TripCard } from '@/components/app/TripCard'
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
  const { addToast } = useUiStore()
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadTrips() }, [loadTrips])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return trips.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    )
  }, [trips, search])

  const active = filtered.filter((t) => !t.archivedAt)
  const archived = filtered.filter((t) => !!t.archivedAt)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your collection</p>
          <h1 className="mt-1 font-sans text-4xl">All trips</h1>
        </div>
        <button
          type="button"
          id="trips-create-btn"
          onClick={() => setShowCreate(true)}
          className="primary-button"
        >
          <Plus size={15} aria-hidden="true" /> Create trip
        </button>
      </div>

      {/* Search */}
      <div className="mt-7 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <Search size={17} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search trips…"
          aria-label="Search trips"
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
        />
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
          {active.length === 0 ? (
            <EmptyState
              title={search ? 'No trips match your search.' : 'No trips yet.'}
              description={!search ? 'Create your first trip to get started.' : undefined}
              actionLabel={!search ? 'Create a trip' : undefined}
              onAction={!search ? () => setShowCreate(true) : undefined}
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {active.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onArchive={async (id) => { await archiveTrip(id); addToast('Trip archived.', 'success') }}
                  onDelete={async (id) => { await deleteTrip(id); addToast('Trip deleted.', 'info') }}
                />
              ))}
            </div>
          )}

          {/* Archived trips section */}
          {archived.length > 0 && (
            <div className="mt-12">
              <button
                type="button"
                onClick={() => setShowArchived((s) => !s)}
                className="text-link text-xs"
                aria-expanded={showArchived}
              >
                {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
              </button>

              {showArchived && (
                <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 opacity-70">
                  {archived.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onRestore={async (id) => { await restoreTrip(id); addToast('Trip restored.', 'success') }}
                      onDelete={async (id) => { await deleteTrip(id); addToast('Trip deleted.', 'info') }}
                    />
                  ))}
                </div>
              )}
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
    </>
  )
}

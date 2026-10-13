'use client'

import { Archive, Package, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ArchivesModal } from '@/components/app/ArchivesModal'
import { CreateTripModal } from '@/components/app/CreateTripModal'
import { EmptyState } from '@/components/app/EmptyState'
import { TripCard } from '@/components/app/TripCard'
import { useArchivesStore } from '@/lib/store/archives'
import { useTripsStore } from '@/lib/store/trips'
import { useUiStore } from '@/lib/store/ui'

type TripFilterTab = 'active' | 'archived' | 'all'

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
  const [filterTab, setFilterTab] = useState<TripFilterTab>('active')
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

  const activeTrips = useMemo(() => filtered.filter((t) => !t.archivedAt), [filtered])
  const archivedTrips = useMemo(() => filtered.filter((t) => !!t.archivedAt), [filtered])

  const displayedTrips = useMemo(() => {
    if (filterTab === 'active') return activeTrips
    if (filterTab === 'archived') return archivedTrips
    return filtered
  }, [filterTab, activeTrips, archivedTrips, filtered])

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

      {/* Filter Tabs & Search Bar */}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterTab('active')}
            className={`rounded-full px-3.5 py-1 font-medium transition ${
              filterTab === 'active' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            Active ({activeTrips.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('archived')}
            className={`flex items-center gap-1 rounded-full px-3.5 py-1 font-medium transition ${
              filterTab === 'archived' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <Archive size={12} />
            Archived ({archivedTrips.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`rounded-full px-3.5 py-1 font-medium transition ${
              filterTab === 'all' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            All ({filtered.length})
          </button>
        </div>

        <div className="flex flex-1 sm:max-w-xs items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs">
          <Search size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trips…"
            aria-label="Search trips"
            className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--muted)]"
          />
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
                  : filterTab === 'archived'
                  ? 'No archived trips.'
                  : 'No trips yet.'
              }
              description={
                !search && filterTab === 'active'
                  ? 'Create your first trip to get started.'
                  : undefined
              }
              actionLabel={!search && filterTab === 'active' ? 'Create a trip' : undefined}
              onAction={!search && filterTab === 'active' ? () => setShowCreate(true) : undefined}
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

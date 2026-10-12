'use client'

import {
  ArrowUpRight,
  HardDrive,
  Image as ImageIcon,
  Moon,
  Plus,
  Sun,
  Video,
  Wifi,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { CreateTripModal } from '@/components/app/CreateTripModal'
import { EmptyState } from '@/components/app/EmptyState'
import { TripCard } from '@/components/app/TripCard'
import { useTripsStore } from '@/lib/store/trips'
import { useUiStore } from '@/lib/store/ui'
import { formatBytes } from '@/lib/services/hash'

export default function HomePage() {
  const { trips, loading, error, loadTrips, createTrip, archiveTrip, restoreTrip } = useTripsStore(
    useShallow((s) => ({
      trips: s.trips,
      loading: s.loading,
      error: s.error,
      loadTrips: s.loadTrips,
      createTrip: s.createTrip,
      archiveTrip: s.archiveTrip,
      restoreTrip: s.restoreTrip,
    }))
  )
  const { theme, toggleTheme, addToast } = useUiStore()
  const activeTrips = useMemo(() => trips.filter((t) => !t.archivedAt), [trips])

  const [showCreate, setShowCreate] = useState(false)
  const [availableStorage, setAvailableStorage] = useState<number | null>(null)
  const [clock, setClock] = useState<Date | null>(null)

  useEffect(() => {
    loadTrips()
    setClock(new Date())
    const timer = setInterval(() => setClock(new Date()), 1000)

    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(({ quota, usage }) => {
        if (quota != null && usage != null) {
          setAvailableStorage(Math.max(0, quota - usage))
        }
      }).catch(() => {})
    }

    return () => clearInterval(timer)
  }, [loadTrips])

  const timeLabel = clock?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) ?? '--:--'
  const dateLabel = clock?.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) ?? ''

  const handleArchive = async (id: string) => {
    await archiveTrip(id)
    addToast('Trip archived.', 'success')
  }

  const handleRestore = async (id: string) => {
    await restoreTrip(id)
    addToast('Trip restored.', 'success')
  }

  return (
    <>
      {/* Top bar */}
      <header className="flex items-center justify-between pb-6 sm:pb-8 lg:pb-10">
        <div className="flex items-center gap-2 lg:hidden">
          <svg className="size-5 text-[var(--accent)]" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="21 5" opacity="0.4" />
            <path d="M6 22 L11 11 L16 19 L21 11 L26 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="19" r="2.5" fill="var(--coral)" />
          </svg>
          <span className="font-sans text-xl">Memento</span>
        </div>
        <div className="hidden lg:block">
          <p className="eyebrow">Personal memory workspace</p>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-3xl font-normal tracking-[-0.02em]">{timeLabel}</h1>
            <p className="text-xs text-[var(--muted)]">{dateLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          className="theme-button"
        >
          {theme === 'light' ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
        </button>
      </header>

      {/* Mobile time */}
      <div className="mb-8 mt-2 lg:hidden">
        <p className="eyebrow">Personal memory workspace</p>
        <div className="mt-1 flex items-baseline gap-3">
          <p className="text-3xl font-normal tracking-[-0.02em]">{timeLabel}</p>
          <p className="text-xs text-[var(--muted)]">{dateLabel}</p>
        </div>
      </div>

      <div className="module-enter pt-2 sm:pt-4">
        {/* Hero + Storage */}
        <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          <div className="hero-card">
            <p className="eyebrow relative text-white/60">Your memories, your way</p>
            <h2 className="relative mt-5 max-w-[390px] font-sans text-[36px] leading-[0.98] tracking-[-0.05em] sm:text-[46px]">
              Keep the good<br />stuff close.
            </h2>
            <p className="relative mt-5 max-w-[310px] text-sm leading-relaxed text-white/65">
              Collect original photos with your people. No signal, no servers, no compromises.
            </p>
            <div className="relative mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="primary-light"
                id="home-create-trip-btn"
              >
                <Plus size={17} aria-hidden="true" />
                Create a trip
              </button>
              <Link href="/nearby" className="primary-light">
                <Wifi size={17} aria-hidden="true" />
                Nearby
              </Link>
            </div>
          </div>

          {/* Storage card */}
          <div className="surface-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Available storage</p>
                <p className="mt-2 font-sans text-4xl">
                  {availableStorage === null ? '—' : formatBytes(availableStorage)}
                </p>
              </div>
              <div className="icon-box">
                <HardDrive size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="mt-7 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
              <div className="h-full w-0 rounded-full bg-[var(--accent)]" />
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted)]">
              Quota reported by this browser — not total device storage.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-5">
              <div className="flex items-center gap-3">
                <div className="icon-box"><ImageIcon size={17} aria-hidden="true" /></div>
                <div>
                  <p className="eyebrow">Photos</p>
                  <p className="mt-0.5 text-sm font-medium">0</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="icon-box"><Video size={17} aria-hidden="true" /></div>
                <div>
                  <p className="eyebrow">Videos</p>
                  <p className="mt-0.5 text-sm font-medium">0</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent trips */}
        <div className="mt-10 flex items-end justify-between">
          <div>
            <p className="eyebrow">Your collection</p>
            <h2 className="mt-1 font-sans text-2xl">Recent trips</h2>
          </div>
          <Link href="/trips" className="text-link">
            View all <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>

        {loading && (
          <div className="mt-6 flex justify-center py-8 text-sm text-[var(--muted)]">
            Loading trips…
          </div>
        )}

        {error && (
          <div role="alert" className="mt-6 rounded-xl bg-[var(--coral)]/10 px-4 py-3 text-sm text-[var(--coral)]">
            {error}
          </div>
        )}

        {!loading && !error && (
          activeTrips.slice(0, 3).length === 0 ? (
            <EmptyState
              title="No trips yet"
              description="Create your first trip to start collecting memories."
              actionLabel="Create a trip"
              onAction={() => setShowCreate(true)}
            />
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {activeTrips.slice(0, 3).map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          )
        )}
      </div>

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

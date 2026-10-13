'use client'

import {
  ArrowUpRight,
  Globe,
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
import { Logo } from '@/components/app/Logo'
import { TripCard } from '@/components/app/TripCard'
import { useTripsStore } from '@/lib/store/trips'
import { useUiStore } from '@/lib/store/ui'
import { formatBytes } from '@/lib/services/hash'
import { openNearbyServices } from '@/lib/services/media'
import { calculateStorageStats, getStoredStorageStats, type StorageStats } from '@/lib/services/storage'
import { RefreshCw } from 'lucide-react'

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
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
  const [isRefreshingStorage, setIsRefreshingStorage] = useState(false)
  const [clock, setClock] = useState<Date | null>(null)

  const refreshStorage = async () => {
    setIsRefreshingStorage(true)
    try {
      const stats = await calculateStorageStats()
      setStorageStats(stats)
    } finally {
      setIsRefreshingStorage(false)
    }
  }

  useEffect(() => {
    loadTrips()
    setClock(new Date())
    const timer = setInterval(() => setClock(new Date()), 1000)

    // Load initial cached stats then calculate live
    const cached = getStoredStorageStats()
    if (cached) setStorageStats(cached)
    calculateStorageStats().then(setStorageStats).catch(() => {})

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

  const handleNearbyServices = async () => {
    try {
      const opened = await openNearbyServices({
        title: 'Memento — Nearby Share',
        text: 'Share memories offline directly with Memento.',
      })
      if (!opened) {
        // Fallback for desktop browsers without Web Share
        window.location.href = '/nearby'
      }
    } catch {
      window.location.href = '/nearby'
    }
  }

  return (
    <>
      {/* Top bar */}
      <header className="flex items-center justify-between pb-3 sm:pb-4">
        <div className="flex items-center gap-2 lg:hidden">
          <Logo className="size-6 text-[var(--accent)]" />
          <span className="font-sans text-xl">Memento</span>
        </div>
        <div className="hidden lg:block">
          <p className="eyebrow">Personal memory workspace</p>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-3xl font-normal tracking-[-0.02em]">{timeLabel}</h1>
            <p className="text-xs text-[var(--muted)]">{dateLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNearbyServices}
            id="home-nearby-btn"
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
            aria-label="Open Nearby / Quick Share"
          >
            Nearby
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="theme-button"
          >
            {theme === 'light' ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* Mobile time */}
      <div className="mb-5 mt-1 lg:hidden">
        <p className="eyebrow">Personal memory workspace</p>
        <div className="mt-1 flex items-baseline gap-3">
          <p className="text-3xl font-normal tracking-[-0.02em]">{timeLabel}</p>
          <p className="text-xs text-[var(--muted)]">{dateLabel}</p>
        </div>
      </div>

      <div className="module-enter mt-2">
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
                  {storageStats ? formatBytes(storageStats.availableBytes) : '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshStorage}
                  disabled={isRefreshingStorage}
                  aria-label="Recalculate device storage"
                  className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)] transition"
                >
                  <RefreshCw size={15} className={isRefreshingStorage ? 'animate-spin text-[var(--accent)]' : ''} />
                </button>
                <div className="icon-box">
                  <HardDrive size={18} aria-hidden="true" />
                </div>
              </div>
            </div>
            <div className="mt-7 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                style={{
                  width: `${storageStats ? Math.max(2, Math.min(100, Math.round((storageStats.usedBytes / storageStats.totalBytes) * 100))) : 0}%`,
                }}
              />
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted)]">
              {storageStats
                ? `${formatBytes(storageStats.usedBytes)} used of ${formatBytes(storageStats.totalBytes)} total space`
                : 'Calculating device storage…'}
            </p>

            {storageStats?.environment.isWeb && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--surface-strong)] p-2.5 text-[11px] text-[var(--muted)] leading-relaxed">
                <Globe size={13} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <p>
                  <strong>Can&apos;t detect physical phone storage</strong> — You are using {storageStats.environment.browserName} on the web. Showing browser sandbox quota.
                </p>
              </div>
            )}
            <div className="mt-7 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-5">
              <div className="flex items-center gap-3">
                <div className="icon-box"><ImageIcon size={17} aria-hidden="true" /></div>
                <div>
                  <p className="eyebrow">Photos</p>
                  <p className="mt-0.5 text-sm font-medium">{storageStats?.photosCount ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="icon-box"><Video size={17} aria-hidden="true" /></div>
                <div>
                  <p className="eyebrow">Videos</p>
                  <p className="mt-0.5 text-sm font-medium">{storageStats?.videosCount ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent trips */}
        <div className="mt-6 flex items-end justify-between">
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

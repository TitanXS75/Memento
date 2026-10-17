'use client'

import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Moon,
  Plus,
  Sun,
  Video,
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
  const [isRecentTripsOpen, setIsRecentTripsOpen] = useState(false)
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

    // Load cached stats on client mount first to avoid SSR hydration mismatch
    const cached = getStoredStorageStats()
    if (cached) setStorageStats(cached)

    // Calculate live immediately after getting access
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
      <header className="flex items-center justify-between pb-2 sm:pb-3">
        <div className="flex items-center gap-2">
          <Logo className="size-6 text-[var(--accent)]" />
          <span className="font-sans text-xl">Memento</span>
        </div>
        <div className="hidden sm:block text-center">
          <p className="eyebrow text-[10px]">Personal memory workspace</p>
          <div className="mt-0.5 flex items-baseline justify-center gap-2">
            <span className="text-xl font-normal tracking-[-0.02em]">{timeLabel}</span>
            <span className="text-xs text-[var(--muted)]">{dateLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNearbyServices}
            id="home-nearby-btn"
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
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
            {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <div className="module-enter mt-1 sm:mt-2">
        {/* Hero + Storage Cards Grid */}
        <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="hero-card !p-4 sm:!p-6 rounded-2xl">
            <p className="eyebrow relative text-white/60 text-[10px]">Your memories, your way</p>
            <h2 className="relative mt-2 max-w-[390px] font-sans text-2xl sm:text-3xl font-normal leading-tight tracking-[-0.03em]">
              Keep the good<br />stuff close.
            </h2>
            <p className="relative mt-2 max-w-[320px] text-xs sm:text-sm leading-relaxed text-white/70">
              Collect original photos with your people. No signal, no servers, no compromises.
            </p>
          </div>

          {/* Storage card */}
          <div className="surface-card !p-4 sm:!p-5 rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow text-[10px]">Device Media Storage</p>
                <p className="mt-1 font-sans text-3xl sm:text-4xl">
                  {storageStats ? formatBytes(storageStats.mediaBytes) : 'Calculating…'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshStorage}
                  disabled={isRefreshingStorage}
                  aria-label="Recalculate media storage"
                  className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface-strong)] transition"
                >
                  <RefreshCw size={14} className={isRefreshingStorage ? 'animate-spin text-[var(--accent)]' : ''} />
                </button>
                <div className="icon-box">
                  <HardDrive size={16} aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Split bar: Photos vs Videos */}
            <div className="mt-4 sm:mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)] flex">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-500"
                style={{
                  width: `${
                    storageStats && storageStats.mediaBytes > 0
                      ? Math.max(storageStats.photosBytes > 0 ? 5 : 0, Math.round((storageStats.photosBytes / storageStats.mediaBytes) * 100))
                      : 50
                  }%`,
                }}
                title={`Photos: ${storageStats ? formatBytes(storageStats.photosBytes) : '0 B'}`}
              />
              <div
                className="h-full bg-[var(--coral)] transition-all duration-500"
                style={{
                  width: `${
                    storageStats && storageStats.mediaBytes > 0
                      ? Math.max(storageStats.videosBytes > 0 ? 5 : 0, Math.round((storageStats.videosBytes / storageStats.mediaBytes) * 100))
                      : 50
                  }%`,
                }}
                title={`Videos: ${storageStats ? formatBytes(storageStats.videosBytes) : '0 B'}`}
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--muted)]">
              <span className="truncate">
                {storageStats
                  ? `${storageStats.photosCount + storageStats.videosCount} media files on device`
                  : 'Scanning device media…'}
              </span>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-[var(--accent)]" /> Photos
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-[var(--coral)]" /> Videos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Recent Trips Section to fit 1 view */}
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-3.5 shadow-xs">
          <button
            type="button"
            onClick={() => setIsRecentTripsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={isRecentTripsOpen}
            aria-label="Toggle recent trips"
          >
            <div className="flex items-center gap-2">
              <span className="font-sans text-base font-medium text-[var(--foreground)]">Recent trips</span>
              <span className="rounded-full bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                {activeTrips.length}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/trips"
                onClick={(e) => e.stopPropagation()}
                className="text-link text-xs flex items-center gap-1"
              >
                View all <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
              <div className="rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface-strong)] transition">
                {isRecentTripsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </button>

          {isRecentTripsOpen && (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              {loading && (
                <div className="flex justify-center py-4 text-xs text-[var(--muted)]">
                  Loading trips…
                </div>
              )}

              {error && (
                <div role="alert" className="rounded-xl bg-[var(--coral)]/10 px-3 py-2 text-xs text-[var(--coral)]">
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
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          )}
        </div>
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

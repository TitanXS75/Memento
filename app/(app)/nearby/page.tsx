'use client'

import { Info, Wifi } from 'lucide-react'
import { useState } from 'react'

type DiscoveryStatus = 'idle' | 'discovering' | 'stopped'

export default function NearbyPage() {
  const [status, setStatus] = useState<DiscoveryStatus>('idle')

  const toggle = () => {
    setStatus((s) => (s === 'discovering' ? 'stopped' : 'discovering'))
  }

  return (
    <>
      <p className="eyebrow">Direct transfer</p>
      <h1 className="mt-1 font-sans text-4xl">Nearby devices</h1>

      {/* PC 2-column layout */}
      <div className="module-enter mt-7 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        {/* Hero */}
        <div className="hero-card">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10">
            <Wifi size={25} aria-hidden="true" />
          </div>
          <h2 className="mt-7 font-sans text-3xl">
            Share original files.<br />No internet needed.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
            Both devices must be on the same Wi-Fi network or personal hotspot.
            We never upload your media.
          </p>
          <button
            type="button"
            onClick={toggle}
            className="primary-light mt-7"
            id="nearby-discover-btn"
          >
            {status === 'discovering' ? 'Stop looking' : 'Find nearby devices'}
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Status card */}
          <div className="surface-card">
            <div className="flex items-center gap-3">
              <div
                className={`size-2.5 rounded-full transition-colors ${
                  status === 'discovering'
                    ? 'animate-pulse bg-[var(--coral)]'
                    : 'bg-[var(--muted)]'
                }`}
                aria-hidden="true"
              />
              <p className="text-sm font-medium">
                {status === 'discovering'
                  ? 'Looking for devices nearby…'
                  : status === 'stopped'
                  ? 'Discovery stopped'
                  : 'Ready to discover'}
              </p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              {status === 'discovering'
                ? 'Keep Memento open on the other device. Discovery will time out after 30 seconds with no devices found.'
                : 'Start discovery when both devices are on the same network and ready.'}
            </p>
          </div>

          {/* Requirement notice */}
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <Wifi size={16} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
            <p className="text-xs text-[var(--muted)]">
              Direct peer transfer over shared Wi-Fi or mobile hotspot. No cloud or internet needed.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

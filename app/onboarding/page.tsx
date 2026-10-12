'use client'

import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [welcomed, setWelcomed] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('memento-profile')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.name) {
          router.replace('/home')
        }
      }
    } catch {
      // ignore
    }
  }, [router])

  const canContinue = name.trim().length > 1

  const handleComplete = () => {
    const profile = { name: name.trim(), createdAt: new Date().toISOString() }
    try {
      localStorage.setItem('memento-profile', JSON.stringify(profile))
    } catch {
      // ignore
    }
    router.replace('/home')
  }

  return (
    <main className="onboarding-shell">
      <div className="onboarding-orb onboarding-orb-one" />
      <div className="onboarding-orb onboarding-orb-two" />
      <section className="onboarding-panel onboarding-panel-simple">
        {!welcomed ? (
          <div className="onboarding-form onboarding-form-centered">
            <p className="eyebrow text-[var(--accent)]">A private memory space</p>
            <h1 className="mt-5 font-sans text-6xl leading-[.92] tracking-[-.06em] sm:text-8xl">
              Memento
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--muted)]">
              Your photos, trips, and shared moments — kept close, offline, and entirely yours.
            </p>
            <label className="mt-10 block text-xs font-medium text-[var(--muted)]">
              What should we call you?
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canContinue) {
                    setWelcomed(true)
                  }
                }}
                className="field mt-2"
                placeholder="Your name"
                autoComplete="name"
                autoFocus
              />
            </label>
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => setWelcomed(true)}
              className="primary-button mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="onboarding-form onboarding-form-centered" key="welcome">
            <p className="eyebrow text-[var(--accent)]">Welcome to memento</p>
            <h1 className="mt-5 font-sans text-6xl leading-[.92] tracking-[-.06em] sm:text-8xl">
              Hello, {name.trim()}.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--muted)]">
              Your private space is ready. Let&apos;s keep the good stuff close.
            </p>
            <button
              type="button"
              onClick={handleComplete}
              className="primary-button mt-10 w-full justify-center"
            >
              Enter memento <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

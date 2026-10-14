'use client'

import {
  CheckCircle2,
  ChevronRight,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/app/Logo'
import {
  calculateStorageStats,
  requestStorageAndMediaPermissions,
  type StorageStats,
} from '@/lib/services/storage'

type OnboardingStep = 'name' | 'permissions' | 'ready'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>('name')
  const [name, setName] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [calcStatusText, setCalcStatusText] = useState('')

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

  const handleGrantAndCalculate = async () => {
    setIsCalculating(true)
    setCalcStatusText('Requesting media & storage access…')

    try {
      await requestStorageAndMediaPermissions()
      setCalcStatusText('Calculating device media storage…')
      await calculateStorageStats()
      setCalcStatusText('Storage calculated successfully.')
      await new Promise((r) => setTimeout(r, 400))
      setStep('ready')
    } catch (err) {
      console.error(err)
      await calculateStorageStats().catch(() => {})
      setStep('ready')
    } finally {
      setIsCalculating(false)
    }
  }

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
    <main className="onboarding-shell flex items-center justify-center">
      <div className="onboarding-orb onboarding-orb-one" />
      <div className="onboarding-orb onboarding-orb-two" />
      <section className="onboarding-panel onboarding-panel-simple flex flex-col items-center justify-center text-center">
        {step === 'name' && (
          <div className="onboarding-form onboarding-form-centered mx-auto flex flex-col items-center text-center">
            <Logo className="mx-auto mb-4 size-14 text-[var(--accent)]" />
            <p className="eyebrow text-[var(--accent)]">A private memory space</p>
            <h1 className="mt-4 font-sans text-6xl leading-[.92] tracking-[-.06em] sm:text-8xl">
              Memento
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--muted)]">
              Your photos, trips, and shared moments — kept close, offline, and entirely yours.
            </p>
            <label className="mt-8 block w-full max-w-sm text-xs font-medium text-[var(--muted)]">
              What should we call you?
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canContinue) {
                    setStep('permissions')
                  }
                }}
                className="field mt-2 text-center"
                placeholder="Your name"
                autoComplete="name"
                autoFocus
              />
            </label>
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => setStep('permissions')}
              className="primary-button mt-5 w-full max-w-sm justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 'permissions' && (
          <div className="onboarding-form onboarding-form-centered mx-auto flex flex-col items-center text-center" key="permissions">
            <Logo className="mx-auto mb-2 size-10 text-[var(--accent)]" />
            <p className="eyebrow text-[var(--accent)]">Step 2 of 2 · Device Setup</p>
            <h1 className="mt-3 font-sans text-5xl leading-[.94] tracking-[-.05em] sm:text-7xl">
              Storage & Media
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--muted)]">
              Memento calculates your device storage and secures photos locally without cloud servers.
            </p>

            <div className="mt-6 w-full max-w-md space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left">
                <div className="icon-box shrink-0 mt-0.5">
                  <HardDrive size={18} className="text-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-sm font-medium">Persistent Storage Access</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    Calculates available space and requests persistent quota so browser never evicts your offline memories.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left">
                <div className="icon-box shrink-0 mt-0.5">
                  <ImageIcon size={18} className="text-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-sm font-medium">Media & Photo Access</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    Enables selecting original quality photos and videos for peer-to-peer exchange. Zero cloud uploads.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isCalculating}
              onClick={handleGrantAndCalculate}
              className="primary-button mt-7 w-full max-w-md justify-center disabled:opacity-50"
            >
              {isCalculating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{calcStatusText}</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Grant Permissions & Calculate Storage</span>
                </>
              )}
            </button>
          </div>
        )}

        {step === 'ready' && (
          <div className="onboarding-form onboarding-form-centered mx-auto flex flex-col items-center text-center" key="ready">
            <div className="flex size-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] mx-auto">
              <CheckCircle2 size={26} />
            </div>
            <p className="eyebrow mt-4 text-[var(--accent)] text-center">Setup Complete</p>
            <h1 className="mt-2 font-sans text-5xl leading-[.94] tracking-[-.05em] sm:text-7xl">
              Hello, {name.trim()}.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--muted)]">
              Your private space is ready. Let&apos;s keep the good stuff close.
            </p>
            <button
              type="button"
              onClick={handleComplete}
              className="primary-button mt-8 w-full max-w-sm justify-center"
            >
              Enter Memento <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

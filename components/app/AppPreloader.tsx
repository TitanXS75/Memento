'use client'

import { useEffect, useState } from 'react'
import { Logo } from '@/components/app/Logo'

interface AppPreloaderProps {
  brandName?: string
  minDuration?: number
}

export function AppPreloader({
  brandName = 'Memento',
  minDuration = 1400,
}: AppPreloaderProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    const startTime = Date.now()

    const handleComplete = () => {
      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(0, minDuration - elapsed)

      setTimeout(() => {
        setIsFadingOut(true)
        // Smooth fade out duration: 600ms
        setTimeout(() => {
          setIsVisible(false)
        }, 600)
      }, remainingTime)
    }

    if (document.readyState === 'complete') {
      handleComplete()
    } else {
      window.addEventListener('load', handleComplete, { once: true })
      const fallbackTimeout = setTimeout(handleComplete, minDuration + 400)
      return () => {
        clearTimeout(fallbackTimeout)
        window.removeEventListener('load', handleComplete)
      }
    }
  }, [minDuration])

  if (!isVisible) return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--background)] px-6 transition-all duration-600 ease-out ${
        isFadingOut
          ? 'opacity-0 pointer-events-none'
          : 'opacity-100'
      }`}
    >
      {/* Brand Icon Mark - Theme purple background */}
      <div className="mb-5 flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20 transition-transform duration-300">
        <Logo className="size-7 sm:size-8 text-white" />
      </div>

      {/* Brand Title - Same font-sans as inside the app */}
      <h1 className="text-[var(--foreground)] font-sans font-normal text-3xl sm:text-4xl tracking-[-0.03em] text-center select-none">
        {brandName}
      </h1>

      <p className="eyebrow mt-2 text-[10px] sm:text-xs tracking-[0.22em] text-[var(--muted)]">
        Private Offline Memories
      </p>

      {/* Subtle Breathing Theme Indicator Dots */}
      <div className="mt-7 flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-[var(--accent)]/30 animate-pulse [animation-delay:0ms]" />
        <span className="size-1.5 rounded-full bg-[var(--accent)]/60 animate-pulse [animation-delay:200ms]" />
        <span className="size-1.5 rounded-full bg-[var(--accent)] animate-pulse [animation-delay:400ms]" />
      </div>
    </div>
  )
}

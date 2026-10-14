'use client'

import { useEffect, useState } from 'react'
import { Logo } from '@/components/app/Logo'

interface AppPreloaderProps {
  brandName?: string
  minDuration?: number
}

export function AppPreloader({
  brandName = 'Memento',
  minDuration = 1600,
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
        // Smooth dissolve duration: 800ms
        setTimeout(() => {
          setIsVisible(false)
        }, 800)
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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--background)] px-6 transition-all duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFadingOut
          ? 'scale-[1.05] opacity-0 blur-[2px] pointer-events-none'
          : 'scale-100 opacity-100 blur-0'
      }`}
    >
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.92); opacity: 0.35; }
          50% { transform: scale(1.08); opacity: 0.8; }
          100% { transform: scale(0.92); opacity: 0.35; }
        }
        @keyframes gentle-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 3.2s ease-in-out infinite;
        }
        .animate-gentle-rotate {
          animation: gentle-rotate 24s linear infinite;
        }
      `}</style>

      {/* Ambient background memory glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-80 sm:size-96 rounded-full bg-sky-400/15 blur-3xl" />
      </div>

      {/* Central Memory Aperture Emblem */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Outer orbital decorative ring */}
        <div className="absolute size-24 sm:size-28 rounded-full border border-dashed border-sky-400/30 animate-gentle-rotate" />
        
        {/* Soft breathing halo ring */}
        <div className="absolute size-20 sm:size-24 rounded-full border border-sky-400/25 animate-pulse-ring" />

        {/* Brand Core Icon - Sky blue background */}
        <div className="relative flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-sky-400 text-white shadow-xl shadow-sky-400/35 transition-transform duration-500 hover:scale-105">
          <Logo className="size-7 sm:size-8 text-white" />
        </div>
      </div>

      {/* Brand Title - Same font-sans as inside the app */}
      <h1 className="text-[var(--foreground)] font-sans font-normal text-3xl sm:text-4xl tracking-[-0.03em] text-center select-none">
        {brandName}
      </h1>

      <p className="eyebrow mt-2 text-[10px] sm:text-xs tracking-[0.22em] text-[var(--muted)]">
        Private Offline Memories
      </p>

      {/* Subtle Breathing Memory Indicator Dots */}
      <div className="mt-8 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-sky-400/40 animate-pulse [animation-delay:0ms]" />
        <span className="size-1.5 rounded-full bg-sky-400/80 animate-pulse [animation-delay:300ms]" />
        <span className="size-1.5 rounded-full bg-sky-400 animate-pulse [animation-delay:600ms]" />
      </div>
    </div>
  )
}

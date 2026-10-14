'use client'

import { useEffect, useState } from 'react'
import { Logo } from '@/components/app/Logo'

interface AppPreloaderProps {
  brandName?: string
  minDuration?: number
}

export function AppPreloader({
  brandName = 'MEMENTO',
  minDuration = 1800,
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
        // After curtain exit transition finishes (1000ms), unmount
        setTimeout(() => {
          setIsVisible(false)
        }, 1000)
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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--background)] overflow-hidden px-6 transition-all duration-1000 ease-[cubic-bezier(0.77,0,0.175,1)] ${
        isFadingOut
          ? '-translate-y-full opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <style>{`
        @keyframes preloader-bar {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(380%); }
        }
        .animate-preloader-bar {
          animation: preloader-bar 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>

      {/* Brand Icon Mark */}
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-2xl shadow-[var(--accent)]/25">
        <Logo className="size-9 text-white" />
      </div>

      {/* Brand Title - Instrument Serif font */}
      <div className="text-[var(--foreground)] font-serif font-light tracking-[0.3em] sm:tracking-[0.45em] md:tracking-[0.6em] text-3xl sm:text-4xl md:text-5xl text-center select-none">
        {brandName}
      </div>

      <p className="eyebrow mt-3 text-[10px] tracking-[0.28em] text-[var(--muted)]">
        Private Offline Memories
      </p>

      {/* Minimalist 1.5px Track with Smooth Gliding Line */}
      <div className="mt-8 w-44 sm:w-60 h-[1.5px] bg-[var(--accent)]/15 overflow-hidden relative rounded-full">
        <div className="absolute top-0 left-0 h-full w-1/3 bg-[var(--accent)] animate-preloader-bar rounded-full" />
      </div>
    </div>
  )
}

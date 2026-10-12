'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/app/Logo'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('memento-profile')
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile)
        if (parsed?.name) {
          router.replace('/home')
          return
        }
      }
    } catch {
      // ignore
    }
    router.replace('/onboarding')
  }, [router])

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]"
      aria-label="Loading memento"
    >
      <div className="flex flex-col items-center gap-3">
        <Logo className="size-12 text-[var(--accent)]" />
        <div className="size-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        <span className="font-sans text-xl tracking-tight">Memento</span>
      </div>
    </main>
  )
}

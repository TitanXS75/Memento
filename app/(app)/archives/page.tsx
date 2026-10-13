'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ArchivesPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/trips')
  }, [router])

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-xs text-[var(--muted)]">
      Redirecting to trips…
    </div>
  )
}

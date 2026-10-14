'use client'

import { useEffect, useState } from 'react'
import { BottomNav, Sidebar } from '@/components/app/BottomNav'
import { ToastContainer } from '@/components/app/Toast'
import { AppUpdatePrompt } from '@/components/app/AppUpdatePrompt'
import { initTheme, useUiStore } from '@/lib/store/ui'

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'M'
  )
}

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { toggleTheme } = useUiStore()
  const [profileName, setProfileName] = useState<string>('Me')
  const [showEditName, setShowEditName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    initTheme()
    // Restore profile name
    try {
      const raw = localStorage.getItem('memento-profile')
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string }
        if (parsed.name) setProfileName(parsed.name)
      }
    } catch {
      // ignore
    }
  }, [])

  const saveProfileName = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setProfileName(trimmed)
    try {
      localStorage.setItem('memento-profile', JSON.stringify({ name: trimmed }))
    } catch {
      // ignore
    }
    setShowEditName(false)
  }

  const initials = getInitials(profileName)

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        profileInitials={initials}
        onEditProfile={() => { setNameInput(profileName); setShowEditName(true) }}
      />

      <main className="min-w-0 flex-1 px-5 pb-28 pt-6 sm:px-8 lg:px-12 lg:pb-10 lg:pt-8">
        {children}
      </main>

      <BottomNav />
      <ToastContainer />
      <AppUpdatePrompt />

      {/* Edit name modal */}
      {showEditName && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditName(false) }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-name-title"
          >
            <p className="eyebrow">Personal details</p>
            <h2 id="edit-name-title" className="mt-1 font-sans text-3xl">
              Your display name
            </h2>
            <label className="mt-7 block text-xs font-medium text-[var(--muted)]">
              Name
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveProfileName() }}
                className="field mt-2"
              />
            </label>
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEditName(false)}
                className="secondary-button flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfileName}
                disabled={!nameInput.trim()}
                className="primary-button flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

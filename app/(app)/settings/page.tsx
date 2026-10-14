'use client'

import { Check, Moon, Shield, Smartphone, Sun } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { useUiStore } from '@/lib/store/ui'

export default function SettingsPage() {
  const { theme, toggleTheme, addToast } = useUiStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  return (
    <>
      <p className="eyebrow">Preferences</p>
      <h1 className="mt-1 font-sans text-4xl">Settings</h1>

      <div className="module-enter mt-8 max-w-xl space-y-4">

        {/* Appearance */}
        <div className="surface-card">
          <p className="eyebrow mb-4">Appearance</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'light'
                ? <Moon size={18} className="text-[var(--accent)]" aria-hidden="true" />
                : <Sun size={18} className="text-[var(--accent)]" aria-hidden="true" />
              }
              <div>
                <p className="text-sm font-medium">
                  {theme === 'light' ? 'Light mode' : 'Dark mode'}
                </p>
                <p className="text-xs text-[var(--muted)]">Toggle the app theme</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Toggle dark mode"
              onClick={toggleTheme}
              className={`toggle ${theme === 'dark' ? 'toggle-on' : ''}`}
            >
              <span />
            </button>
          </div>
        </div>

        {/* Privacy */}
        <div className="surface-card">
          <p className="eyebrow mb-4">Privacy</p>
          <div className="flex items-center gap-4">
            <Shield className="text-[var(--accent)]" size={20} aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium">No cloud uploads</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Media stays on this device unless you explicitly share it.
              </p>
            </div>
            <Check className="text-[var(--accent)]" size={17} aria-hidden="true" />
          </div>
        </div>

        {/* Device */}
        <div className="surface-card">
          <p className="eyebrow mb-4">Device</p>
          <div className="flex items-center gap-4">
            <Smartphone className="text-[var(--accent)]" size={20} aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium">Native app</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Android and iOS support via Capacitor.
              </p>
            </div>
          </div>
        </div>

        {/* Reset / Onboarding re-run option */}
        <div className="surface-card">
          <p className="eyebrow mb-4">Storage Permissions</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Reset Profile & Recalculate</p>
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                Re-opens the welcome setup screen to review storage & media permissions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="secondary-button shrink-0 self-start sm:self-auto text-xs"
            >
              Setup Wizard
            </button>
          </div>
        </div>

        {/* App identity footer */}
        <p className="text-center text-[11px] text-[var(--muted)]">
          Memento · Private Offline Trip Memory Sharing
        </p>
      </div>

      {showResetConfirm && (
        <ConfirmDialog
          title="Restart Setup Wizard?"
          message="This will reset your local profile name and re-open the initial setup wizard to review permissions. Your saved trips and memories will remain intact."
          confirmLabel="Restart Wizard"
          cancelLabel="Cancel"
          destructive={false}
          onConfirm={() => {
            try {
              localStorage.removeItem('memento-profile')
              window.location.href = '/onboarding'
            } catch {}
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </>
  )
}

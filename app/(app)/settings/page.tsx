'use client'

import { Check, Moon, RefreshCw, Shield, Smartphone, Sparkles, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { useUiStore } from '@/lib/store/ui'
import {
  APP_VERSION,
  applyAppUpdate,
  checkForAppUpdate,
  isAutoUpdateEnabled,
  setAutoUpdateEnabled,
} from '@/lib/services/update'

export default function SettingsPage() {
  const { theme, toggleTheme, addToast } = useUiStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setAutoUpdate(isAutoUpdateEnabled())
  }, [])

  const handleToggleAutoUpdate = () => {
    const next = !autoUpdate
    setAutoUpdate(next)
    setAutoUpdateEnabled(next)
    addToast(next ? 'Auto-update enabled' : 'Auto-update disabled', 'info')
  }

  const handleManualCheckUpdate = async () => {
    setIsCheckingUpdate(true)
    setUpdateStatus(null)
    try {
      const res = await checkForAppUpdate()
      if (res.hasUpdate) {
        setUpdateStatus('New update available!')
        addToast('New update found! Click Update to apply.', 'success')
      } else {
        setUpdateStatus('Your app is up to date.')
        addToast('Memento is up to date.', 'info')
      }
    } catch {
      setUpdateStatus('Could not reach update server.')
    } finally {
      setIsCheckingUpdate(false)
    }
  }

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

        {/* App Updates & Auto-update */}
        <div className="surface-card">
          <p className="eyebrow mb-4">App Updates</p>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Version {APP_VERSION}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {updateStatus ?? 'Checks for latest features whenever opened.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {updateStatus === 'New update available!' && (
                  <button
                    type="button"
                    onClick={() => applyAppUpdate()}
                    className="primary-button text-xs py-1.5 px-3"
                  >
                    <Sparkles size={13} />
                    <span>Update now</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleManualCheckUpdate}
                  disabled={isCheckingUpdate}
                  className="secondary-button shrink-0 self-start sm:self-auto text-xs"
                >
                  <RefreshCw size={13} className={isCheckingUpdate ? 'animate-spin text-[var(--accent)]' : ''} />
                  <span>{isCheckingUpdate ? 'Checking…' : 'Check for updates'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
              <div>
                <p className="text-sm font-medium">Automatic updates</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Promptless silent update when a new version is pushed.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={mounted ? autoUpdate : false}
                aria-label="Toggle auto-update"
                onClick={handleToggleAutoUpdate}
                className={`toggle ${mounted && autoUpdate ? 'toggle-on' : ''}`}
              >
                <span />
              </button>
            </div>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-[11px] text-[var(--muted)]">
          Memento v{APP_VERSION} · Private Offline Trip Memory Sharing
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

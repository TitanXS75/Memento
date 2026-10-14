'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, RefreshCw, Sparkles, X } from 'lucide-react'
import {
  applyAppUpdate,
  checkForAppUpdate,
  dismissUpdate,
  isAutoUpdateEnabled,
  isUpdateDismissed,
  type VersionInfo,
} from '@/lib/services/update'

export function AppUpdatePrompt() {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const check = async () => {
    const res = await checkForAppUpdate()
    if (res.hasUpdate && res.remoteVersion) {
      if (isUpdateDismissed(res.remoteVersion.version)) {
        return
      }

      // If user enabled auto-update, automatically apply it
      if (isAutoUpdateEnabled()) {
        setIsUpdating(true)
        setTimeout(() => {
          applyAppUpdate(res.remoteVersion!)
        }, 1200)
        return
      }

      setUpdateInfo(res.remoteVersion)
    }
  }

  useEffect(() => {
    // Check shortly after app launch (let preloader complete smoothly)
    const timer = setTimeout(() => {
      check()
    }, 2500)

    // Also check when user resumes app on phone
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        check()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const handleUpdateNow = async () => {
    if (!updateInfo) return
    setIsUpdating(true)
    await applyAppUpdate(updateInfo)
  }

  const handleDismiss = () => {
    if (updateInfo) {
      dismissUpdate(updateInfo.version)
    }
    setUpdateInfo(null)
  }

  if (isUpdating) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-[9998] mx-auto max-w-sm rounded-2xl border border-[var(--accent)] bg-[var(--surface)] p-4 shadow-2xl animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
            <RefreshCw size={18} className="animate-spin" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Updating Memento…</p>
            <p className="text-xs text-[var(--muted)]">Applying latest changes to your device.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!updateInfo) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 z-[9998] mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/25">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="eyebrow text-[var(--accent)]">Update Available</span>
              <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.2 text-[10px] font-semibold text-[var(--accent)]">
                v{updateInfo.version}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">
              New version ready
            </p>
            <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
              {updateInfo.releaseNotes || 'A new update with the latest changes is available for your device.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss update prompt"
          className="rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] transition shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3.5 flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={handleDismiss}
          className="secondary-button text-xs py-1.5 px-3"
        >
          Later
        </button>
        <button
          type="button"
          onClick={handleUpdateNow}
          className="primary-button text-xs py-1.5 px-4"
        >
          <span>Update Now</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

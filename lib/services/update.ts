/**
 * App Update & Version Service
 * Detects new deployments/pushes and prompts or automatically updates the app on mobile devices.
 */

export interface VersionInfo {
  version: string
  buildTime: number
  releaseNotes?: string
}

// Current client build timestamp embedded at build time
export const CLIENT_BUILD_TIME =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BUILD_TIME
    ? parseInt(process.env.NEXT_PUBLIC_BUILD_TIME, 10)
    : 1770900000000

export const APP_VERSION = '0.1.0'

const AUTO_UPDATE_KEY = 'memento_auto_update_enabled'
const DISMISSED_UPDATE_KEY = 'memento_dismissed_update_time'

/**
 * Checks if auto-update is enabled by the user.
 */
export function isAutoUpdateEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(AUTO_UPDATE_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Sets whether the app should update automatically when a new push is discovered.
 */
export function setAutoUpdateEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(AUTO_UPDATE_KEY, enabled ? 'true' : 'false')
  } catch {
    // ignore
  }
}

/**
 * Check if the user has dismissed an update prompt for a specific build.
 */
export function isUpdateDismissed(buildTime: number): boolean {
  if (typeof sessionStorage === 'undefined') return false
  try {
    const dismissed = sessionStorage.getItem(DISMISSED_UPDATE_KEY)
    return dismissed === String(buildTime)
  } catch {
    return false
  }
}

export function dismissUpdate(buildTime: number): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(DISMISSED_UPDATE_KEY, String(buildTime))
  } catch {
    // ignore
  }
}

/**
 * Fetch remote version from /version.json with cache busting.
 */
export async function checkForAppUpdate(): Promise<{
  hasUpdate: boolean
  remoteVersion: VersionInfo | null
  error?: string
}> {
  if (typeof window === 'undefined') {
    return { hasUpdate: false, remoteVersion: null }
  }

  try {
    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    })

    if (!res.ok) {
      return { hasUpdate: false, remoteVersion: null }
    }

    const data = (await res.json()) as VersionInfo

    if (data && data.buildTime && data.buildTime > CLIENT_BUILD_TIME) {
      return { hasUpdate: true, remoteVersion: data }
    }

    return { hasUpdate: false, remoteVersion: data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to check version'
    return { hasUpdate: false, remoteVersion: null, error: msg }
  }
}

/**
 * Apply the update: Clears web caches safely (preserving IndexedDB trips) and reloads.
 */
export async function applyAppUpdate(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Unregister any active service workers so new code is fetched
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of registrations) {
        await reg.update().catch(() => {})
        await reg.unregister().catch(() => {})
      }
    }

    // Clear asset cache storage without touching IndexedDB or localStorage
    if ('caches' in window) {
      const keys = await caches.keys()
      for (const key of keys) {
        await caches.delete(key)
      }
    }
  } catch {
    // ignore
  }

  // Force clean reload
  const url = new URL(window.location.href)
  url.searchParams.set('_v', Date.now().toString())
  window.location.href = url.toString()
}

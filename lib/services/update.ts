/**
 * App Update & Version Service
 * Handles semantic version checking, build comparison, and update application.
 */

export interface VersionInfo {
  version: string
  buildTime: number
  releaseNotes?: string
}

export const APP_VERSION = '0.1.1'

// Embedded client build timestamp
export const CLIENT_BUILD_TIME =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BUILD_TIME
    ? parseInt(process.env.NEXT_PUBLIC_BUILD_TIME, 10)
    : 1770900000000

const AUTO_UPDATE_KEY = 'memento_auto_update_enabled'
const DISMISSED_UPDATE_KEY = 'memento_dismissed_update_version'
const APPLIED_BUILD_KEY = 'memento_applied_build'
const APPLIED_VERSION_KEY = 'memento_applied_version'

export function isAutoUpdateEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(AUTO_UPDATE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setAutoUpdateEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(AUTO_UPDATE_KEY, enabled ? 'true' : 'false')
  } catch {
    // ignore
  }
}

export function getAppliedBuildTime(): number | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const val = localStorage.getItem(APPLIED_BUILD_KEY)
    return val ? parseInt(val, 10) : null
  } catch {
    return null
  }
}

export function getAppliedVersion(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(APPLIED_VERSION_KEY)
  } catch {
    return null
  }
}

export function markUpdateApplied(version: string, buildTime: number): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(APPLIED_VERSION_KEY, version)
    localStorage.setItem(APPLIED_BUILD_KEY, String(buildTime))
  } catch {
    // ignore
  }
}

export function isUpdateDismissed(identifier: string): boolean {
  if (typeof sessionStorage === 'undefined') return false
  try {
    return sessionStorage.getItem(DISMISSED_UPDATE_KEY) === identifier
  } catch {
    return false
  }
}

export function dismissUpdate(identifier: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(DISMISSED_UPDATE_KEY, identifier)
  } catch {
    // ignore
  }
}

/**
 * Split semver string into numeric components (e.g. "0.1.1" -> [0, 1, 1]).
 */
export function parseVersion(v: string): number[] {
  return v
    .replace(/^v/i, '')
    .trim()
    .split('.')
    .map((num) => parseInt(num, 10) || 0)
}

/**
 * Returns true if remoteVer is strictly newer than currentVer.
 */
export function isNewerVersion(remoteVer: string, currentVer: string): boolean {
  const remote = parseVersion(remoteVer)
  const current = parseVersion(currentVer)

  for (let i = 0; i < Math.max(remote.length, current.length); i++) {
    const r = remote[i] ?? 0
    const c = current[i] ?? 0
    if (r > c) return true
    if (r < c) return false
  }
  return false
}

/**
 * Determines whether a remote version qualifies as a new update.
 */
export function isUpdateAvailable(
  remote: VersionInfo,
  currentVer: string = APP_VERSION,
  currentBuild: number = CLIENT_BUILD_TIME
): boolean {
  const appliedVersion = getAppliedVersion()
  const appliedBuild = getAppliedBuildTime()

  // 1. If user already applied this exact version and build, no update
  if (appliedVersion === remote.version && appliedBuild === remote.buildTime) {
    return false
  }

  // 2. If remote version is semantically newer than current app version
  if (isNewerVersion(remote.version, currentVer)) {
    // Check if user already updated to this version in this session
    if (appliedVersion && !isNewerVersion(remote.version, appliedVersion)) {
      return false
    }
    return true
  }

  // 3. If version is identical, check if remote build time is strictly newer than client build time
  if (remote.version === currentVer && remote.buildTime > currentBuild) {
    if (appliedBuild && remote.buildTime <= appliedBuild) {
      return false
    }
    return true
  }

  return false
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

    if (data && data.version) {
      const hasUpdate = isUpdateAvailable(data)
      return { hasUpdate, remoteVersion: data }
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
export async function applyAppUpdate(remote?: VersionInfo): Promise<void> {
  if (typeof window === 'undefined') return

  if (remote) {
    markUpdateApplied(remote.version, remote.buildTime)
  }

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

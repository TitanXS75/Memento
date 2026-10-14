import { beforeEach, describe, expect, it } from 'vitest'
import {
  APP_VERSION,
  CLIENT_BUILD_TIME,
  isAutoUpdateEnabled,
  setAutoUpdateEnabled,
  isUpdateDismissed,
  dismissUpdate,
  isNewerVersion,
  isUpdateAvailable,
  markUpdateApplied,
  type VersionInfo,
} from '@/lib/services/update'

class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string) {
    return this.store.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.store.set(key, value)
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  clear() {
    this.store.clear()
  }
}

describe('App Update Service', () => {
  beforeEach(() => {
    // @ts-expect-error test mock
    globalThis.localStorage = new MemoryStorage()
    // @ts-expect-error test mock
    globalThis.sessionStorage = new MemoryStorage()
  })

  it('has valid version and build time', () => {
    expect(APP_VERSION).toBe('0.1.1')
    expect(typeof CLIENT_BUILD_TIME).toBe('number')
    expect(CLIENT_BUILD_TIME).toBeGreaterThan(0)
  })

  it('correctly compares semantic version numbers', () => {
    expect(isNewerVersion('0.1.2', '0.1.1')).toBe(true)
    expect(isNewerVersion('0.2.0', '0.1.9')).toBe(true)
    expect(isNewerVersion('1.0.0', '0.9.9')).toBe(true)

    expect(isNewerVersion('0.1.1', '0.1.1')).toBe(false)
    expect(isNewerVersion('0.1.0', '0.1.1')).toBe(false)
  })

  it('detects new updates and does NOT re-prompt once update is applied', () => {
    const remote: VersionInfo = {
      version: '0.1.2',
      buildTime: 1800000000000,
    }

    // Prior to applying, update is available
    expect(isUpdateAvailable(remote, '0.1.1', 1700000000000)).toBe(true)

    // Once user applies the update, it will not prompt again
    markUpdateApplied(remote.version, remote.buildTime)
    expect(isUpdateAvailable(remote, '0.1.1', 1700000000000)).toBe(false)
  })

  it('manages auto-update preference in localStorage', () => {
    setAutoUpdateEnabled(true)
    expect(isAutoUpdateEnabled()).toBe(true)

    setAutoUpdateEnabled(false)
    expect(isAutoUpdateEnabled()).toBe(false)
  })

  it('tracks dismissed update versions in sessionStorage', () => {
    expect(isUpdateDismissed('0.1.2')).toBe(false)
    dismissUpdate('0.1.2')
    expect(isUpdateDismissed('0.1.2')).toBe(true)
  })
})

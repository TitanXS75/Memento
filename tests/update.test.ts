import { beforeEach, describe, expect, it } from 'vitest'
import {
  APP_VERSION,
  CLIENT_BUILD_TIME,
  isAutoUpdateEnabled,
  setAutoUpdateEnabled,
  isUpdateDismissed,
  dismissUpdate,
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
    expect(APP_VERSION).toBe('0.1.0')
    expect(typeof CLIENT_BUILD_TIME).toBe('number')
    expect(CLIENT_BUILD_TIME).toBeGreaterThan(0)
  })

  it('manages auto-update preference in localStorage', () => {
    setAutoUpdateEnabled(true)
    expect(isAutoUpdateEnabled()).toBe(true)

    setAutoUpdateEnabled(false)
    expect(isAutoUpdateEnabled()).toBe(false)
  })

  it('tracks dismissed update builds in sessionStorage', () => {
    const fakeBuild = 999999999
    expect(isUpdateDismissed(fakeBuild)).toBe(false)

    dismissUpdate(fakeBuild)
    expect(isUpdateDismissed(fakeBuild)).toBe(true)
  })
})

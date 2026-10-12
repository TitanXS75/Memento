import { describe, it, expect } from 'vitest'
import { sha256Hex, formatBytes } from '@/lib/services/hash'

describe('sha256Hex', () => {
  it('computes correct sha256 for known text', async () => {
    const encoder = new TextEncoder()
    const buffer = encoder.encode('memento')
    const hash = await sha256Hex(buffer)
    expect(hash).toBe('fe432cb211dac676fcd7d2f05033f82be9fd8325923e6e3a322758fee60e94cf')
  })

  it('computes correct sha256 for empty buffer', async () => {
    const buffer = new Uint8Array(0)
    const hash = await sha256Hex(buffer)
    // sha256 of "": e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
})

describe('formatBytes', () => {
  it('formats zero bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats small bytes correctly', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes correctly', () => {
    expect(formatBytes(1024 * 50)).toBe('50 KB')
  })

  it('formats megabytes correctly', () => {
    expect(formatBytes(1024 * 1024 * 12.5)).toBe('12.5 MB')
  })

  it('formats gigabytes correctly', () => {
    expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.50 GB')
  })
})

import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { getFileMediaInfo, inspectZipBuffer } from '@/lib/services/zip-extractor'

describe('zip-extractor service', () => {
  it('identifies photo and video media extensions correctly', () => {
    expect(getFileMediaInfo('test.jpg')).toEqual({ isMedia: true, type: 'photo', mimeType: 'image/jpeg' })
    expect(getFileMediaInfo('vacation.PNG')).toEqual({ isMedia: true, type: 'photo', mimeType: 'image/png' })
    expect(getFileMediaInfo('clip.mp4')).toEqual({ isMedia: true, type: 'video', mimeType: 'video/mp4' })
    expect(getFileMediaInfo('recording.MOV')).toEqual({ isMedia: true, type: 'video', mimeType: 'video/quicktime' })
    expect(getFileMediaInfo('document.pdf')).toBeNull()
    expect(getFileMediaInfo('notes.txt')).toBeNull()
  })

  it('intelligently inspects a ZIP containing photos and videos', async () => {
    const dummyZip = zipSync({
      'Goa_Trip/2026-10-10/IMG_001.jpg': new Uint8Array([1, 2, 3, 4]),
      'Goa_Trip/2026-10-11/VID_002.mp4': new Uint8Array([5, 6, 7, 8]),
      'notes.txt': new Uint8Array([9, 10]),
    })

    const result = await inspectZipBuffer('Goa_Trip_2026-10-10_to_2026-10-11.zip', dummyZip)

    expect(result.containsMedia).toBe(true)
    expect(result.photoCount).toBe(1)
    expect(result.videoCount).toBe(1)
    expect(result.otherCount).toBe(1)
    expect(result.isMementoArchive).toBe(true)
    expect(result.suggestedTripName).toBe('Goa Trip')
    expect(result.suggestedStartDate).toBe('2026-10-10')
    expect(result.suggestedEndDate).toBe('2026-10-11')
    expect(result.mediaEntries).toHaveLength(2)
  })

  it('marks archives with no media as containsMedia = false', async () => {
    const docZip = zipSync({
      'readme.txt': new Uint8Array([1, 2]),
      'summary.pdf': new Uint8Array([3, 4]),
    })

    const result = await inspectZipBuffer('documents.zip', docZip)

    expect(result.containsMedia).toBe(false)
    expect(result.photoCount).toBe(0)
    expect(result.videoCount).toBe(0)
    expect(result.otherCount).toBe(2)
    expect(result.mediaEntries).toHaveLength(0)
  })
})

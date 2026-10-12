import { describe, it, expect } from 'vitest'
import { unzipSync } from 'fflate'
import {
  sanitizePathSegment,
  buildArchiveFilename,
  buildZipEntryPaths,
  createZipArchive,
  type ZipExportItem,
  type ExportManifest,
} from '@/lib/services/zip'

describe('ZIP Utilities', () => {
  it('sanitizes unsafe characters from path segments', () => {
    expect(sanitizePathSegment('trip/with:invalid*chars?')).toBe('tripwithinvalidchars')
    expect(sanitizePathSegment('../../danger')).toBe('danger')
    expect(sanitizePathSegment('normal-folder_name')).toBe('normal-folder_name')
  })

  it('builds standard archive filenames', () => {
    expect(buildArchiveFilename('Goa Trip 2026', ['2026-10-10'])).toBe('Goa_Trip_2026_2026-10-10.zip')
    expect(buildArchiveFilename('Goa Trip 2026', ['2026-10-10', '2026-10-12', '2026-10-11'])).toBe(
      'Goa_Trip_2026_2026-10-10_to_2026-10-12.zip',
    )
  })

  it('builds zip entry paths and resolves collisions with numeric suffixes', () => {
    const items: ZipExportItem[] = [
      { mediaItemId: '1', fileName: 'sunset.jpg', date: '2026-10-10', data: new Uint8Array([1]) },
      { mediaItemId: '2', fileName: 'sunset.jpg', date: '2026-10-10', data: new Uint8Array([2]) },
      { mediaItemId: '3', fileName: 'sunset.jpg', date: '2026-10-10', data: new Uint8Array([3]) },
      { mediaItemId: '4', fileName: 'dinner.jpg', date: '2026-10-10', data: new Uint8Array([4]) },
    ]

    const pathMap = buildZipEntryPaths('Goa Trip', items)
    expect(pathMap.get('1')).toBe('Goa_Trip/2026-10-10/sunset.jpg')
    expect(pathMap.get('2')).toBe('Goa_Trip/2026-10-10/sunset_1.jpg')
    expect(pathMap.get('3')).toBe('Goa_Trip/2026-10-10/sunset_2.jpg')
    expect(pathMap.get('4')).toBe('Goa_Trip/2026-10-10/dinner.jpg')
  })

  it('generates a valid, readable ZIP archive with fflate', async () => {
    const encoder = new TextEncoder()
    const content1 = encoder.encode('Hello from photo 1')
    const content2 = encoder.encode('Hello from photo 2')

    const manifest: ExportManifest = {
      archiveId: 'test-arch-1',
      tripName: 'Paris Vacation',
      selectedDates: ['2026-05-01'],
      items: [
        { mediaItemId: 'm1', fileName: 'eiffel.txt', date: '2026-05-01', data: content1 },
        { mediaItemId: 'm2', fileName: 'louvre.txt', date: '2026-05-01', data: content2 },
      ],
    }

    let lastProgress = 0
    const zipBytes = await createZipArchive(manifest, (p) => {
      lastProgress = p
    })

    expect(zipBytes.byteLength).toBeGreaterThan(0)
    expect(lastProgress).toBe(100)

    // Unzip and verify contents
    const unzipped = unzipSync(zipBytes)
    const eiffelKey = 'Paris_Vacation/2026-05-01/eiffel.txt'
    const louvreKey = 'Paris_Vacation/2026-05-01/louvre.txt'

    expect(unzipped[eiffelKey]).toBeDefined()
    expect(new TextDecoder().decode(unzipped[eiffelKey])).toBe('Hello from photo 1')

    expect(unzipped[louvreKey]).toBeDefined()
    expect(new TextDecoder().decode(unzipped[louvreKey])).toBe('Hello from photo 2')
  })
})

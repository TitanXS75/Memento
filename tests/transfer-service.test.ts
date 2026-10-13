import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { closeDb, getDb } from '@/lib/db'
import {
  assembleAndVerifyFile,
  checkForDuplicateMedia,
  CHUNK_SIZE,
  sliceIntoChunks,
  storeTransferredMediaItem,
  type TransferManifestItem,
} from '@/lib/services/transfer'
import { sha256Hex } from '@/lib/services/hash'

describe('Transfer Service', () => {
  beforeEach(() => {
    closeDb()
  })

  afterEach(() => {
    closeDb()
  })

  it('slices data into accurate chunk sizes', () => {
    const testData = new Uint8Array(CHUNK_SIZE * 2 + 512)
    testData.fill(42)

    const chunks = sliceIntoChunks(testData, CHUNK_SIZE)
    expect(chunks.length).toBe(3)
    expect(chunks[0]?.byteLength).toBe(CHUNK_SIZE)
    expect(chunks[1]?.byteLength).toBe(CHUNK_SIZE)
    expect(chunks[2]?.byteLength).toBe(512)
  })

  it('assembles chunks and verifies SHA-256 integrity accurately', async () => {
    const rawString = 'Memento local-first private media sharing test string'
    const encoder = new TextEncoder()
    const rawBytes = encoder.encode(rawString)
    const expectedHash = await sha256Hex(rawBytes)

    const chunks = sliceIntoChunks(rawBytes, 10)
    const result = await assembleAndVerifyFile(chunks, expectedHash)

    expect(result.verified).toBe(true)
    expect(result.actualHash).toBe(expectedHash)
    expect(new TextDecoder().decode(result.data)).toBe(rawString)
  })

  it('fails verification if chunk content is corrupted', async () => {
    const rawBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    const validHash = await sha256Hex(rawBytes)

    const chunks = sliceIntoChunks(rawBytes, 4)
    // Corrupt second chunk
    chunks[1]![0] = 99

    const result = await assembleAndVerifyFile(chunks, validHash)
    expect(result.verified).toBe(false)
    expect(result.actualHash).not.toBe(validHash)
  })

  it('stores verified transferred media item in IndexedDB', async () => {
    // Mock URL.createObjectURL for test environment
    if (typeof URL.createObjectURL !== 'function') {
      URL.createObjectURL = () => 'blob:mock-url'
    }

    const testBytes = new Uint8Array([10, 20, 30, 40])
    const hash = await sha256Hex(testBytes)

    const manifest: TransferManifestItem = {
      fileId: 'f1',
      filename: 'beach_sunset.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'photo',
      sizeBytes: testBytes.byteLength,
      contentHash: hash,
    }

    const saved = await storeTransferredMediaItem(manifest, testBytes, 'trip-100', 'peer-phone')
    expect(saved.id).toBeDefined()
    expect(saved.filename).toBe('beach_sunset.jpg')
    expect(saved.tripId).toBe('trip-100')

    const db = await getDb()
    const inDb = await db.get('mediaItems', saved.id)
    expect(inDb?.filename).toBe('beach_sunset.jpg')
    expect(inDb?.contentHash).toBe(hash)
  })

  it('detects duplicate media items by contentHash', async () => {
    const testBytes = new Uint8Array([55, 66, 77])
    const hash = await sha256Hex(testBytes)

    const manifest: TransferManifestItem = {
      fileId: 'f2',
      filename: 'existing_photo.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'photo',
      sizeBytes: testBytes.byteLength,
      contentHash: hash,
    }

    await storeTransferredMediaItem(manifest, testBytes, 'trip-1', 'peer-1')

    const duplicate = await checkForDuplicateMedia(hash)
    expect(duplicate).not.toBeNull()
    expect(duplicate?.filename).toBe('existing_photo.jpg')

    const nonExistent = await checkForDuplicateMedia('non-existent-hash')
    expect(nonExistent).toBeNull()
  })
})

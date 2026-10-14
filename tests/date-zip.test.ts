import { describe, expect, it } from 'vitest'
import { isCameraPhoto } from '@/components/app/DateZipModal'
import { calculateStorageStats } from '@/lib/services/storage'
import type { DeviceMediaItem } from '@/lib/services/media'

describe('Date ZIP & Media Classification', () => {
  it('correctly identifies camera photos vs screenshots or videos', () => {
    const cameraPhoto: DeviceMediaItem = {
      id: 'cam-1',
      name: 'IMG_20261013_142030.jpg',
      size: 4096000,
      date: Date.now(),
      mimeType: 'image/jpeg',
      type: 'photo',
      uri: 'file:///storage/emulated/0/DCIM/Camera/IMG_20261013_142030.jpg',
    }

    const screenshot: DeviceMediaItem = {
      id: 'screen-1',
      name: 'Screenshot_20261013_142030.png',
      size: 1024000,
      date: Date.now(),
      mimeType: 'image/png',
      type: 'photo',
      uri: 'file:///storage/emulated/0/Pictures/Screenshots/Screenshot_20261013_142030.png',
    }

    const video: DeviceMediaItem = {
      id: 'vid-1',
      name: 'VID_20261013_142030.mp4',
      size: 20000000,
      date: Date.now(),
      mimeType: 'video/mp4',
      type: 'video',
      uri: 'file:///storage/emulated/0/DCIM/Camera/VID_20261013_142030.mp4',
    }

    expect(isCameraPhoto(cameraPhoto)).toBe(true)
    expect(isCameraPhoto(screenshot)).toBe(false)
    expect(isCameraPhoto(video)).toBe(false)
  })

  it('calculates media storage statistics purely from device media without bogus quota', async () => {
    const stats = await calculateStorageStats()
    expect(stats).toBeDefined()
    expect(stats.mediaBytes).toBe(stats.photosBytes + stats.videosBytes)
    expect(stats.totalBytes).toBe(stats.mediaBytes)
    expect(stats.availableBytes).toBe(0)
  })
})

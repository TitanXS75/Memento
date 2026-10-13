/**
 * Cross-platform archive sharing and download service.
 */
export async function shareOrDownloadFile(options: {
  blob: Blob
  filename: string
  title?: string
}): Promise<{ shared: boolean; downloaded: boolean }> {
  const { blob, filename, title = filename } = options

  // 1. Try Web Share API with File (Native OS share sheet on supported Android/iOS/Desktop)
  if (typeof navigator !== 'undefined' && 'canShare' in navigator && navigator.share) {
    try {
      const file = new File([blob], filename, { type: 'application/zip' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          files: [file],
        })
        return { shared: true, downloaded: false }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        // User cancelled the share dialog
        return { shared: false, downloaded: false }
      }
      console.warn('Share with file failed, falling back to download:', err)
    }
  }

  // 2. Fallback: Trigger browser direct download
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return { shared: false, downloaded: true }
  } catch (err) {
    console.error('File download failed:', err)
    throw err
  }
}

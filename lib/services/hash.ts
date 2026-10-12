/**
 * Compute SHA-256 of a BufferSource (ArrayBuffer or TypedArray) and return a hex string.
 */
export async function sha256Hex(buffer: BufferSource): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Hash a File by reading it in 4 MB chunks to avoid loading the
 * entire file into memory at once. Only suitable for smaller files on web —
 * for large video, prefer streaming hashing in a Web Worker.
 */
export async function hashFile(file: File): Promise<string> {
  const CHUNK = 4 * 1024 * 1024 // 4 MB
  const chunks: Uint8Array[] = []

  for (let offset = 0; offset < file.size; offset += CHUNK) {
    const slice = file.slice(offset, offset + CHUNK)
    const buf = await slice.arrayBuffer()
    chunks.push(new Uint8Array(buf))
  }

  const total = chunks.reduce((acc, c) => acc + c.length, 0)
  const merged = new Uint8Array(total)
  let pos = 0
  for (const c of chunks) {
    merged.set(c, pos)
    pos += c.length
  }

  return sha256Hex(merged.buffer)
}

/**
 * Format a byte count into a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

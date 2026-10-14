import fs from 'node:fs'
import path from 'node:path'

let pkgVersion = '0.1.1'
try {
  const pkgRaw = fs.readFileSync(path.resolve('package.json'), 'utf-8')
  pkgVersion = JSON.parse(pkgRaw).version || '0.1.1'
} catch {}

let buildTime = 1770900000000
const versionPath = path.resolve('public', 'version.json')

if (process.env.NODE_ENV === 'production') {
  buildTime = Date.now()
  try {
    const versionData = {
      version: pkgVersion,
      buildTime,
      updatedAt: new Date(buildTime).toISOString(),
      releaseNotes: 'Performance improvements, smooth transitions, and feature enhancements.',
    }
    fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2))
  } catch {}
} else {
  try {
    if (fs.existsSync(versionPath)) {
      const existing = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))
      if (existing.buildTime) buildTime = existing.buildTime
    }
  } catch {}
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: String(buildTime),
  },
  allowedDevOrigins: ['10.82.145.108', 'localhost:3000', '127.0.0.1:3000'],
}

export default nextConfig


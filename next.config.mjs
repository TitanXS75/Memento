import fs from 'node:fs'
import path from 'node:path'

const buildTime = Date.now()

try {
  const versionPath = path.resolve('public', 'version.json')
  const versionData = {
    version: '0.1.0',
    buildTime,
    updatedAt: new Date(buildTime).toISOString(),
    releaseNotes: 'Performance improvements, smooth transitions, and feature enhancements.',
  }
  fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2))
} catch {
  // ignore in read-only environments
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


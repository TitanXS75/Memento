/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['10.82.145.108', 'localhost:3000', '127.0.0.1:3000'],
}

export default nextConfig

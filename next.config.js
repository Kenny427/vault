/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable automatic static optimization to prevent flickering
  experimental: {
    optimizeCss: false,
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent remounting/flickering on tab switch
  // Disable automatic static optimization to prevent flickering
  experimental: {
    optimizeCss: false,
  },
}

module.exports = nextConfig

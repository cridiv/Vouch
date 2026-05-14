/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the SDK running on localhost:5000
  async rewrites() {
    return []
  },
}

module.exports = nextConfig
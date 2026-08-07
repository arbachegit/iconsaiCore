/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  basePath: '/skills',
  assetPrefix: '/skills',
}

module.exports = nextConfig

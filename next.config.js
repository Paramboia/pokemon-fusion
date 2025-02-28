/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // Ensure SWC minification is enabled
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.pokemondb.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'bcrypt'];
    // This is to handle case sensitivity issues
    config.resolve.fallback = { fs: false, path: false };
    
    // Add path alias
    config.resolve.alias['@'] = path.join(__dirname, './');
    
    return config;
  },
  // Specify the server port
  serverRuntimeConfig: {
    port: 3000,
    replicateApiToken: process.env.REPLICATE_API_TOKEN,
  },
  publicRuntimeConfig: {
    port: 3000,
  },
  typescript: {
    ignoreBuildErrors: true, // Ignore TypeScript errors during build
    tsconfigPath: "tsconfig.build.json" // Use a non-existent file to skip TypeScript checking
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignore ESLint errors during build
  },
  // Add svix and onesignal to the list of external packages
  serverExternalPackages: ['@prisma/client', 'bcrypt', 'svix', '@onesignal/node-onesignal'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001', 'localhost:3002', 'localhost:3003'],
    },
  },
  // Ensure environment variables are available to the server
  env: {
    NEXT_PUBLIC_REPLICATE_API_TOKEN: process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN,
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
    SKIP_TYPE_CHECK: "true"
  },
};

module.exports = nextConfig; 
/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
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
    ignoreBuildErrors: true, // Only during development
  },
  // Add svix and onesignal to the list of external packages
  serverExternalPackages: ['@prisma/client', 'bcrypt', 'svix', '@onesignal/node-onesignal'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001', 'localhost:3002', 'localhost:3003'],
    },
    // Ensure SWC is used for compilation
    swcMinify: true,
  },
  // Ensure environment variables are available to the server
  env: {
    NEXT_PUBLIC_REPLICATE_API_TOKEN: process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN,
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
  },
  // Configure Babel
  compiler: {
    // Disable SWC to use Babel instead
    styledComponents: true,
  },
};

module.exports = nextConfig; 
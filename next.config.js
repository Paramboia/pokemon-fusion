/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/PokeAPI/sprites/**',
      },
      {
        protocol: 'https',
        hostname: 'replicate.delivery',  // For AI generated images
      },
      {
        protocol: 'https',
        hostname: 'pbxt.replicate.delivery',  // For Replicate images
      }
    ],
    domains: [
      'raw.githubusercontent.com', // For Pokemon images
      'replicate.delivery', // For Replicate generated images
      'ahgoxvfsxaazfoezwxko.supabase.co', // Your Supabase URL
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: true, // Only during development
  },
};

module.exports = nextConfig; 
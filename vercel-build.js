#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Vercel-specific build process...');

// Function to delete a file if it exists
function deleteFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted ${filePath}`);
    return true;
  }
  return false;
}

// Delete all TypeScript configuration files
console.log('Removing TypeScript configuration files...');
deleteFileIfExists(path.join(__dirname, 'tsconfig.json'));
deleteFileIfExists(path.join(__dirname, 'tsconfig.build.json'));
deleteFileIfExists(path.join(__dirname, 'next-env.d.ts'));

// Delete Babel configuration files
console.log('Removing Babel configuration files...');
deleteFileIfExists(path.join(__dirname, '.babelrc'));
deleteFileIfExists(path.join(__dirname, '.babelrc.js'));
deleteFileIfExists(path.join(__dirname, '.babelrc.json'));
deleteFileIfExists(path.join(__dirname, 'babel.config.js'));
deleteFileIfExists(path.join(__dirname, 'babel.config.json'));

// Create a simple next.config.js
console.log('Creating simplified next.config.js...');
const nextConfigPath = path.join(__dirname, 'next.config.js');
const simpleNextConfig = `
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
    config.resolve.fallback = { fs: false, path: false };
    config.resolve.alias['@'] = path.join(__dirname, './');
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
`;

fs.writeFileSync(nextConfigPath, simpleNextConfig);

// Create a jsconfig.json file
console.log('Creating jsconfig.json...');
const jsConfigPath = path.join(__dirname, 'jsconfig.json');
const simpleJsConfig = `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "jsx": "react-jsx"
  }
}`;

fs.writeFileSync(jsConfigPath, simpleJsConfig);

// Run the Next.js build
console.log('Running Next.js build...');
try {
  execSync('next build --no-lint', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_DISABLE_SWC: '1',
      SKIP_TYPE_CHECK: 'true',
      NEXT_SKIP_TYPE_CHECK: 'true',
      NEXT_DISABLE_SOURCEMAPS: 'true',
      NODE_OPTIONS: '--max-old-space-size=4096'
    }
  });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 
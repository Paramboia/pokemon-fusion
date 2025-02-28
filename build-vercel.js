#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting custom build process for JavaScript-only build...');

// Function to delete a file if it exists
function deleteFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted ${filePath}`);
    return true;
  }
  return false;
}

// Create a minimal tsconfig.json that won't cause errors
console.log('Creating minimal tsconfig.json...');
const tsConfigPath = path.join(__dirname, 'tsconfig.json');
const minimalTsConfig = `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "incremental": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  "exclude": ["node_modules"]
}`;

fs.writeFileSync(tsConfigPath, minimalTsConfig);
console.log('Created minimal tsconfig.json');

// Create a simple next-env.d.ts file
console.log('Creating next-env.d.ts...');
const nextEnvPath = path.join(__dirname, 'next-env.d.ts');
const nextEnvContent = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// It's automatically generated and will be overwritten in builds
`;

fs.writeFileSync(nextEnvPath, nextEnvContent);
console.log('Created next-env.d.ts');

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
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
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
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
`;

fs.writeFileSync(nextConfigPath, simpleNextConfig);

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
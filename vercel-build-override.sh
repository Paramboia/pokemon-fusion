#!/bin/bash

echo "Starting Vercel build override script..."

# Remove TypeScript files
echo "Removing TypeScript configuration files..."
rm -f tsconfig.json tsconfig.build.json next-env.d.ts

# Remove Babel files
echo "Removing Babel configuration files..."
rm -f .babelrc .babelrc.js .babelrc.json babel.config.js babel.config.json

# Create a simplified next.config.js
echo "Creating simplified next.config.js..."
cat > next.config.js << 'EOL'
/** @type {import('next').NextConfig} */
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
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': process.cwd()
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
EOL

# Create a jsconfig.json file
echo "Creating jsconfig.json..."
cat > jsconfig.json << 'EOL'
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "jsx": "react-jsx"
  }
}
EOL

# Modify package.json to remove TypeScript dependencies
echo "Modifying package.json to remove TypeScript dependencies..."
node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.devDependencies) {
  delete packageJson.devDependencies.typescript;
  delete packageJson.devDependencies['@types/react'];
  delete packageJson.devDependencies['@types/react-dom'];
  delete packageJson.devDependencies['@types/node'];
  delete packageJson.devDependencies['@types/uuid'];
}
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('Successfully removed TypeScript dependencies from package.json');
"

# Run the Next.js build
echo "Running Next.js build..."
NEXT_DISABLE_SWC=1 SKIP_TYPE_CHECK=true NEXT_SKIP_TYPE_CHECK=true NEXT_DISABLE_SOURCEMAPS=true NODE_OPTIONS=--max-old-space-size=4096 next build --no-lint 
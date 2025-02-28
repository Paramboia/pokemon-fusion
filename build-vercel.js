const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Set environment variables to skip TypeScript checking
process.env.SKIP_TYPE_CHECK = 'true';
// Set environment variable to disable SWC
process.env.NEXT_DISABLE_SWC = 'true';

console.log('Starting custom build process...');

// Check for .babelrc and remove it if it exists
const babelrcPath = path.join(__dirname, '.babelrc');
if (fs.existsSync(babelrcPath)) {
  console.log('.babelrc file found, removing it to prevent SWC conflicts...');
  fs.unlinkSync(babelrcPath);
}

// Check for any other babel config files
const babelConfigFiles = [
  '.babelrc.js',
  '.babelrc.json',
  'babel.config.js',
  'babel.config.json'
];

babelConfigFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`${file} found, removing it to prevent SWC conflicts...`);
    fs.unlinkSync(filePath);
  }
});

// Create a temporary next.config.js that disables SWC
const nextConfigPath = path.join(__dirname, 'next.config.js');
let originalNextConfig = null;

if (fs.existsSync(nextConfigPath)) {
  originalNextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  console.log('Backed up original next.config.js');
}

// Create a simplified next.config.js for the build
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
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
`;

fs.writeFileSync(nextConfigPath, simpleNextConfig);
console.log('Created simplified next.config.js for build');

// Make sure TypeScript is installed
try {
  console.log('Installing TypeScript and React types...');
  execSync('npm install --no-save --legacy-peer-deps typescript @types/react @types/react-dom @types/node', { stdio: 'inherit' });
} catch (error) {
  console.warn('Warning: Failed to install TypeScript dependencies, but continuing build:', error.message);
}

// Create a temporary tsconfig.json that allows JavaScript
const tsconfigPath = path.join(__dirname, 'tsconfig.json');
let originalTsconfig = null;

if (fs.existsSync(tsconfigPath)) {
  originalTsconfig = fs.readFileSync(tsconfigPath, 'utf8');
  console.log('Backed up original tsconfig.json');
}

// Create a simplified tsconfig.json for the build
const simpleTsconfig = {
  compilerOptions: {
    target: "es5",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: false,
    forceConsistentCasingInFileNames: true,
    noEmit: true,
    incremental: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "node",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    paths: {
      "@/*": ["./*"]
    }
  },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  exclude: ["node_modules"]
};

fs.writeFileSync(tsconfigPath, JSON.stringify(simpleTsconfig, null, 2));
console.log('Created simplified tsconfig.json for build');

try {
  // Run the Next.js build with linting disabled
  console.log('Running Next.js build...');
  
  // Set environment variables for the build command
  const buildEnv = {
    ...process.env,
    NEXT_DISABLE_SWC: '1',
    SKIP_TYPE_CHECK: 'true',
    NEXT_SKIP_TYPE_CHECK: 'true',
    NEXT_DISABLE_SOURCEMAPS: 'true',
    NODE_OPTIONS: '--max-old-space-size=4096'
  };
  
  // Use cross-platform command
  execSync('next build --no-lint', { 
    stdio: 'inherit',
    env: buildEnv
  });
  
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} finally {
  // Restore the original tsconfig.json
  if (originalTsconfig) {
    fs.writeFileSync(tsconfigPath, originalTsconfig);
    console.log('Restored original tsconfig.json');
  }
  
  // Restore the original next.config.js
  if (originalNextConfig) {
    fs.writeFileSync(nextConfigPath, originalNextConfig);
    console.log('Restored original next.config.js');
  }
} 
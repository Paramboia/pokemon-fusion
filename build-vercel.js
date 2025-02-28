const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Starting custom build process for JavaScript-only build...');

// Function to ensure a directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Create a temporary directory for JavaScript files
const tempDir = path.join(__dirname, 'js_build_temp');
ensureDirectoryExists(tempDir);
console.log(`Created temporary directory: ${tempDir}`);

// Copy all non-TypeScript files to the temporary directory
console.log('Copying non-TypeScript files to temporary directory...');
function copyNonTsFiles(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Skip node_modules, .git, and .next directories
    if (entry.isDirectory() && 
        (entry.name === 'node_modules' || 
         entry.name === '.git' || 
         entry.name === '.next' ||
         entry.name === '.vercel')) {
      continue;
    }
    
    if (entry.isDirectory()) {
      ensureDirectoryExists(destPath);
      copyNonTsFiles(srcPath, destPath);
    } else {
      // Skip TypeScript files and config files
      if (entry.name.endsWith('.ts') || 
          entry.name.endsWith('.tsx') || 
          entry.name === 'tsconfig.json' || 
          entry.name === 'tsconfig.build.json' ||
          entry.name === 'next-env.d.ts' ||
          entry.name === '.babelrc' ||
          entry.name === 'babel.config.js') {
        continue;
      }
      
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy all non-TypeScript files
copyNonTsFiles(__dirname, tempDir);
console.log('Copied all non-TypeScript files');

// Create a simple package.json without TypeScript
const packageJsonPath = path.join(tempDir, 'package.json');
if (fs.existsSync(path.join(__dirname, 'package.json'))) {
  const originalPackageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  // Remove TypeScript dependencies
  if (originalPackageJson.devDependencies) {
    delete originalPackageJson.devDependencies.typescript;
    delete originalPackageJson.devDependencies['@types/node'];
    delete originalPackageJson.devDependencies['@types/react'];
    delete originalPackageJson.devDependencies['@types/react-dom'];
    delete originalPackageJson.devDependencies['@types/uuid'];
  }
  
  // Update scripts to use simple next build
  if (originalPackageJson.scripts) {
    originalPackageJson.scripts.build = 'next build --no-lint';
    originalPackageJson.scripts['build:vercel'] = 'next build --no-lint';
  }
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(originalPackageJson, null, 2));
  console.log('Created simplified package.json without TypeScript');
}

// Create a simple next.config.js
const nextConfigPath = path.join(tempDir, 'next.config.js');
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
console.log('Created simplified next.config.js');

// Create a jsconfig.json file
const jsConfigPath = path.join(tempDir, 'jsconfig.json');
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
console.log('Created jsconfig.json');

// Create a .npmrc file
const npmrcPath = path.join(tempDir, '.npmrc');
const npmrcContent = `legacy-peer-deps=true
ignore-workspace-root-check=true
strict-peer-dependencies=false
auto-install-peers=false
engine-strict=false`;

fs.writeFileSync(npmrcPath, npmrcContent);
console.log('Created .npmrc file');

// Create a vercel.json file
const vercelJsonPath = path.join(tempDir, 'vercel.json');
const vercelJsonContent = `{
  "buildCommand": "next build --no-lint",
  "framework": "nextjs",
  "installCommand": "npm install --legacy-peer-deps",
  "env": {
    "NODE_OPTIONS": "--max-old-space-size=4096",
    "NEXT_TELEMETRY_DISABLED": "1",
    "SKIP_TYPE_CHECK": "true",
    "NEXT_SKIP_TYPE_CHECK": "true",
    "NEXT_DISABLE_SOURCEMAPS": "true",
    "NEXT_DISABLE_SWC": "1"
  },
  "outputDirectory": ".next"
}`;

fs.writeFileSync(vercelJsonPath, vercelJsonContent);
console.log('Created vercel.json file');

try {
  // Change to the temporary directory
  process.chdir(tempDir);
  console.log(`Changed working directory to: ${tempDir}`);
  
  // Install dependencies
  console.log('Installing dependencies...');
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  
  // Run the Next.js build
  console.log('Running Next.js build...');
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
  
  // Copy the .next directory back to the original directory
  const tempNextDir = path.join(tempDir, '.next');
  const originalNextDir = path.join(__dirname, '.next');
  
  if (fs.existsSync(originalNextDir)) {
    fs.rmSync(originalNextDir, { recursive: true, force: true });
  }
  
  // Use a recursive function to copy the .next directory
  function copyDirRecursive(src, dest) {
    ensureDirectoryExists(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  copyDirRecursive(tempNextDir, originalNextDir);
  console.log('Copied built .next directory back to original directory');
  
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} finally {
  // Change back to the original directory
  process.chdir(__dirname);
  console.log(`Changed working directory back to: ${__dirname}`);
  
  // Clean up the temporary directory
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`Removed temporary directory: ${tempDir}`);
  } catch (cleanupError) {
    console.warn('Warning: Failed to remove temporary directory:', cleanupError.message);
  }
} 
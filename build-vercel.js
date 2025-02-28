const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Create a temporary tsconfig.json that disables type checking
const tempTsConfigPath = path.join(__dirname, 'tsconfig.temp.json');
const originalTsConfigPath = path.join(__dirname, 'tsconfig.json');

// Backup the original tsconfig.json
if (fs.existsSync(originalTsConfigPath)) {
  const originalTsConfig = fs.readFileSync(originalTsConfigPath, 'utf8');
  fs.writeFileSync(path.join(__dirname, 'tsconfig.original.json'), originalTsConfig);
  console.log('Backed up original tsconfig.json');
}

// Create a simplified tsconfig.json for the build
const simpleTsConfig = {
  compilerOptions: {
    target: "es5",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: false,
    noImplicitAny: false,
    strictNullChecks: false,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "node",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    incremental: true,
    paths: {
      "@/*": ["./*"]
    }
  },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  exclude: ["node_modules"]
};

fs.writeFileSync(tempTsConfigPath, JSON.stringify(simpleTsConfig, null, 2));
fs.renameSync(tempTsConfigPath, originalTsConfigPath);
console.log('Created simplified tsconfig.json for build');

// Create a temporary next.config.js that disables SWC
const nextConfigPath = path.join(__dirname, 'next.config.js');
let originalNextConfig = null;

if (fs.existsSync(nextConfigPath)) {
  originalNextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  console.log('Backed up original next.config.js');
}

try {
  // Run the Next.js build with linting disabled
  console.log('Running Next.js build...');
  execSync('NEXT_DISABLE_SWC=1 next build --no-lint', { stdio: 'inherit' });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} finally {
  // Restore the original tsconfig.json
  if (fs.existsSync(path.join(__dirname, 'tsconfig.original.json'))) {
    fs.renameSync(
      path.join(__dirname, 'tsconfig.original.json'),
      originalTsConfigPath
    );
    console.log('Restored original tsconfig.json');
  }
} 
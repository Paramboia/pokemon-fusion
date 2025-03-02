const fs = require('fs');
const path = require('path');

console.log('Running pre-build script...');

// Function to delete a file if it exists
function deleteFileIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${filePath}`);
    } else {
      console.log(`File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting ${filePath}:`, error.message);
  }
}

// Delete Babel configuration files
console.log('Removing Babel configuration files...');
deleteFileIfExists(path.join(__dirname, '.babelrc'));
deleteFileIfExists(path.join(__dirname, '.babelrc.js'));
deleteFileIfExists(path.join(__dirname, '.babelrc.json'));
deleteFileIfExists(path.join(__dirname, 'babel.config.js'));
deleteFileIfExists(path.join(__dirname, 'babel.config.json'));

// Delete next.config.mjs if it exists
console.log('Removing next.config.mjs if it exists...');
deleteFileIfExists(path.join(__dirname, 'next.config.mjs'));

// Create a .npmrc file to ensure legacy peer deps
console.log('Creating .npmrc file...');
try {
  const npmrcPath = path.join(__dirname, '.npmrc');
  const npmrcContent = 'legacy-peer-deps=true\n';
  fs.writeFileSync(npmrcPath, npmrcContent);
  console.log('Created .npmrc file');
} catch (error) {
  console.error('Error creating .npmrc:', error.message);
}

console.log('Pre-build script completed successfully'); 
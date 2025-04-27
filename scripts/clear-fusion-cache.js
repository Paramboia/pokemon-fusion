// Script to clear fusion cache from localStorage
// Run this in the browser console to reset fusion data

console.log(`
// Copy and paste this code in the browser console to clear fusion cache

(function() {
  console.log('======================================');
  console.log('Fusion Cache Cleaner');
  console.log('======================================');
  
  // Check if we have fusion data in localStorage
  const hasFusionData = localStorage.getItem('lastGeneratedFusion');
  
  if (hasFusionData) {
    console.log('Found fusion data in localStorage, removing it...');
    localStorage.removeItem('lastGeneratedFusion');
    console.log('Fusion data removed from localStorage!');
  } else {
    console.log('No fusion data found in localStorage.');
  }
  
  // Clear any other related data
  console.log('\\nClearing other related cache items...');
  
  // List of keys that might be related to fusions
  const keysToCheck = [
    'fusion-', 
    'pokemon-', 
    'isLocalFallback',
    'fusionImage',
    'fusionData',
    'lastFusion'
  ];
  
  // Loop through all localStorage items and remove matching ones
  const itemsToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && keysToCheck.some(pattern => key.includes(pattern))) {
      itemsToRemove.push(key);
    }
  }
  
  // Remove matched items
  if (itemsToRemove.length > 0) {
    console.log(\`Found \${itemsToRemove.length} related cache items:\`);
    itemsToRemove.forEach(key => {
      console.log(\` - \${key}\`);
      localStorage.removeItem(key);
    });
    console.log('All related cache items cleared!');
  } else {
    console.log('No related cache items found.');
  }
  
  console.log('\\n== Clear session and application cache ==');
  console.log('To fully clear all cache:');
  console.log('1. Press Ctrl+Shift+Delete (Windows/Linux) or Cmd+Shift+Delete (Mac)');
  console.log('2. Check "Cookies and other site data" and "Cached images and files"');
  console.log('3. Click "Clear data"');
  console.log('4. Reload the page (Ctrl+F5 or Cmd+Shift+R)');
  
  console.log('\\nCache clearing complete!');
  console.log('======================================');
  
  return 'Cache cleared successfully!';
})();
`);

// To run this script in Node.js:
// - Save this file
// - Run it with: node scripts/clear-fusion-cache.js
// - Copy the output
// - Paste in your browser console to clear the cache 
// fix-suspense.js
// This script finds and lists files that use useSearchParams without proper Suspense handling

const fs = require('fs');
const path = require('path');

console.log('=== Checking for useSearchParams usage ===\n');

function findFiles(dir, pattern) {
  const files = [];
  
  function traverse(currentPath) {
    try {
      const stats = fs.statSync(currentPath);
      
      if (stats.isDirectory()) {
        if (currentPath.includes('node_modules') || 
            currentPath.includes('.next') || 
            currentPath.includes('.git')) {
          return;
        }
        
        fs.readdirSync(currentPath).forEach(file => {
          traverse(path.join(currentPath, file));
        });
      } else if (stats.isFile() && pattern.test(currentPath)) {
        files.push(currentPath);
      }
    } catch (error) {
      // Skip files/directories that can't be accessed
    }
  }
  
  traverse(dir);
  return files;
}

// Find all TypeScript/TSX files
const srcPath = path.join(process.cwd(), 'src');
const tsFiles = findFiles(srcPath, /\.(ts|tsx)$/);

const filesToFix = [];

tsFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file uses useSearchParams
    if (content.includes('useSearchParams')) {
      // Check if it already has Suspense
      const hasSuspense = content.includes('Suspense') && content.includes('<Suspense');
      
      if (!hasSuspense) {
        filesToFix.push(path.relative(process.cwd(), filePath));
      }
    }
  } catch (error) {
    // Skip files that can't be read
  }
});

if (filesToFix.length > 0) {
  console.log(`Found ${filesToFix.length} files that may need Suspense boundaries:\n`);
  filesToFix.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  console.log('\nThese files use useSearchParams() without apparent Suspense boundaries.');
  console.log('You may need to wrap components using useSearchParams in <Suspense>.');
} else {
  console.log('✓ No files found that need Suspense boundaries for useSearchParams.');
}

console.log('\n=== Done! ===');

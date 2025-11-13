// fix-styled-title.js
// Run this script from your project root: node fix-styled-title.js

const fs = require('fs');
const path = require('path');

console.log('=== Fixing StyledContentTitle usage ===\n');

// Function to recursively find all TypeScript/TSX files
function findFiles(dir, pattern) {
  const files = [];
  
  function traverse(currentPath) {
    try {
      const stats = fs.statSync(currentPath);
      
      if (stats.isDirectory()) {
        // Skip these directories
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

// Find all TypeScript/TSX files in src directory
const srcPath = path.join(process.cwd(), 'src');
const tsFiles = findFiles(srcPath, /\.(ts|tsx)$/);

console.log(`Scanning ${tsFiles.length} TypeScript/TSX files for StyledContentTitle usage...\n`);

let totalFixed = 0;

tsFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Only process files that contain StyledContentTitle
    if (!content.includes('StyledContentTitle')) {
      return;
    }
    
    const relativePath = path.relative(process.cwd(), filePath);
    let originalContent = content;
    
    // Remove imageCount prop from StyledContentTitle
    // This regex matches imageCount={...} with any content inside the braces
    const regex = /(\s*imageCount={[^}]+})/g;
    
    // Count occurrences
    const matches = content.match(regex);
    const occurrences = matches ? matches.length : 0;
    
    if (occurrences > 0) {
      // Replace all occurrences
      content = content.replace(regex, '');
      
      // Clean up any double spaces that might be left
      content = content.replace(/\s+\n/g, '\n');
      content = content.replace(/  +/g, ' ');
      
      // Save the file
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed ${occurrences} occurrence(s) in: ${relativePath}`);
      totalFixed += occurrences;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n=== Done! Fixed ${totalFixed} total occurrences ===`);
console.log('\nThe StyledContentTitle component extracts image count from the title string.');
console.log('Make sure your titles are in the format: "[X IMAGES] Title Text"');
console.log('\nNext step: npm run build');

// Path: scripts/update-auth-imports.js
/**
 * Script to update all authOptions imports from the route file to the new config file
 * Run this with: node scripts/update-auth-imports.js
 */

const fs = require('fs');
const path = require('path');

// The old import pattern to replace
const oldImportPattern = /from\s+['"]@\/app\/api\/auth\/\[\.\.\.nextauth\]\/route['"]/g;
const newImport = 'from "@/lib/auth.config"';

// Directories to search in
const searchDirs = ['src'];

// File extensions to process
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];

let filesUpdated = 0;
let totalFilesChecked = 0;

function updateImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('@/app/api/auth/[...nextauth]/route')) {
      const updatedContent = content.replace(oldImportPattern, newImport);
      
      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✅ Updated: ${filePath}`);
        filesUpdated++;
      }
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .next directories
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        walkDirectory(filePath);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (fileExtensions.includes(ext)) {
        totalFilesChecked++;
        updateImportsInFile(filePath);
      }
    }
  });
}

console.log('🔍 Starting to update authOptions imports...\n');

searchDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDirectory(dir);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Total files checked: ${totalFilesChecked}`);
console.log(`   Files updated: ${filesUpdated}`);
console.log('\n✨ Import update complete!');

if (filesUpdated > 0) {
  console.log('\n⚠️  Please run "npm run build" to verify all imports are working correctly.');
}

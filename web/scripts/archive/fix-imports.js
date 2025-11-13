// fix-imports.js
// Run this script from your project root: node fix-imports.js

const fs = require('fs');
const path = require('path');

// Files that need import updates based on the error
const filesToUpdate = [
  'src/app/api/characters/route.ts',
  'src/app/api/commissions/route.ts',
  'src/app/api/commissions/status/route.ts',
  'src/app/api/admin/commissions/route.ts',
  'src/app/api/admin/commissions/[commissionId]/route.ts',
  // Add any other files that import from the NextAuth route
];

filesToUpdate.forEach(filePath => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace the incorrect import
    const oldImport = "import { authOptions } from '@/app/api/auth/[...nextauth]/route'";
    const newImport = "import { authOptions } from '@/lib/auth.config'";
    
    if (content.includes(oldImport)) {
      content = content.replace(oldImport, newImport);
      fs.writeFileSync(fullPath, content);
      console.log(`✓ Updated import in: ${filePath}`);
    } else {
      console.log(`- No changes needed in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
});

console.log('\nDone! Remember to rebuild your project after these changes.');

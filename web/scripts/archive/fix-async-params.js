// Path: scripts/ultra-simple-fix.js
/**
 * Ultra simple fix for async params
 * Run with: node scripts/ultra-simple-fix.js
 */

const fs = require('fs');
const path = require('path');

const searchDir = 'src/app/api';
let filesFixed = 0;

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already fixed
    if (content.includes('await params')) {
      return false;
    }
    
    // Find all params.XXX in the file
    const matches = content.match(/params\.(\w+)/g);
    if (!matches) {
      return false;
    }
    
    // Get unique param names
    const paramNames = [...new Set(matches.map(m => m.replace('params.', '')))];
    console.log(`  Params found: ${paramNames.join(', ')}`);
    
    // Create the await line
    const awaitLine = `const { ${paramNames.join(', ')} } = await params`;
    
    // For each function in the file, add the await line
    const functions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    
    functions.forEach(method => {
      // Simple pattern: find "function METHOD" and add line after the next {
      const pattern = new RegExp(`(export\\s+async\\s+function\\s+${method}[^{]+{)`, 'g');
      
      content = content.replace(pattern, (match) => {
        // Check if this function actually uses params
        const functionEnd = content.indexOf('}', content.indexOf(match));
        const functionBody = content.substring(content.indexOf(match), functionEnd);
        
        if (functionBody.includes('params.')) {
          console.log(`  Adding await to ${method} function`);
          return match + '\n  ' + awaitLine;
        }
        return match;
      });
    });
    
    // Now replace all params.XXX with just XXX
    paramNames.forEach(param => {
      content = content.replace(new RegExp(`params\\.${param}`, 'g'), param);
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    filesFixed++;
    return true;
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    
    if (fs.statSync(fullPath).isDirectory() && !file.includes('node_modules')) {
      walkDir(fullPath);
    } else if (file === 'route.ts') {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('params.') && !content.includes('await params')) {
        console.log(`\nProcessing: ${fullPath}`);
        fixFile(fullPath);
      }
    }
  });
}

console.log('🔧 Ultra simple fix starting...\n');
walkDir(searchDir);
console.log(`\n✅ Fixed ${filesFixed} files`);

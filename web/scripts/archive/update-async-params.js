// Path: scripts/update-async-params.js
/**
 * Script to update dynamic route handlers to use async params (Next.js 15)
 * Run this with: node scripts/update-async-params.js
 */

const fs = require('fs');
const path = require('path');

// Directories to search in
const searchDirs = ['src/app/api'];

// Track stats
let filesUpdated = 0;
let totalFilesChecked = 0;
let errors = [];

/**
 * Check if a file path contains dynamic segments
 */
function isDynamicRoute(filePath) {
  return /\[[\w]+\]/.test(filePath);
}

/**
 * Update a route file to use async params
 */
function updateRouteFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Pattern to match route handler function signatures with params
    const functionPattern = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*request:\s*NextRequest\s*,\s*{\s*params\s*}\s*:\s*{\s*params:\s*({[^}]+})\s*}\s*\)/g;
    
    content = content.replace(functionPattern, (match, method, paramsType) => {
      // Check if it's already using Promise
      if (paramsType.includes('Promise<')) {
        return match;
      }
      
      updated = true;
      console.log(`  ✓ Updating ${method} handler`);
      
      // Add Promise wrapper to params type
      const newParamsType = `Promise<${paramsType}>`;
      return `export async function ${method}(request: NextRequest, { params }: { params: ${newParamsType} })`;
    });

    // Pattern to find params usage in the function body
    if (updated) {
      // Find all param names from the type definition
      const paramMatches = content.matchAll(/params:\s*Promise<{\s*([^}]+)\s*}>/g);
      for (const match of paramMatches) {
        const paramsContent = match[1];
        const paramNames = paramsContent
          .split(',')
          .map(p => p.trim().split(':')[0].trim())
          .filter(p => p);

        // For each function, add await params at the beginning if not already present
        const functionBodyPattern = new RegExp(
          `(export\\s+async\\s+function\\s+(?:GET|POST|PUT|PATCH|DELETE)\\s*\\([^)]+\\)\\s*{)([^}]*)(})`,
          'g'
        );

        content = content.replace(functionBodyPattern, (match, functionStart, functionBody, functionEnd) => {
          // Check if params are already being awaited
          if (functionBody.includes('await params')) {
            return match;
          }

          // Check if this function uses params
          const usesParams = paramNames.some(paramName => {
            const patterns = [
              `params\\.${paramName}`,
              `params\\["${paramName}"\\]`,
              `params\\['${paramName}'\\]`
            ];
            return patterns.some(pattern => new RegExp(pattern).test(functionBody));
          });

          if (usesParams) {
            // Add destructuring assignment at the beginning of the function
            const destructuring = `\n    const { ${paramNames.join(', ')} } = await params`;
            
            // Update all params.paramName references to just paramName
            let updatedBody = functionBody;
            paramNames.forEach(paramName => {
              // Replace params.paramName with paramName
              updatedBody = updatedBody.replace(
                new RegExp(`params\\.${paramName}`, 'g'),
                paramName
              );
              // Replace params["paramName"] with paramName
              updatedBody = updatedBody.replace(
                new RegExp(`params\\["${paramName}"\\]`, 'g'),
                paramName
              );
              // Replace params['paramName'] with paramName
              updatedBody = updatedBody.replace(
                new RegExp(`params\\['${paramName}'\\]`, 'g'),
                paramName
              );
            });

            return functionStart + destructuring + updatedBody + functionEnd;
          }

          return match;
        });
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      filesUpdated++;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    errors.push({ file: filePath, error: error.message });
  }
}

/**
 * Walk through directories to find and update route files
 */
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
    } else if (stat.isFile() && file === 'route.ts' && isDynamicRoute(filePath)) {
      totalFilesChecked++;
      console.log(`\nChecking: ${filePath}`);
      updateRouteFile(filePath);
    }
  });
}

console.log('🔍 Starting to update dynamic routes to async params...\n');

searchDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDirectory(dir);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Total dynamic routes checked: ${totalFilesChecked}`);
console.log(`   Files updated: ${filesUpdated}`);
console.log(`   Errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n❌ Errors encountered:');
  errors.forEach(({ file, error }) => {
    console.log(`   ${file}: ${error}`);
  });
}

console.log('\n✨ Async params update complete!');

if (filesUpdated > 0) {
  console.log('\n⚠️  Please run "npm run build" to verify all routes are working correctly.');
}

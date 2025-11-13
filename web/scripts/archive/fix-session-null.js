// fix-session-null.js
const fs = require('fs');
const path = require('path');

console.log('=== Fixing session null checks in home page ===\n');

const homePath = path.join(process.cwd(), 'src/app/page.tsx');
let content = fs.readFileSync(homePath, 'utf8');

// Fix 1: Replace all instances of characters.map without type annotation
content = content.replace(
  /set\.characters\.map\(char => char\.name\)/g,
  'set.characters.map((char: any) => char.name)'
);

// Fix 2: Ensure all session access uses optional chaining
content = content.replace(
  /session\.user\.id/g,
  'session?.user?.id'
);

content = content.replace(
  /session\.user\.isActivePatron/g,
  'session?.user?.isActivePatron'
);

content = content.replace(
  /session\.user\.membershipTier/g,
  'session?.user?.membershipTier'
);

// Fix 3: Fix the duplicate optional chaining that might occur
content = content.replace(
  /session\?\?\.user\?\?\.id/g,
  'session?.user?.id'
);

// Save the updated file
fs.writeFileSync(homePath, content);

console.log('✓ Fixed session null checks in src/app/page.tsx');
console.log('\nChanges made:');
console.log('- Added type annotation to characters.map()');
console.log('- Added optional chaining to all session access');
console.log('\nNext steps:');
console.log('1. Review the changes');
console.log('2. Restart your dev server');

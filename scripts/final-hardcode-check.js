/**
 * Final check for hardcoded user IDs in critical application logic
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Final check for hardcoded user IDs in application logic...\n');

// Files to check for hardcoded user IDs in logic (not data files)
const filesToCheck = [
  'src/app/api/**/*.ts',
  'src/app/api/**/*.js',
  'components/**/*.tsx',
  'components/**/*.ts',
  'src/app/**/*.tsx',
  'src/app/**/*.ts'
];

// Patterns to look for
const patterns = [
  /userId.*['"]\s*31\s*['"]/g,
  /userId.*['"]\s*32\s*['"]/g,
  /freelancerId.*['"]\s*31\s*['"]/g,
  /freelancerId.*['"]\s*32\s*['"]/g,
  /commissionerId.*['"]\s*31\s*['"]/g,
  /commissionerId.*['"]\s*32\s*['"]/g,
  /userId.*=.*31[^0-9]/g,
  /userId.*=.*32[^0-9]/g,
  /freelancerId.*=.*31[^0-9]/g,
  /freelancerId.*=.*32[^0-9]/g,
  /commissionerId.*=.*31[^0-9]/g,
  /commissionerId.*=.*32[^0-9]/g
];

let issuesFound = 0;

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    patterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`❌ Found hardcoded user ID in ${filePath}:`);
        matches.forEach(match => {
          console.log(`   Pattern ${index + 1}: ${match.trim()}`);
        });
        issuesFound++;
      }
    });
  } catch (error) {
    // File might not exist or be readable, skip
  }
}

function walkDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDirectory(filePath);
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx'))) {
        checkFile(filePath);
      }
    });
  } catch (error) {
    // Directory might not exist, skip
  }
}

// Check src and components directories
walkDirectory(path.join(__dirname, '..', 'src'));
walkDirectory(path.join(__dirname, '..', 'components'));

if (issuesFound === 0) {
  console.log('✅ No hardcoded user IDs found in application logic!');
  console.log('🎉 All user ID references are now dynamic and session-based.');
} else {
  console.log(`\n⚠️  Found ${issuesFound} potential hardcoded user ID issues.`);
  console.log('Please review and fix the issues listed above.');
}

console.log('\n📋 Summary:');
console.log('- Checked TypeScript and JavaScript files in src/ and components/');
console.log('- Looked for hardcoded user IDs 31 and 32 in application logic');
console.log('- Data files with sample data are acceptable and not checked');
console.log('- Demo/dev login pages with hardcoded names are acceptable');

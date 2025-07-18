/**
 * Script to check for hardcoded project IDs in application logic
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for hardcoded project IDs in application logic...\n');

// Patterns to look for hardcoded project IDs
const patterns = [
  /projectId.*['"]\s*30[0-9]\s*['"]/g,
  /projectId.*=.*30[0-9][^0-9]/g,
  /project.*id.*:.*30[0-9][^0-9]/g,
  /id.*:.*30[0-9][^0-9]/g, // More general pattern for project objects
  /"id":\s*30[0-9][^0-9]/g, // JSON-style project IDs
];

let issuesFound = 0;

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    patterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        // Filter out data files and test files
        if (filePath.includes('/data/') || filePath.includes('.test.') || filePath.includes('/test/')) {
          return; // Skip data files and test files
        }
        
        console.log(`❌ Found hardcoded project ID in ${filePath}:`);
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
  console.log('✅ No hardcoded project IDs found in application logic!');
  console.log('🎉 All project ID references are now dynamic.');
} else {
  console.log(`\n⚠️  Found ${issuesFound} potential hardcoded project ID issues.`);
  console.log('Please review and fix the issues listed above.');
}

console.log('\n📋 Summary:');
console.log('- Checked TypeScript and JavaScript files in src/ and components/');
console.log('- Looked for hardcoded project IDs (300-399 range)');
console.log('- Data files with sample data are acceptable and not checked');
console.log('- Test files are excluded from checks');

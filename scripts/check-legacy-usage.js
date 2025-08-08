#!/usr/bin/env node

/**
 * Legacy Storage Usage Checker
 * 
 * Scans the codebase for legacy file access patterns and provides
 * specific recommendations for each violation.
 */

const fs = require('fs');
const path = require('path');

const LEGACY_PATTERNS = [
  {
    pattern: /data\/projects\.json/g,
    replacement: 'readAllProjects() from @/lib/projects-utils',
    description: 'Projects should use hierarchical storage'
  },
  {
    pattern: /data\/project-tasks\.json/g,
    replacement: 'readAllTasks() from @/lib/project-tasks/hierarchical-storage',
    description: 'Project tasks should use hierarchical storage'
  },
  {
    pattern: /data\/invoices\.json/g,
    replacement: 'getAllInvoices() from @/lib/invoice-storage',
    description: 'Invoices should use hierarchical storage'
  },
  {
    pattern: /data\/gigs\/gigs\.json/g,
    replacement: 'readAllGigs() from @/lib/gigs/hierarchical-storage',
    description: 'Gigs should use hierarchical storage'
  },
  {
    pattern: /fs\.readFileSync\s*\(\s*.*data\/[^,)]+\.json/g,
    replacement: 'Use appropriate hierarchical storage function',
    description: 'Direct fs.readFileSync calls to data files should be replaced'
  },
  {
    pattern: /fs\.promises\.readFile\s*\(\s*.*data\/[^,)]+\.json/g,
    replacement: 'Use appropriate hierarchical storage function',
    description: 'Direct fs.readFile calls to data files should be replaced'
  }
];

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,
  /scripts\/migrate-/,        // Exclude migration scripts
  /scripts\/fix-/,            // Exclude fix scripts
  /deprecated/,               // Exclude deprecated folders
  /legacy-prevention/,        // Exclude the prevention system itself
  /storage-migration-guard/   // Exclude migration guard (contains patterns as docs)
];

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const violations = [];

    LEGACY_PATTERNS.forEach(({ pattern, replacement, description }) => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = content.split('\n')[lineNumber - 1];
        
        violations.push({
          file: filePath,
          line: lineNumber,
          match: match[0],
          replacement,
          description,
          context: line.trim()
        });
      }
    });

    return violations;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

function scanDirectory(dirPath) {
  const violations = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      
      if (shouldExcludeFile(itemPath)) {
        continue;
      }
      
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        violations.push(...scanDirectory(itemPath));
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        violations.push(...scanFile(itemPath));
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
  
  return violations;
}

function generateReport(violations) {
  console.log('\n🔍 LEGACY STORAGE USAGE REPORT');
  console.log('=' .repeat(60));
  
  if (violations.length === 0) {
    console.log('✅ No legacy storage usage found!');
    return;
  }
  
  console.log(`❌ Found ${violations.length} legacy storage usage violations:\n`);
  
  // Group by file
  const violationsByFile = violations.reduce((acc, violation) => {
    if (!acc[violation.file]) {
      acc[violation.file] = [];
    }
    acc[violation.file].push(violation);
    return acc;
  }, {});
  
  Object.entries(violationsByFile).forEach(([file, fileViolations]) => {
    console.log(`📁 ${file}`);
    
    fileViolations.forEach(violation => {
      console.log(`   Line ${violation.line}: ${violation.match}`);
      console.log(`   Context: ${violation.context}`);
      console.log(`   Fix: ${violation.replacement}`);
      console.log(`   Reason: ${violation.description}\n`);
    });
  });
  
  // Summary by pattern
  console.log('\n📊 SUMMARY BY PATTERN:');
  const patternCounts = violations.reduce((acc, violation) => {
    acc[violation.match] = (acc[violation.match] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(patternCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([pattern, count]) => {
      console.log(`   ${pattern}: ${count} occurrences`);
    });
  
  console.log('\n🛠️ RECOMMENDED ACTIONS:');
  console.log('1. Replace direct file access with hierarchical storage functions');
  console.log('2. Update imports to use the correct storage modules');
  console.log('3. Test thoroughly after making changes');
  console.log('4. Run this script again to verify fixes');
  
  console.log('\n📚 HIERARCHICAL STORAGE FUNCTIONS:');
  console.log('   Projects: readAllProjects(), readProject(id)');
  console.log('   Tasks: readAllTasks(), readProjectTasks(projectId)');
  console.log('   Invoices: getAllInvoices(), getInvoiceById(id)');
  console.log('   Gigs: readAllGigs(), readGig(id)');
}

function main() {
  console.log('🔍 Scanning for legacy storage usage...');
  
  const srcViolations = scanDirectory('./src');
  const componentViolations = scanDirectory('./components');
  
  const allViolations = [...srcViolations, ...componentViolations];
  
  generateReport(allViolations);
  
  // Exit with error code if violations found
  if (allViolations.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, scanFile, generateReport };

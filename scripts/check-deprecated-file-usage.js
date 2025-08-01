#!/usr/bin/env node

/**
 * Deprecated File Usage Checker
 * 
 * This script scans the codebase for any remaining references to deprecated
 * flat file paths that should be using hierarchical storage instead.
 */

const fs = require('fs');
const path = require('path');

const DEPRECATED_PATTERNS = [
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
    pattern: /data\/gigs\/gigs\.json/g,
    replacement: 'readAllGigs() from @/lib/gigs/hierarchical-storage',
    description: 'Gigs should use hierarchical storage'
  },
  {
    pattern: /data\/invoices\.json/g,
    replacement: 'getAllInvoices() from @/lib/invoice-storage',
    description: 'Invoices should use hierarchical storage'
  }
];

const SCAN_DIRECTORIES = [
  'src/app/api',
  'src/lib',
  'scripts'
];

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  'check-deprecated-file-usage.js', // Ignore this script itself
  'storage-migration-guard.ts' // Ignore the guard file
];

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function scanFile(filePath) {
  if (shouldIgnoreFile(filePath)) return [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues = [];
    
    DEPRECATED_PATTERNS.forEach(({ pattern, replacement, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          file: filePath,
          pattern: pattern.source,
          replacement,
          description,
          occurrences: matches.length
        });
      }
    });
    
    return issues;
  } catch (error) {
    // Skip files that can't be read
    return [];
  }
}

function scanDirectory(dirPath) {
  const issues = [];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        issues.push(...scanDirectory(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        issues.push(...scanFile(fullPath));
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
  
  return issues;
}

function main() {
  console.log('🔍 Scanning codebase for deprecated file usage patterns...\n');
  
  let allIssues = [];
  
  for (const scanDir of SCAN_DIRECTORIES) {
    const fullPath = path.join(process.cwd(), scanDir);
    if (fs.existsSync(fullPath)) {
      console.log(`📁 Scanning ${scanDir}...`);
      const issues = scanDirectory(fullPath);
      allIssues.push(...issues);
    }
  }
  
  if (allIssues.length === 0) {
    console.log('✅ No deprecated file usage patterns found!');
    console.log('🎉 All APIs appear to be using hierarchical storage correctly.');
    return;
  }
  
  console.log(`\n⚠️  Found ${allIssues.length} deprecated file usage pattern(s):\n`);
  
  // Group issues by file
  const issuesByFile = {};
  allIssues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  });
  
  Object.entries(issuesByFile).forEach(([file, issues]) => {
    console.log(`📄 ${file}:`);
    issues.forEach(issue => {
      console.log(`   ❌ Pattern: ${issue.pattern} (${issue.occurrences} occurrence(s))`);
      console.log(`   ✅ Use instead: ${issue.replacement}`);
      console.log(`   📝 ${issue.description}`);
      console.log('');
    });
  });
  
  console.log('🔧 RECOMMENDED ACTIONS:');
  console.log('1. Update the identified files to use hierarchical storage functions');
  console.log('2. Import the appropriate utility functions from the lib directories');
  console.log('3. Replace direct file reads with the hierarchical storage functions');
  console.log('4. Test the updated APIs to ensure they work correctly');
  console.log('5. Run this script again to verify all issues are resolved');
  
  process.exit(1); // Exit with error code to indicate issues found
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, scanFile, DEPRECATED_PATTERNS };

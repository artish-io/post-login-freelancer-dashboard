#!/usr/bin/env node

/**
 * Deprecate Redundant Files Script
 * 
 * This script identifies and safely deprecates redundant storage files
 * after the unified storage system implementation.
 */

const fs = require('fs').promises;
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Files to deprecate (move to deprecated folder)
const filesToDeprecate = [
  // Repository pattern files
  'src/app/api/payments/repos/projects-repo.ts',
  'src/app/api/payments/repos/tasks-repo.ts',
  'src/app/api/payments/repos/invoices-repo.ts',
  
  // Legacy flat storage files (if they contain data)
  'data/projects/projects.json',
  'data/project-tasks/tasks.json',
  
  // Duplicate task endpoints
  'src/app/api/tasks/submit/route.ts',
  'src/app/api/tasks/approve/route.ts',
  'src/app/api/project-tasks/review/route.ts'
];

// Files to mark as deprecated with comments
const filesToMarkDeprecated = [
  'src/lib/project-tasks/legacy-storage.ts',
  'src/lib/projects/legacy-utils.ts'
];

async function main() {
  log('🗂️ Starting redundant file deprecation...', 'bright');
  log('', 'reset');

  try {
    // Step 1: Create deprecated folder
    await createDeprecatedFolder();
    
    // Step 2: Move redundant files
    await moveRedundantFiles();
    
    // Step 3: Mark files as deprecated
    await markFilesAsDeprecated();
    
    // Step 4: Update imports and references
    await updateImportReferences();
    
    // Step 5: Generate deprecation report
    await generateDeprecationReport();
    
    log('', 'reset');
    log('🎉 File deprecation completed successfully!', 'green');
    log('', 'reset');
    log('Files have been safely moved to the deprecated folder.', 'yellow');
    log('Check DEPRECATED_FILES.md for details.', 'yellow');
    
  } catch (error) {
    log('', 'reset');
    log('❌ File deprecation failed:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

async function createDeprecatedFolder() {
  log('📁 Creating deprecated folder structure...', 'cyan');
  
  const deprecatedPath = path.join(process.cwd(), 'deprecated');
  const subFolders = [
    'repos',
    'legacy-storage',
    'duplicate-endpoints',
    'flat-files'
  ];
  
  try {
    await fs.mkdir(deprecatedPath, { recursive: true });
    
    for (const folder of subFolders) {
      await fs.mkdir(path.join(deprecatedPath, folder), { recursive: true });
    }
    
    log('  ✓ Deprecated folder structure created', 'green');
  } catch (error) {
    log(`  ❌ Failed to create deprecated folders: ${error.message}`, 'red');
    throw error;
  }
}

async function moveRedundantFiles() {
  log('📦 Moving redundant files to deprecated folder...', 'cyan');
  
  const movedFiles = [];
  const notFoundFiles = [];
  
  for (const filePath of filesToDeprecate) {
    const fullPath = path.join(process.cwd(), filePath);
    
    try {
      // Check if file exists
      await fs.access(fullPath);
      
      // Determine destination folder
      let destFolder = 'misc';
      if (filePath.includes('/repos/')) destFolder = 'repos';
      else if (filePath.includes('/tasks/') || filePath.includes('/project-tasks/')) destFolder = 'duplicate-endpoints';
      else if (filePath.endsWith('.json')) destFolder = 'flat-files';
      else if (filePath.includes('legacy')) destFolder = 'legacy-storage';
      
      // Create destination path
      const fileName = path.basename(filePath);
      const destPath = path.join(process.cwd(), 'deprecated', destFolder, fileName);
      
      // Move file
      await fs.rename(fullPath, destPath);
      movedFiles.push({ from: filePath, to: `deprecated/${destFolder}/${fileName}` });
      
      log(`  ✓ Moved ${filePath}`, 'green');
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        notFoundFiles.push(filePath);
        log(`  ⚠️ File not found: ${filePath}`, 'yellow');
      } else {
        log(`  ❌ Failed to move ${filePath}: ${error.message}`, 'red');
        throw error;
      }
    }
  }
  
  log(`  📊 Moved ${movedFiles.length} files, ${notFoundFiles.length} not found`, 'blue');
}

async function markFilesAsDeprecated() {
  log('🏷️ Marking files as deprecated...', 'cyan');
  
  for (const filePath of filesToMarkDeprecated) {
    const fullPath = path.join(process.cwd(), filePath);
    
    try {
      // Check if file exists
      await fs.access(fullPath);
      
      // Read current content
      const content = await fs.readFile(fullPath, 'utf-8');
      
      // Add deprecation notice at the top
      const deprecationNotice = `/**
 * @deprecated This file has been deprecated in favor of the unified storage system.
 * Use UnifiedStorageService from src/lib/storage/unified-storage-service.ts instead.
 * 
 * This file will be removed in a future version.
 * Date deprecated: ${new Date().toISOString().split('T')[0]}
 */

`;
      
      const updatedContent = deprecationNotice + content;
      await fs.writeFile(fullPath, updatedContent);
      
      log(`  ✓ Marked ${filePath} as deprecated`, 'green');
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        log(`  ⚠️ File not found: ${filePath}`, 'yellow');
      } else {
        log(`  ❌ Failed to mark ${filePath}: ${error.message}`, 'red');
      }
    }
  }
}

async function updateImportReferences() {
  log('🔗 Updating import references...', 'cyan');
  
  // This would scan for imports of deprecated files and suggest replacements
  // For now, we'll just log what should be updated
  
  const importUpdates = [
    {
      from: "import { createProject, getProjectById } from '@/app/api/payments/repos/projects-repo'",
      to: "import { UnifiedStorageService } from '@/lib/storage/unified-storage-service'"
    },
    {
      from: "import { createTask, getTaskById } from '@/app/api/payments/repos/tasks-repo'",
      to: "import { UnifiedTaskService } from '@/lib/services/unified-task-service'"
    }
  ];
  
  log('  📋 Import updates needed:', 'blue');
  for (const update of importUpdates) {
    log(`    - Replace: ${update.from}`, 'yellow');
    log(`      With: ${update.to}`, 'green');
  }
}

async function generateDeprecationReport() {
  log('📄 Generating deprecation report...', 'cyan');
  
  const reportContent = `# Deprecated Files Report

## Overview

This report documents files that have been deprecated as part of the unified storage system implementation.

## Deprecated Files

### Repository Pattern Files (moved to deprecated/repos/)
- \`projects-repo.ts\` - Replaced by UnifiedStorageService
- \`tasks-repo.ts\` - Replaced by UnifiedTaskService  
- \`invoices-repo.ts\` - Replaced by UnifiedStorageService

### Duplicate Endpoints (moved to deprecated/duplicate-endpoints/)
- \`/api/tasks/submit/route.ts\` - Replaced by unified /api/project-tasks/submit
- \`/api/tasks/approve/route.ts\` - Replaced by unified /api/project-tasks/submit
- \`/api/project-tasks/review/route.ts\` - Replaced by unified /api/project-tasks/submit

### Legacy Storage Files (moved to deprecated/flat-files/)
- \`projects.json\` - Replaced by hierarchical storage
- \`tasks.json\` - Replaced by hierarchical storage

## Replacement Guide

### For Projects
\`\`\`typescript
// OLD
import { createProject, getProjectById } from '@/app/api/payments/repos/projects-repo';

// NEW
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

// Usage
const project = await UnifiedStorageService.getProjectById(projectId);
await UnifiedStorageService.saveProject(project);
\`\`\`

### For Tasks
\`\`\`typescript
// OLD
import { createTask, updateTask } from '@/app/api/payments/repos/tasks-repo';

// NEW
import { UnifiedTaskService } from '@/lib/services/unified-task-service';

// Usage
const result = await UnifiedTaskService.submitTask(taskId, userId, submissionData);
const result = await UnifiedTaskService.approveTask(taskId, userId);
\`\`\`

### For Invoices
\`\`\`typescript
// OLD
import { createInvoice, getInvoiceById } from '@/app/api/payments/repos/invoices-repo';

// NEW
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

// Usage
const invoice = await UnifiedStorageService.getInvoiceByNumber(invoiceNumber);
await UnifiedStorageService.saveInvoice(invoice);
\`\`\`

## Benefits of New System

1. **Single Source of Truth**: All data operations go through unified services
2. **Consistent Storage**: Hierarchical storage for all entities
3. **Better Error Handling**: Centralized error handling and validation
4. **Transaction Integrity**: Atomic operations for complex workflows
5. **Easier Testing**: Unified interfaces for mocking and testing

## Migration Checklist

- [ ] Update all imports to use unified services
- [ ] Test all endpoints with new unified APIs
- [ ] Remove references to deprecated files
- [ ] Update documentation
- [ ] Remove deprecated folder after testing

Generated on: ${new Date().toISOString()}
`;

  const reportPath = path.join(process.cwd(), 'DEPRECATED_FILES.md');
  await fs.writeFile(reportPath, reportContent);
  
  log('  ✓ Report generated: DEPRECATED_FILES.md', 'green');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };

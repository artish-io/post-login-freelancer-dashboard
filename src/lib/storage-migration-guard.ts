/**
 * Storage Migration Guard
 * 
 * This utility helps detect and prevent issues related to the migration
 * from flat file storage to hierarchical storage structure.
 */

import fs from 'fs';
import path from 'path';

interface DeprecatedFile {
  path: string;
  replacement: string;
  description: string;
}

const DEPRECATED_FILES: DeprecatedFile[] = [
  {
    path: 'data/projects.json',
    replacement: 'readAllProjects() from @/lib/projects-utils',
    description: 'Projects are now stored hierarchically in data/projects/[year]/[month]/[day]/[projectId]/project.json'
  },
  {
    path: 'data/project-tasks.json', 
    replacement: 'readAllTasks() from @/lib/project-tasks/hierarchical-storage',
    description: 'Project tasks are now stored hierarchically in data/project-tasks/[year]/[month]/[day]/[projectId]/[taskId]task.json'
  },
  {
    path: 'data/gigs/gigs.json',
    replacement: 'readAllGigs() from @/lib/gigs/hierarchical-storage', 
    description: 'Gigs are now stored hierarchically in data/gigs/[year]/[month]/[day]/[gigId]/gig.json'
  },
  {
    path: 'data/invoices.json',
    replacement: 'getAllInvoices() from @/lib/invoice-storage',
    description: 'Invoices are now stored hierarchically in data/invoices/[year]/[month]/[day]/[projectId]/invoice.json'
  }
];

/**
 * Check if any deprecated flat files are being accessed
 */
export function checkForDeprecatedFileAccess(filePath: string): void {
  const deprecated = DEPRECATED_FILES.find(df => filePath.includes(df.path));
  
  if (deprecated) {
    console.error('🚨 DEPRECATED FILE ACCESS DETECTED 🚨');
    console.error(`❌ Attempting to access: ${deprecated.path}`);
    console.error(`✅ Use instead: ${deprecated.replacement}`);
    console.error(`📝 Info: ${deprecated.description}`);
    console.error('🔧 This access pattern should be updated to prevent future breakage.');
    console.error('📍 Stack trace:');
    console.trace();
  }
}

/**
 * Validate that hierarchical storage is working correctly
 */
export async function validateHierarchicalStorage(): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // Check if hierarchical directories exist
    const hierarchicalPaths = [
      'data/projects',
      'data/project-tasks', 
      'data/gigs',
      'data/invoices'
    ];
    
    for (const dirPath of hierarchicalPaths) {
      const fullPath = path.join(process.cwd(), dirPath);
      if (!fs.existsSync(fullPath)) {
        issues.push(`Missing hierarchical directory: ${dirPath}`);
        recommendations.push(`Create directory structure for ${dirPath}`);
      }
    }
    
    // Check if deprecated flat files exist (they shouldn't)
    for (const deprecated of DEPRECATED_FILES) {
      const fullPath = path.join(process.cwd(), deprecated.path);
      if (fs.existsSync(fullPath)) {
        issues.push(`Deprecated flat file still exists: ${deprecated.path}`);
        recommendations.push(`Remove ${deprecated.path} and ensure all APIs use ${deprecated.replacement}`);
      }
    }
    
    // Check if metadata index files exist
    const indexFiles = [
      'data/projects/metadata/projects-index.json',
      'data/gigs/gigs-index.json'
    ];
    
    for (const indexFile of indexFiles) {
      const fullPath = path.join(process.cwd(), indexFile);
      if (!fs.existsSync(fullPath)) {
        issues.push(`Missing index file: ${indexFile}`);
        recommendations.push(`Ensure ${indexFile} exists and is properly maintained`);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
    
  } catch (error) {
    issues.push(`Error validating storage: ${error}`);
    return { isValid: false, issues, recommendations };
  }
}

/**
 * Enhanced error handler for file operations
 */
export function handleFileOperationError(error: any, context: string): never {
  if (error.code === 'ENOENT') {
    const filePath = error.path || '';
    checkForDeprecatedFileAccess(filePath);
    
    console.error(`\n🔥 FILE NOT FOUND ERROR in ${context}`);
    console.error(`📁 Missing file: ${filePath}`);
    console.error('🔍 This might indicate:');
    console.error('   1. API is using deprecated flat file structure');
    console.error('   2. Hierarchical storage migration is incomplete');
    console.error('   3. Data corruption or accidental file deletion');
    console.error('\n💡 IMMEDIATE ACTIONS:');
    console.error('   1. Check if this API should use hierarchical storage functions');
    console.error('   2. Verify hierarchical data exists in proper directory structure');
    console.error('   3. Update API to use appropriate storage utility functions');
    console.error('');
  }
  
  throw error;
}

/**
 * Wrapper for fs.readFile that includes deprecation checking
 */
export async function safeReadFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
  checkForDeprecatedFileAccess(filePath);
  
  try {
    return await fs.promises.readFile(filePath, encoding);
  } catch (error) {
    handleFileOperationError(error, `safeReadFile(${filePath})`);
  }
}

/**
 * Run a comprehensive storage health check
 */
export async function runStorageHealthCheck(): Promise<void> {
  console.log('🔍 Running storage health check...');
  
  const validation = await validateHierarchicalStorage();
  
  if (validation.isValid) {
    console.log('✅ Storage structure is healthy');
  } else {
    console.error('⚠️  Storage issues detected:');
    validation.issues.forEach(issue => console.error(`   ❌ ${issue}`));
    
    console.log('\n💡 Recommendations:');
    validation.recommendations.forEach(rec => console.log(`   🔧 ${rec}`));
  }
}

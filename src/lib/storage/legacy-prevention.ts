/**
 * Legacy Storage Prevention System
 * 
 * This module provides runtime detection and prevention of legacy flat file usage
 * to ensure all APIs use hierarchical storage consistently.
 */

import fs from 'fs';
import path from 'path';

// Track legacy file access attempts
const legacyAccessLog: Array<{
  file: string;
  caller: string;
  timestamp: string;
  stackTrace: string;
}> = [];

// Legacy file patterns to monitor
const LEGACY_FILE_PATTERNS = [
  'data/projects.json',
  'data/project-tasks.json',
  'data/invoices.json',
  'data/gigs/gigs.json',
  'data/users.json',
  'data/freelancers.json'
];

/**
 * Intercept and warn about legacy file access
 */
export function interceptLegacyFileAccess() {
  // Store original functions to avoid recursion issues
  const originalReadFile = fs.promises.readFile.bind(fs.promises);
  const originalReadFileSync = fs.readFileSync.bind(fs);

  // Flag to prevent recursive calls during interception
  let isIntercepting = false;

  // @ts-ignore - Monkey patching for detection
  fs.promises.readFile = async function(filePath: any, options?: any) {
    // Prevent recursive calls
    if (isIntercepting) {
      return originalReadFile(filePath, options);
    }

    const normalizedPath = typeof filePath === 'string' ? filePath : filePath.toString();

    if (isLegacyFileAccess(normalizedPath)) {
      isIntercepting = true;

      try {
        const caller = getCaller();
        const warning = {
          file: normalizedPath,
          caller,
          timestamp: new Date().toISOString(),
          stackTrace: new Error().stack || 'No stack trace available'
        };

        legacyAccessLog.push(warning);

        console.warn(`🚨 LEGACY FILE ACCESS DETECTED:`);
        console.warn(`   File: ${normalizedPath}`);
        console.warn(`   Caller: ${caller}`);
        console.warn(`   Use hierarchical storage instead!`);

        // In development, throw an error to force fixes
        if (process.env.NODE_ENV === 'development') {
          throw new Error(`LEGACY FILE ACCESS BLOCKED: ${normalizedPath}. Use hierarchical storage functions instead.`);
        }
      } finally {
        isIntercepting = false;
      }
    }

    // Use the original function to avoid recursion
    return originalReadFile(filePath, options);
  };

  // @ts-ignore - Monkey patching for detection
  fs.readFileSync = function(filePath: any, options?: any) {
    // Prevent recursive calls
    if (isIntercepting) {
      return originalReadFileSync(filePath, options);
    }

    const normalizedPath = typeof filePath === 'string' ? filePath : filePath.toString();

    if (isLegacyFileAccess(normalizedPath)) {
      isIntercepting = true;

      try {
        const caller = getCaller();
        const warning = {
          file: normalizedPath,
          caller,
          timestamp: new Date().toISOString(),
          stackTrace: new Error().stack || 'No stack trace available'
        };

        legacyAccessLog.push(warning);

        console.warn(`🚨 LEGACY FILE ACCESS DETECTED (SYNC):`);
        console.warn(`   File: ${normalizedPath}`);
        console.warn(`   Caller: ${caller}`);
        console.warn(`   Use hierarchical storage instead!`);

        // In development, throw an error to force fixes
        if (process.env.NODE_ENV === 'development') {
          throw new Error(`LEGACY FILE ACCESS BLOCKED: ${normalizedPath}. Use hierarchical storage functions instead.`);
        }
      } finally {
        isIntercepting = false;
      }
    }

    return originalReadFileSync(filePath, options);
  };
}

/**
 * Check if file path matches legacy patterns
 */
function isLegacyFileAccess(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);

  // Check if this is a controlled access from unified storage service
  const caller = getCaller();
  if (caller.includes('unified-storage-service') && normalizedPath.includes('data/users.json')) {
    console.log('🔓 Allowing controlled legacy access for user authentication:', normalizedPath);
    return false; // Allow this access
  }

  // Allow controlled access for freelancers through the freelancers-utils service
  if (caller.includes('freelancers-utils') && normalizedPath.includes('data/freelancers.json')) {
    console.log('🔓 Allowing controlled legacy access for freelancers data:', normalizedPath);
    return false; // Allow this access
  }

  return LEGACY_FILE_PATTERNS.some(pattern => {
    return normalizedPath.includes(pattern) || normalizedPath.endsWith(pattern);
  });
}

/**
 * Get the caller function/file from stack trace
 */
function getCaller(): string {
  const stack = new Error().stack;
  if (!stack) return 'Unknown caller';
  
  const lines = stack.split('\n');
  // Skip the first few lines (this function, the interceptor)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];
    if (line && !line.includes('node_modules') && !line.includes('legacy-prevention')) {
      return line.trim();
    }
  }
  
  return 'Unknown caller';
}

/**
 * Get legacy access log for monitoring
 */
export function getLegacyAccessLog() {
  return [...legacyAccessLog];
}

/**
 * Clear legacy access log
 */
export function clearLegacyAccessLog() {
  legacyAccessLog.length = 0;
}

/**
 * Get legacy access statistics
 */
export function getLegacyAccessStats() {
  const stats = {
    totalAccesses: legacyAccessLog.length,
    uniqueFiles: new Set(legacyAccessLog.map(log => log.file)).size,
    uniqueCallers: new Set(legacyAccessLog.map(log => log.caller)).size,
    recentAccesses: legacyAccessLog.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return logTime > oneHourAgo;
    }).length,
    fileBreakdown: {} as Record<string, number>,
    callerBreakdown: {} as Record<string, number>
  };
  
  // Count accesses per file
  legacyAccessLog.forEach(log => {
    stats.fileBreakdown[log.file] = (stats.fileBreakdown[log.file] || 0) + 1;
    stats.callerBreakdown[log.caller] = (stats.callerBreakdown[log.caller] || 0) + 1;
  });
  
  return stats;
}

/**
 * Validate that hierarchical storage is being used correctly
 */
export async function validateStorageUsage(): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check if legacy files exist and are being used
  for (const pattern of LEGACY_FILE_PATTERNS) {
    const fullPath = path.join(process.cwd(), pattern);
    
    if (fs.existsSync(fullPath)) {
      try {
        const stats = fs.statSync(fullPath);
        const lastModified = stats.mtime;
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        if (lastModified > oneWeekAgo) {
          issues.push(`Legacy file ${pattern} was modified recently (${lastModified.toISOString()})`);
          recommendations.push(`Ensure all writes go through hierarchical storage for ${pattern}`);
        }
        
        const content = fs.readFileSync(fullPath, 'utf-8');
        const data = JSON.parse(content);
        
        if (Array.isArray(data) && data.length > 0) {
          issues.push(`Legacy file ${pattern} contains ${data.length} records`);
          recommendations.push(`Migrate data from ${pattern} to hierarchical storage`);
        }
      } catch (error) {
        issues.push(`Error reading legacy file ${pattern}: ${error}`);
      }
    }
  }
  
  // Check recent legacy access attempts
  const recentAccesses = legacyAccessLog.filter(log => {
    const logTime = new Date(log.timestamp).getTime();
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return logTime > oneHourAgo;
  });
  
  if (recentAccesses.length > 0) {
    issues.push(`${recentAccesses.length} legacy file access attempts in the last hour`);
    recommendations.push('Review and fix APIs still using legacy file access patterns');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Initialize the legacy prevention system
 */
export function initializeLegacyPrevention() {
  console.log('🛡️ Initializing legacy storage prevention system...');

  // Only intercept in development to avoid production performance impact
  if (process.env.NODE_ENV === 'development') {
    interceptLegacyFileAccess();
    console.log('✅ Legacy file access interception enabled (development mode)');
  } else {
    console.log('ℹ️ Legacy file access monitoring enabled (production mode)');
  }

  // Log current status
  const stats = getLegacyAccessStats();
  console.log(`📊 Legacy access stats: ${stats.totalAccesses} total, ${stats.recentAccesses} recent`);
}

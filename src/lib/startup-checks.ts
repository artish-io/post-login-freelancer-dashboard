/**
 * Startup Checks for ARTISH Application
 * 
 * This module runs critical checks when the application starts to ensure
 * the data storage structure is healthy and prevent recurring issues.
 */

import { runStorageHealthCheck, validateHierarchicalStorage } from './storage-migration-guard';

/**
 * Run all startup checks
 */
export async function runStartupChecks(): Promise<void> {
  console.log('🚀 Running ARTISH startup checks...');
  
  try {
    // Check storage structure health
    await runStorageHealthCheck();
    
    // Validate hierarchical storage
    const validation = await validateHierarchicalStorage();
    
    if (!validation.isValid) {
      console.error('⚠️  CRITICAL: Storage validation failed during startup');
      console.error('🔧 This may cause application instability');
      
      // Log specific issues for debugging
      validation.issues.forEach(issue => {
        console.error(`   ❌ ${issue}`);
      });
      
      console.log('\n💡 Recommended actions:');
      validation.recommendations.forEach(rec => {
        console.log(`   🔧 ${rec}`);
      });
      
      // Don't fail startup, but warn heavily
      console.error('\n⚠️  APPLICATION STARTING WITH STORAGE ISSUES - MONITOR CLOSELY');
    } else {
      console.log('✅ Storage structure validation passed');
    }
    
    console.log('✅ Startup checks completed successfully');
    
  } catch (error) {
    console.error('❌ Startup checks failed:', error);
    console.error('⚠️  Application may be unstable');
  }
}

/**
 * Quick health check that can be called from API routes
 */
export async function quickHealthCheck(): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  try {
    const validation = await validateHierarchicalStorage();
    return {
      healthy: validation.isValid,
      issues: validation.issues
    };
  } catch (error) {
    return {
      healthy: false,
      issues: [`Health check failed: ${error}`]
    };
  }
}

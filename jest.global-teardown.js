/**
 * Jest Global Teardown - Runs once after all tests
 * 
 * Cleans up test environment and validates no repository corruption
 */

const { execSync } = require('child_process');
const { promises: fs } = require('fs');

module.exports = async () => {
  console.log('🧹 Starting Jest global teardown...');
  
  // Clean up test data directory
  if (process.env.DATA_ROOT) {
    try {
      await fs.rm(process.env.DATA_ROOT, { recursive: true, force: true });
      console.log(`🗑️  Cleaned up test data directory: ${process.env.DATA_ROOT}`);
    } catch (error) {
      console.warn('⚠️  Warning: Failed to clean up test data directory:', error);
    }
  }
  
  // Final git diff check
  try {
    const gitDiff = execSync('git diff --name-only', { 
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
    
    if (gitDiff) {
      console.error('❌ CRITICAL: Tests modified tracked files!');
      console.error('   Modified files:', gitDiff);
      
      // Show the actual diff for debugging
      try {
        const diffOutput = execSync('git diff', { 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        console.error('   Diff output:');
        console.error(diffOutput);
      } catch (diffError) {
        console.error('   Could not show diff:', diffError.message);
      }
      
      throw new Error('Test suite corrupted repository files!');
    } else {
      console.log('✅ Repository integrity verified - no tracked files modified');
    }
  } catch (error) {
    if (error.message.includes('not a git repository')) {
      console.log('ℹ️  Not in git repository - skipping integrity check');
    } else {
      throw error;
    }
  }
  
  console.log('✅ Jest global teardown complete');
};

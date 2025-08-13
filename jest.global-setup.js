/**
 * Jest Global Setup - Runs once before all tests
 * 
 * Validates test environment and sets up global safety measures
 */

const { execSync } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Starting Jest global setup...');
  
  // Validate we're in a safe environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must run with NODE_ENV=test');
  }
  
  // Ensure we have a test data root
  if (!process.env.DATA_ROOT) {
    // Set up DATA_ROOT if not already set
    const path = require('path');
    const { tmpdir } = require('os');
    const testRunId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    process.env.DATA_ROOT = path.join(tmpdir(), `artish-test-${testRunId}`);
  }
  
  // Validate git repository state (if in git repo)
  try {
    const gitStatus = execSync('git status --porcelain', { 
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
    
    if (gitStatus) {
      console.warn('⚠️  Warning: Repository has uncommitted changes before tests');
      console.warn('   This may interfere with git diff guards');
    }
  } catch (error) {
    // Not in git repo or git not available - that's fine
  }
  
  // Create test data directory
  try {
    await fs.mkdir(process.env.DATA_ROOT, { recursive: true });
    console.log(`📁 Created test data directory: ${process.env.DATA_ROOT}`);
  } catch (error) {
    console.error('❌ Failed to create test data directory:', error);
    throw error;
  }
  
  // Validate file system permissions
  try {
    const testFile = path.join(process.env.DATA_ROOT, 'test-write.tmp');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    console.log('✅ File system write permissions validated');
  } catch (error) {
    console.error('❌ File system write test failed:', error);
    throw error;
  }
  
  console.log('✅ Jest global setup complete');
};

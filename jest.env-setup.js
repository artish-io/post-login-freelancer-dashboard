/**
 * Jest Environment Setup - Runs before tests
 * 
 * Sets up environment variables for test sandboxing
 */

const path = require('path');
const { tmpdir } = require('os');

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_BYPASS_AUTH = '1';

// Create unique test data root for this test run
const testRunId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
process.env.DATA_ROOT = path.join(tmpdir(), `artish-test-${testRunId}`);

// Disable external services in tests
process.env.DISABLE_EXTERNAL_SERVICES = '1';

// Enable debug logging for storage operations
process.env.DEBUG_STORAGE = '1';

// Ensure we're not accidentally using production data
if (process.cwd().includes('/data') || process.cwd().includes('\\data')) {
  throw new Error('Tests cannot run from data directory!');
}

console.log(`🔒 Test sandbox initialized: ${process.env.DATA_ROOT}`);

/**
 * Jest Setup - Runs after environment setup
 * 
 * Configures test environment and safety measures
 */

const { execSync } = require('child_process');
const path = require('path');

// Track original git state
let originalGitState = null;

// Capture initial git state
beforeAll(() => {
  try {
    originalGitState = execSync('git status --porcelain', { 
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
  } catch (error) {
    // Not in a git repository or git not available
    originalGitState = null;
  }
});

// Verify no tracked files were modified after all tests
afterAll(() => {
  if (originalGitState !== null) {
    try {
      const currentGitState = execSync('git status --porcelain', { 
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();
      
      if (currentGitState !== originalGitState) {
        const diff = execSync('git diff --name-only', { 
          encoding: 'utf8',
          stdio: 'pipe'
        }).trim();
        
        throw new Error(
          `Tests modified tracked files! This indicates a test sandbox failure.\n` +
          `Modified files: ${diff}\n` +
          `Original state: "${originalGitState}"\n` +
          `Current state: "${currentGitState}"`
        );
      }
    } catch (error) {
      if (!error.message.includes('not a git repository')) {
        throw error;
      }
    }
  }
});

// Clear module cache after each test to prevent cross-test pollution
afterEach(() => {
  // Clear require cache for our modules
  Object.keys(require.cache).forEach(key => {
    if (key.includes('/src/') || key.includes('\\src\\')) {
      delete require.cache[key];
    }
  });
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in tests, but log the error
});

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests (but preserve errors)
const originalConsole = { ...console };

beforeEach(() => {
  // Only suppress logs in non-verbose mode
  if (!process.env.JEST_VERBOSE) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    // Keep console.error for debugging
  }
});

afterEach(() => {
  if (!process.env.JEST_VERBOSE) {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
  }
});

// Ensure test environment is properly isolated
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Tests must run with NODE_ENV=test');
}

console.log('🧪 Jest setup complete - test environment isolated and protected');

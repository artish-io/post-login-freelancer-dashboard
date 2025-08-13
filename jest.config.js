/**
 * Jest Configuration for Artish Web
 * 
 * Configured for safe testing with:
 * - Test sandboxing to prevent repository corruption
 * - Proper module transformation for Next.js
 * - Deterministic test execution
 * - Git diff guards
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Test environment
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration for Next.js SWC
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['next/dist/build/swc/jest-transformer', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.(ts|tsx|js|jsx)',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
  ],
  
  // Test timeout (increased for write-heavy tests)
  testTimeout: 30000,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Fail fast on first error in CI
  bail: process.env.CI ? 1 : 0,
  
  // Run tests serially for write-heavy tests (prevents race conditions)
  maxWorkers: process.env.CI ? 1 : '50%',
  
  // Environment variables for test sandboxing
  setupFiles: ['<rootDir>/jest.env-setup.js'],
};

// Export Jest config
module.exports = createJestConfig(customJestConfig);

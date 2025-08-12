/**
 * Test Setup Configuration
 * 
 * Global test setup for Jest tests including environment configuration
 * and authentication bypass for API testing.
 */

// Enable test authentication bypass
process.env.TEST_BYPASS_AUTH = '1';
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.warn = (...args: any[]) => {
  // Only show warnings that are not related to test setup
  const message = args.join(' ');
  if (!message.includes('deprecated') && !message.includes('test')) {
    originalConsoleWarn(...args);
  }
};

console.error = (...args: any[]) => {
  // Only show errors that are not related to test setup
  const message = args.join(' ');
  if (!message.includes('test') && !message.includes('mock')) {
    originalConsoleError(...args);
  }
};

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidApiResponse(): R;
      toHaveHierarchicalPath(): R;
    }
  }
}

// Custom Jest matchers for API testing
expect.extend({
  toBeValidApiResponse(received: any) {
    const pass = received && 
                 typeof received === 'object' && 
                 typeof received.success === 'boolean' &&
                 typeof received.message === 'string';
    
    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to be a valid API response with success and message fields`,
        pass: false,
      };
    }
  },

  toHaveHierarchicalPath(received: any, expectedPattern: string) {
    const pass = received && 
                 typeof received === 'string' &&
                 received.match(expectedPattern);
    
    if (pass) {
      return {
        message: () => `Expected ${received} not to match hierarchical pattern ${expectedPattern}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to match hierarchical pattern ${expectedPattern}`,
        pass: false,
      };
    }
  }
});

export {};

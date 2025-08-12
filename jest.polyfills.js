// jest.polyfills.js
/**
 * @note The block below contains polyfills for Node.js globals
 * required for Jest to function when running JSDOM tests.
 */

const { TextDecoder, TextEncoder } = require('util')

Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
})

// Smart fetch mock for testing
// Only use real fetch for specific comprehensive API tests
const isComprehensiveApiTest = process.env.NODE_ENV === 'test' &&
  process.argv.some(arg => arg.includes('milestone-invoicing-comprehensive'));

if (isComprehensiveApiTest) {
  // Use real fetch for comprehensive API testing
  console.log('🧪 Using real fetch for comprehensive API testing');

  // Simple approach: just don't mock fetch, let Node.js built-in fetch work
  // If fetch is not available, we'll handle it in the test itself
  console.log('🔧 Fetch availability:', typeof globalThis.fetch !== 'undefined' ? 'Available' : 'Not available');
} else {
  // Use mock fetch for all other tests (safer default)
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  )
}

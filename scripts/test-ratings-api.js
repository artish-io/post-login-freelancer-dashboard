#!/usr/bin/env node

/**
 * Test Ratings API Script
 * 
 * This script tests the ratings API endpoints directly
 * to see if they're working correctly.
 */

const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 31;
const TEST_USER_TYPE = 'freelancer';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRatingsAPI() {
  log('🧪 Testing Ratings API Endpoints', 'blue');
  
  try {
    // Test 1: Check if the API endpoint exists
    log('\n📋 Test 1: API Endpoint Availability', 'yellow');
    
    const testUrl = `${BASE_URL}/api/ratings/user?userId=${TEST_USER_ID}&userType=${TEST_USER_TYPE}`;
    log(`Testing URL: ${testUrl}`, 'blue');
    
    const response = await fetch(testUrl);
    
    log(`Response Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
    log(`Response Status Text: ${response.statusText}`, response.status === 200 ? 'green' : 'red');
    
    if (response.status === 404) {
      log('❌ API endpoint not found (404)', 'red');
      log('This suggests the route file is not being loaded correctly', 'yellow');
      return false;
    }
    
    if (response.status === 401) {
      log('🔒 API requires authentication (401)', 'yellow');
      log('This is expected - the API requires a valid session', 'blue');
      return true; // This is actually good - means the endpoint exists
    }
    
    const data = await response.json();
    log('Response Data:', 'blue');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      log('✅ API endpoint is working correctly', 'green');
      return true;
    }
    
    return false;
    
  } catch (error) {
    log(`❌ Error testing API: ${error.message}`, 'red');
    
    if (error.code === 'ECONNREFUSED') {
      log('💡 Make sure the Next.js development server is running on port 3000', 'yellow');
      log('Run: npm run dev', 'blue');
    }
    
    return false;
  }
}

async function testOtherEndpoints() {
  log('\n📋 Test 2: Other Rating Endpoints', 'yellow');
  
  const endpoints = [
    '/api/ratings/submit',
    '/api/ratings/exists'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      const response = await fetch(url, { method: 'GET' });
      
      log(`${endpoint}: ${response.status} ${response.statusText}`, 
          response.status === 404 ? 'red' : 'green');
      
    } catch (error) {
      log(`${endpoint}: Error - ${error.message}`, 'red');
    }
  }
}

async function checkServerStatus() {
  log('\n📋 Test 3: Server Status', 'yellow');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/session`);
    log(`Server Status: ${response.status} ${response.statusText}`, 
        response.status < 400 ? 'green' : 'red');
    
    if (response.status < 400) {
      log('✅ Next.js server is running', 'green');
      return true;
    }
    
  } catch (error) {
    log(`❌ Server not reachable: ${error.message}`, 'red');
    
    if (error.code === 'ECONNREFUSED') {
      log('💡 Start the development server with: npm run dev', 'yellow');
    }
    
    return false;
  }
}

async function runTests() {
  log('🧪 Starting Ratings API Test Suite', 'blue');
  
  // Test server status first
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    log('\n❌ Cannot proceed - server is not running', 'red');
    process.exit(1);
  }
  
  // Test main ratings API
  const apiWorking = await testRatingsAPI();
  
  // Test other endpoints
  await testOtherEndpoints();
  
  // Summary
  log('\n📊 Test Summary', 'blue');
  
  if (apiWorking) {
    log('✅ Ratings API endpoints are accessible', 'green');
    log('💡 The 401 authentication error is expected for unauthenticated requests', 'blue');
    log('🔧 Test the API from the browser while logged in to see real results', 'yellow');
  } else {
    log('❌ Ratings API endpoints have issues', 'red');
    log('🔍 Check the Next.js server logs for more details', 'yellow');
  }
  
  process.exit(0);
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { testRatingsAPI, checkServerStatus };

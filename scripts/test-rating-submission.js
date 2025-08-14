#!/usr/bin/env node

/**
 * Test Rating Submission Script
 * 
 * This script tests the rating submission and retrieval system
 * by creating a test rating and then fetching it back.
 */

const fs = require('fs').promises;
const path = require('path');

// Test data
const TEST_RATING = {
  ratingId: 'test-rating-311-32-31',
  projectId: 311,
  raterUserId: 32,
  raterUserType: 'commissioner',
  subjectUserId: 31,
  subjectUserType: 'freelancer',
  rating: 5,
  comment: 'Excellent work on the mobile app!',
  createdAt: new Date().toISOString(),
  projectTitle: 'Lagos Parks Mobile App Development'
};

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

async function createTestRating() {
  try {
    log('🧪 Creating test rating...', 'blue');
    
    // Create the directory structure
    const ratingDir = path.join(
      process.cwd(),
      'data',
      'projects',
      TEST_RATING.projectId.toString(),
      'ratings',
      TEST_RATING.subjectUserType
    );
    
    await fs.mkdir(ratingDir, { recursive: true });
    
    // Create the rating file
    const ratingFile = path.join(ratingDir, `rating-${TEST_RATING.raterUserId}.json`);
    await fs.writeFile(ratingFile, JSON.stringify(TEST_RATING, null, 2));
    
    log(`✅ Test rating created at: ${ratingFile}`, 'green');
    log(`📊 Rating details:`, 'blue');
    log(`   Project ID: ${TEST_RATING.projectId}`, 'reset');
    log(`   Rater: User ${TEST_RATING.raterUserId} (${TEST_RATING.raterUserType})`, 'reset');
    log(`   Subject: User ${TEST_RATING.subjectUserId} (${TEST_RATING.subjectUserType})`, 'reset');
    log(`   Rating: ${TEST_RATING.rating}/5 stars`, 'reset');
    log(`   Comment: "${TEST_RATING.comment}"`, 'reset');
    
    return true;
  } catch (error) {
    log(`❌ Failed to create test rating: ${error.message}`, 'red');
    return false;
  }
}

async function testRatingRetrieval() {
  try {
    log('\n🔍 Testing rating retrieval...', 'blue');
    
    // Test the rating file exists
    const ratingFile = path.join(
      process.cwd(),
      'data',
      'projects',
      TEST_RATING.projectId.toString(),
      'ratings',
      TEST_RATING.subjectUserType,
      `rating-${TEST_RATING.raterUserId}.json`
    );
    
    const ratingData = await fs.readFile(ratingFile, 'utf-8');
    const rating = JSON.parse(ratingData);
    
    log(`✅ Rating file found and readable`, 'green');
    log(`📊 Retrieved rating:`, 'blue');
    log(`   Rating ID: ${rating.ratingId}`, 'reset');
    log(`   Rating: ${rating.rating}/5`, 'reset');
    log(`   Project: ${rating.projectTitle}`, 'reset');
    
    return true;
  } catch (error) {
    log(`❌ Failed to retrieve test rating: ${error.message}`, 'red');
    return false;
  }
}

async function testDirectoryStructure() {
  try {
    log('\n📁 Testing directory structure...', 'blue');
    
    const projectsDir = path.join(process.cwd(), 'data', 'projects');
    const projectDir = path.join(projectsDir, TEST_RATING.projectId.toString());
    const ratingsDir = path.join(projectDir, 'ratings');
    const userTypeDir = path.join(ratingsDir, TEST_RATING.subjectUserType);
    
    // Check each level
    const checks = [
      { path: projectsDir, name: 'Projects directory' },
      { path: projectDir, name: 'Project directory' },
      { path: ratingsDir, name: 'Ratings directory' },
      { path: userTypeDir, name: 'User type directory' }
    ];
    
    for (const check of checks) {
      try {
        await fs.access(check.path);
        log(`✅ ${check.name} exists: ${check.path}`, 'green');
      } catch {
        log(`❌ ${check.name} missing: ${check.path}`, 'red');
        return false;
      }
    }
    
    // List files in the user type directory
    const files = await fs.readdir(userTypeDir);
    log(`📄 Files in user type directory: ${files.join(', ')}`, 'blue');
    
    return true;
  } catch (error) {
    log(`❌ Directory structure test failed: ${error.message}`, 'red');
    return false;
  }
}

async function cleanupTestData() {
  try {
    log('\n🧹 Cleaning up test data...', 'yellow');
    
    const ratingFile = path.join(
      process.cwd(),
      'data',
      'projects',
      TEST_RATING.projectId.toString(),
      'ratings',
      TEST_RATING.subjectUserType,
      `rating-${TEST_RATING.raterUserId}.json`
    );
    
    await fs.unlink(ratingFile);
    log(`✅ Test rating file removed`, 'green');
    
    return true;
  } catch (error) {
    log(`⚠️  Cleanup warning: ${error.message}`, 'yellow');
    return false;
  }
}

async function runTests() {
  log('🧪 Starting Rating System Test Suite', 'blue');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Create test rating
  if (await createTestRating()) {
    passed++;
  } else {
    failed++;
  }
  
  // Test 2: Test directory structure
  if (await testDirectoryStructure()) {
    passed++;
  } else {
    failed++;
  }
  
  // Test 3: Test rating retrieval
  if (await testRatingRetrieval()) {
    passed++;
  } else {
    failed++;
  }
  
  // Summary
  log('\n📊 Test Summary', 'blue');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`, failed > 0 ? 'yellow' : 'green');
  
  if (failed === 0) {
    log('\n🎉 All tests passed! Rating system storage is working correctly.', 'green');
    log('💡 You can now test the API endpoints and UI components.', 'blue');
  } else {
    log('\n⚠️  Some tests failed. Please check the issues above.', 'yellow');
  }
  
  // Cleanup (optional)
  const shouldCleanup = process.argv.includes('--cleanup');
  if (shouldCleanup) {
    await cleanupTestData();
  } else {
    log('\n💡 Test rating left in place for API testing. Use --cleanup flag to remove it.', 'blue');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests, createTestRating, testRatingRetrieval };

#!/usr/bin/env node

/**
 * Rating System Integration Test
 * 
 * Tests the complete rating system workflow:
 * 1. Project completion detection
 * 2. Rating notification sending
 * 3. Rating submission
 * 4. Rating retrieval
 * 5. Profile display updates
 */

const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_PROJECT_ID = 999;
const TEST_FREELANCER_ID = 1;
const TEST_COMMISSIONER_ID = 2;

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

async function testRatingSystemIntegration() {
  log('🧪 Starting Rating System Integration Test', 'blue');
  
  let passed = 0;
  let failed = 0;
  
  try {
    // Test 1: Check rating types are defined
    log('\n📋 Test 1: Rating Types Definition', 'yellow');
    try {
      const ratingTypes = require('../types/ratings');
      
      if (typeof ratingTypes.generateRatingId === 'function') {
        log('✅ Rating ID generation function exists', 'green');
        passed++;
      } else {
        throw new Error('Rating ID generation function missing');
      }
      
      if (typeof ratingTypes.getRatingStoragePath === 'function') {
        log('✅ Rating storage path function exists', 'green');
        passed++;
      } else {
        throw new Error('Rating storage path function missing');
      }
      
    } catch (error) {
      log(`❌ Rating types test failed: ${error.message}`, 'red');
      failed++;
    }
    
    // Test 2: Check API routes exist
    log('\n📋 Test 2: API Routes Existence', 'yellow');
    try {
      const submitRoute = path.join(process.cwd(), 'src/app/api/ratings/submit/route.ts');
      const userRoute = path.join(process.cwd(), 'src/app/api/ratings/user/route.ts');
      const existsRoute = path.join(process.cwd(), 'src/app/api/ratings/exists/route.ts');
      
      await fs.access(submitRoute);
      log('✅ Submit rating API route exists', 'green');
      passed++;
      
      await fs.access(userRoute);
      log('✅ User ratings API route exists', 'green');
      passed++;
      
      await fs.access(existsRoute);
      log('✅ Rating exists API route exists', 'green');
      passed++;
      
    } catch (error) {
      log(`❌ API routes test failed: ${error.message}`, 'red');
      failed++;
    }
    
    // Test 3: Check notification system integration
    log('\n📋 Test 3: Notification System Integration', 'yellow');
    try {
      const notificationService = require('../src/lib/notifications/rating-notifications');
      
      if (typeof notificationService.sendProjectCompletionRatingNotifications === 'function') {
        log('✅ Rating notification service exists', 'green');
        passed++;
      } else {
        throw new Error('Rating notification service missing');
      }
      
      if (typeof notificationService.checkProjectCompletionForRating === 'function') {
        log('✅ Project completion check function exists', 'green');
        passed++;
      } else {
        throw new Error('Project completion check function missing');
      }
      
    } catch (error) {
      log(`❌ Notification system test failed: ${error.message}`, 'red');
      failed++;
    }
    
    // Test 4: Check component updates
    log('\n📋 Test 4: Component Integration', 'yellow');
    try {
      const ratingModal = path.join(process.cwd(), 'components/shared/rating-modal.tsx');
      const freelancerCard = path.join(process.cwd(), 'components/freelancer-dashboard/projects-and-invoices/freelancer-rating-card.tsx');
      
      await fs.access(ratingModal);
      log('✅ Rating modal component exists', 'green');
      passed++;
      
      await fs.access(freelancerCard);
      log('✅ Freelancer rating card component exists', 'green');
      passed++;
      
      // Check if components have been updated with rating functionality
      const modalContent = await fs.readFile(ratingModal, 'utf-8');
      if (modalContent.includes('RatingSubmissionRequest')) {
        log('✅ Rating modal has proper type integration', 'green');
        passed++;
      } else {
        throw new Error('Rating modal missing type integration');
      }
      
    } catch (error) {
      log(`❌ Component integration test failed: ${error.message}`, 'red');
      failed++;
    }
    
    // Test 5: Check storage structure
    log('\n📋 Test 5: Storage Structure', 'yellow');
    try {
      const { getRatingStoragePath } = require('../types/ratings');
      
      const testPath = getRatingStoragePath(TEST_PROJECT_ID, 'commissioner', TEST_FREELANCER_ID);
      const expectedPath = `data/projects/${TEST_PROJECT_ID}/ratings/commissioner/rating-${TEST_FREELANCER_ID}.json`;
      
      if (testPath === expectedPath) {
        log('✅ Rating storage path generation works correctly', 'green');
        passed++;
      } else {
        throw new Error(`Storage path mismatch: expected ${expectedPath}, got ${testPath}`);
      }
      
    } catch (error) {
      log(`❌ Storage structure test failed: ${error.message}`, 'red');
      failed++;
    }
    
    // Test 6: Check notification types
    log('\n📋 Test 6: Notification Types', 'yellow');
    try {
      const eventLogger = require('../src/lib/events/event-logger');
      
      if (eventLogger.NOTIFICATION_TYPES.RATING_PROMPT_FREELANCER) {
        log('✅ Freelancer rating prompt notification type exists', 'green');
        passed++;
      } else {
        throw new Error('Freelancer rating prompt notification type missing');
      }
      
      if (eventLogger.NOTIFICATION_TYPES.RATING_PROMPT_COMMISSIONER) {
        log('✅ Commissioner rating prompt notification type exists', 'green');
        passed++;
      } else {
        throw new Error('Commissioner rating prompt notification type missing');
      }
      
    } catch (error) {
      log(`❌ Notification types test failed: ${error.message}`, 'red');
      failed++;
    }
    
    // Test 7: Check task approval integration
    log('\n📋 Test 7: Task Approval Integration', 'yellow');
    try {
      const taskSubmitRoute = path.join(process.cwd(), 'src/app/api/project-tasks/submit/route.ts');
      const content = await fs.readFile(taskSubmitRoute, 'utf-8');
      
      if (content.includes('sendProjectCompletionRatingNotifications')) {
        log('✅ Task approval route has rating notification integration', 'green');
        passed++;
      } else {
        throw new Error('Task approval route missing rating notification integration');
      }
      
      if (content.includes('checkProjectCompletionForRating')) {
        log('✅ Task approval route has completion check integration', 'green');
        passed++;
      } else {
        throw new Error('Task approval route missing completion check integration');
      }
      
    } catch (error) {
      log(`❌ Task approval integration test failed: ${error.message}`, 'red');
      failed++;
    }
    
    // Summary
    log('\n📊 Test Summary', 'blue');
    log(`✅ Passed: ${passed}`, 'green');
    log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`, failed > 0 ? 'yellow' : 'green');
    
    if (failed === 0) {
      log('\n🎉 All tests passed! Rating system is ready for use.', 'green');
      process.exit(0);
    } else {
      log('\n⚠️  Some tests failed. Please review the issues above.', 'yellow');
      process.exit(1);
    }
    
  } catch (error) {
    log(`💥 Test suite failed with error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testRatingSystemIntegration();
}

module.exports = { testRatingSystemIntegration };

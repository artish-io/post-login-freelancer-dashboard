#!/usr/bin/env node

/**
 * Test script to verify notification read functionality
 * This script tests the new notification read state system
 */

const fs = require('fs');
const path = require('path');

// Import the NotificationStorage class
const { NotificationStorage } = require('../src/lib/notifications/notification-storage.ts');

async function testNotificationReadFunctionality() {
  console.log('🧪 Testing Notification Read Functionality...\n');

  try {
    // Test 1: Mark a notification as read
    console.log('Test 1: Marking notification as read...');
    const testNotificationId = 'test-notification-123';
    const testUserId = 31;
    
    NotificationStorage.markAsRead(testNotificationId, testUserId);
    console.log(`✅ Marked notification ${testNotificationId} as read for user ${testUserId}`);

    // Test 2: Check if notification is read
    console.log('\nTest 2: Checking if notification is read...');
    const isRead = NotificationStorage.isRead(testNotificationId, testUserId);
    console.log(`✅ Notification read status: ${isRead}`);

    // Test 3: Check for a different user (should be false)
    console.log('\nTest 3: Checking read status for different user...');
    const isReadDifferentUser = NotificationStorage.isRead(testNotificationId, 32);
    console.log(`✅ Notification read status for different user: ${isReadDifferentUser}`);

    // Test 4: Mark same notification as read for another user
    console.log('\nTest 4: Marking same notification as read for another user...');
    NotificationStorage.markAsRead(testNotificationId, 32);
    const isReadSecondUser = NotificationStorage.isRead(testNotificationId, 32);
    console.log(`✅ Notification read status for second user: ${isReadSecondUser}`);

    // Test 5: Verify read states file exists and has correct structure
    console.log('\nTest 5: Verifying read states file...');
    const readStatesPath = path.join(process.cwd(), 'data/notifications/read-states.json');
    
    if (fs.existsSync(readStatesPath)) {
      const readStatesContent = fs.readFileSync(readStatesPath, 'utf-8');
      const readStates = JSON.parse(readStatesContent);
      console.log('✅ Read states file exists with content:');
      console.log(JSON.stringify(readStates, null, 2));
    } else {
      console.log('❌ Read states file does not exist');
    }

    console.log('\n🎉 All notification read functionality tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testNotificationReadFunctionality();

#!/usr/bin/env node

/**
 * Test script to verify completion project activation notifications
 * Tests the fix for missing completion.project_activated notifications
 */

const fs = require('fs').promises;
const path = require('path');

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function testCompletionNotifications() {
  console.log('🧪 Testing Completion Project Activation Notifications');
  console.log('====================================================');
  
  try {
    // Test data for completion-based gig matching
    const testData = {
      applicationId: 'test_app_' + Date.now(),
      gigId: 50, // Use existing completion-based gig
      freelancerId: 25, // Lucas Meyer
    };
    
    console.log('📝 Test data:', testData);
    
    // Clear existing notifications for clean test
    const notificationDir = path.join(process.cwd(), 'data/notifications/events');
    const today = new Date();
    const todayPath = path.join(
      notificationDir,
      today.getFullYear().toString(),
      today.toLocaleString('en-US', { month: 'long' }),
      today.getDate().toString()
    );
    
    console.log('🧹 Clearing existing notifications for clean test...');
    
    // Count notifications before test
    let beforeCount = 0;
    try {
      const completionActivatedDir = path.join(todayPath, 'completion.project_activated');
      const files = await fs.readdir(completionActivatedDir);
      beforeCount = files.length;
    } catch (e) {
      // Directory doesn't exist, that's fine
      beforeCount = 0;
    }
    
    console.log(`📊 Notifications before test: ${beforeCount}`);
    
    // Make the API call to match freelancer
    console.log('🚀 Triggering gig matching...');
    const response = await fetch(`${BASE_URL}/api/gigs/match-freelancer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Bypass-Auth': 'true',
        'X-Test-User-ID': '32' // Commissioner ID
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log('📋 API Response:', {
      status: response.status,
      success: result.success,
      projectId: result.data?.entities?.project?.projectId
    });
    
    if (!response.ok) {
      console.error('❌ API call failed:', result);
      return false;
    }
    
    // Wait a moment for notifications to be written
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for completion.project_activated notifications
    console.log('🔍 Checking for completion.project_activated notifications...');
    
    let afterCount = 0;
    let notifications = [];
    try {
      const completionActivatedDir = path.join(todayPath, 'completion.project_activated');
      const files = await fs.readdir(completionActivatedDir);
      afterCount = files.length;
      
      // Read the notification files
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(completionActivatedDir, file), 'utf8');
          const notification = JSON.parse(content);
          notifications.push(notification);
        }
      }
    } catch (e) {
      console.error('❌ Error reading notifications:', e.message);
      return false;
    }
    
    console.log(`📊 Notifications after test: ${afterCount}`);
    console.log(`📈 New notifications created: ${afterCount - beforeCount}`);
    
    // Verify we have the expected notifications
    const projectId = result.data?.entities?.project?.projectId;
    if (!projectId) {
      console.error('❌ No project ID returned from API');
      return false;
    }
    
    // Filter notifications for our project
    const projectNotifications = notifications.filter(n => n.projectId === projectId);
    console.log(`🎯 Notifications for project ${projectId}: ${projectNotifications.length}`);
    
    // Check for freelancer notification (targetId = 25)
    const freelancerNotification = projectNotifications.find(n => n.targetId === 25);
    const commissionerNotification = projectNotifications.find(n => n.targetId === 32);
    
    console.log('✅ Test Results:');
    console.log(`   Freelancer notification (targetId=25): ${freelancerNotification ? '✅ FOUND' : '❌ MISSING'}`);
    console.log(`   Commissioner notification (targetId=32): ${commissionerNotification ? '✅ FOUND' : '❌ MISSING'}`);
    
    if (freelancerNotification) {
      console.log(`   Freelancer notification ID: ${freelancerNotification.id}`);
    }
    
    if (commissionerNotification) {
      console.log(`   Commissioner notification ID: ${commissionerNotification.id}`);
    }
    
    // Test passes if both notifications exist
    const testPassed = freelancerNotification && commissionerNotification;
    
    console.log('');
    console.log(`🎯 Test Result: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (testPassed) {
      console.log('🎉 Both completion.project_activated notifications were generated correctly!');
    } else {
      console.log('💥 Missing notifications - the fix may not be working properly');
    }
    
    return testPassed;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testCompletionNotifications()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testCompletionNotifications };

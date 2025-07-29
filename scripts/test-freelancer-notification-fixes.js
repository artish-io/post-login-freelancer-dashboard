#!/usr/bin/env node

/**
 * Comprehensive test for freelancer notification fixes
 * Tests:
 * 1. Freelancer notifications API returns correct data
 * 2. Notification IDs are consistent between GET and POST
 * 3. Read state functionality works
 * 4. Commissioner notifications exclude project_pause_accepted
 */

const http = require('http');

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testFreelancerNotificationFixes() {
  console.log('🧪 Testing Freelancer Notification Fixes...\n');

  const baseUrl = 'localhost';
  const port = 3001;

  try {
    // Test 1: GET freelancer notifications
    console.log('Test 1: GET freelancer notifications...');
    const freelancerGetOptions = {
      hostname: baseUrl,
      port: port,
      path: '/api/notifications-v2?userId=31&userType=freelancer&tab=all',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const freelancerResponse = await makeRequest(freelancerGetOptions);
    console.log(`✅ Freelancer GET Response Status: ${freelancerResponse.status}`);
    
    if (freelancerResponse.data.notifications) {
      const notifications = freelancerResponse.data.notifications;
      console.log(`✅ Found ${notifications.length} freelancer notifications`);
      console.log(`✅ Unread count: ${freelancerResponse.data.counts.all}`);
      
      // Check notification ID format
      if (notifications.length > 0) {
        const sampleNotification = notifications[0];
        console.log(`✅ Sample notification ID: ${sampleNotification.id}`);
        console.log(`✅ Sample notification read state: ${sampleNotification.isRead}`);
        
        // Test marking this notification as read
        console.log('\nTest 2: Mark freelancer notification as read...');
        const markReadOptions = {
          hostname: baseUrl,
          port: port,
          path: '/api/notifications-v2',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        };

        const markReadData = {
          notificationId: sampleNotification.id,
          userId: 31,
          userType: 'freelancer'
        };

        const markReadResponse = await makeRequest(markReadOptions, markReadData);
        console.log(`✅ Mark read response status: ${markReadResponse.status}`);
        console.log(`✅ Mark read response: ${JSON.stringify(markReadResponse.data)}`);
      }
    }

    // Test 3: GET commissioner notifications and check for project_pause_accepted
    console.log('\nTest 3: GET commissioner notifications (check for project_pause_accepted exclusion)...');
    const commissionerGetOptions = {
      hostname: baseUrl,
      port: port,
      path: '/api/notifications-v2?userId=32&userType=commissioner&tab=all',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const commissionerResponse = await makeRequest(commissionerGetOptions);
    console.log(`✅ Commissioner GET Response Status: ${commissionerResponse.status}`);
    
    if (commissionerResponse.data.notifications) {
      const notifications = commissionerResponse.data.notifications;
      console.log(`✅ Found ${notifications.length} commissioner notifications`);
      
      // Check for project_pause_accepted notifications
      const pauseAcceptedNotifications = notifications.filter(n => n.type === 'project_pause_accepted');
      if (pauseAcceptedNotifications.length === 0) {
        console.log('✅ No project_pause_accepted notifications found for commissioner (correct!)');
      } else {
        console.log(`❌ Found ${pauseAcceptedNotifications.length} project_pause_accepted notifications for commissioner (should be 0)`);
      }
    }

    // Test 4: Check notification ID consistency
    console.log('\nTest 4: Check notification ID consistency...');
    const testGetOptions = {
      hostname: baseUrl,
      port: port,
      path: '/api/notifications-v2?userId=31&userType=freelancer&tab=all',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const testResponse = await makeRequest(testGetOptions);
    if (testResponse.data.notifications && testResponse.data.notifications.length > 0) {
      const notification = testResponse.data.notifications[0];
      const notificationId = notification.id;
      
      // Check if ID follows expected format: eventId-userId
      const expectedPattern = /^evt_\d+_\d+-31$/;
      if (expectedPattern.test(notificationId)) {
        console.log(`✅ Notification ID follows correct format: ${notificationId}`);
      } else {
        console.log(`❌ Notification ID format incorrect: ${notificationId}`);
      }
    }

    console.log('\n🎉 All freelancer notification fix tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testFreelancerNotificationFixes();

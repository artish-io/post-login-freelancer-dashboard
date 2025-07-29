#!/usr/bin/env node

/**
 * Test script to verify notification API endpoints
 * This script tests the GET and POST endpoints for notifications-v2
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

async function testNotificationAPIEndpoints() {
  console.log('🧪 Testing Notification API Endpoints...\n');

  const baseUrl = 'localhost';
  const port = 3001;

  try {
    // Test 1: GET notifications for freelancer
    console.log('Test 1: GET notifications for freelancer...');
    const getOptions = {
      hostname: baseUrl,
      port: port,
      path: '/api/notifications-v2?userId=31&userType=freelancer&tab=all',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const getResponse = await makeRequest(getOptions);
    console.log(`✅ GET Response Status: ${getResponse.status}`);
    if (getResponse.data.notifications) {
      console.log(`✅ Found ${getResponse.data.notifications.length} notifications`);
      console.log(`✅ Counts: ${JSON.stringify(getResponse.data.counts)}`);
    }

    // Test 2: POST to mark notification as read
    console.log('\nTest 2: POST to mark notification as read...');
    const postOptions = {
      hostname: baseUrl,
      port: port,
      path: '/api/notifications-v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const postData = {
      notificationId: 'test-notification-api-123',
      userId: 31,
      userType: 'freelancer'
    };

    const postResponse = await makeRequest(postOptions, postData);
    console.log(`✅ POST Response Status: ${postResponse.status}`);
    console.log(`✅ POST Response: ${JSON.stringify(postResponse.data)}`);

    console.log('\n🎉 All API endpoint tests completed!');

  } catch (error) {
    console.error('❌ API test failed:', error);
    process.exit(1);
  }
}

// Run the test
testNotificationAPIEndpoints();

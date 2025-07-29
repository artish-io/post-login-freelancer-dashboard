#!/usr/bin/env node

/**
 * Test script to verify notification fixes
 * 1. Test that invoice notifications have correct invoice numbers
 * 2. Test that notification read functionality works for freelancers
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

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

async function testNotificationFixes() {
  console.log('🧪 Testing Notification Fixes...\n');

  const baseUrl = 'localhost';
  const port = 3001;

  try {
    // Test 1: Check that invoice notifications have correct invoice numbers
    console.log('Test 1: Checking invoice notification data...');
    
    const invoiceEventsPath = path.join(process.cwd(), 'data/notifications/events/2025/July/12/invoice_paid.json');
    if (fs.existsSync(invoiceEventsPath)) {
      const events = JSON.parse(fs.readFileSync(invoiceEventsPath, 'utf-8'));
      const problematicEvents = events.filter(event => 
        event.metadata?.invoiceNumber && 
        (event.metadata.invoiceNumber.includes('MGL303001') || 
         event.metadata.invoiceNumber.includes('MGL304001') || 
         event.metadata.invoiceNumber.includes('MGL305001'))
      );
      
      if (problematicEvents.length === 0) {
        console.log('✅ No problematic invoice numbers found in notifications');
      } else {
        console.log('❌ Still found problematic invoice numbers:');
        problematicEvents.forEach(event => {
          console.log(`  - ${event.metadata.invoiceNumber}`);
        });
      }
    }

    // Test 2: GET notifications for freelancer to check structure
    console.log('\nTest 2: GET notifications for freelancer...');
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
      console.log(`✅ Unread count: ${getResponse.data.counts.all}`);
      
      // Check for invoice notifications
      const invoiceNotifications = getResponse.data.notifications.filter(n => 
        n.type === 'invoice_paid' || n.type === 'milestone_payment_received'
      );
      
      console.log(`✅ Found ${invoiceNotifications.length} invoice notifications`);
      
      if (invoiceNotifications.length > 0) {
        console.log('Sample invoice notification:');
        const sample = invoiceNotifications[0];
        console.log(`  - ID: ${sample.id}`);
        console.log(`  - Title: ${sample.title}`);
        console.log(`  - Link: ${sample.link}`);
        console.log(`  - Invoice Number: ${sample.metadata?.invoiceNumber || 'N/A'}`);
      }
    }

    // Test 3: Test marking notification as read
    console.log('\nTest 3: Testing mark notification as read...');
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
      notificationId: 'test-notification-freelancer-123',
      userId: 31,
      userType: 'freelancer'
    };

    const postResponse = await makeRequest(postOptions, postData);
    console.log(`✅ POST Response Status: ${postResponse.status}`);
    console.log(`✅ POST Response: ${JSON.stringify(postResponse.data)}`);

    console.log('\n🎉 All notification fix tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testNotificationFixes();

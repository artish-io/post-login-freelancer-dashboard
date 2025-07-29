#!/usr/bin/env node

/**
 * Comprehensive test to verify invoice notification fix
 * Tests that all invoice notifications now have correct invoice numbers
 * that exist in the invoices.json database
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

async function testInvoiceNotificationFix() {
  console.log('🧪 Testing Invoice Notification Fix...\n');

  try {
    // Load invoices database to check against
    const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
    const invoices = JSON.parse(fs.readFileSync(invoicesPath, 'utf-8'));
    const validInvoiceNumbers = invoices.map(inv => inv.invoiceNumber);
    
    console.log(`📋 Found ${validInvoiceNumbers.length} valid invoice numbers in database`);
    console.log('Valid invoice numbers:', validInvoiceNumbers.slice(0, 5), '...\n');

    // Test 1: Check notification files for problematic invoice numbers
    console.log('Test 1: Checking notification files for problematic invoice numbers...');
    
    const eventsDir = path.join(process.cwd(), 'data/notifications/events');
    let problematicFound = false;
    
    function checkDirectory(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          checkDirectory(itemPath);
        } else if (item.endsWith('.json') && !item.includes('backup')) {
          const content = fs.readFileSync(itemPath, 'utf-8');
          const events = JSON.parse(content);
          
          events.forEach(event => {
            if (event.metadata?.invoiceNumber) {
              const invoiceNumber = event.metadata.invoiceNumber;
              // Check for old format (6 digits without -M suffix)
              if (/^MGL\d{6}$/.test(invoiceNumber)) {
                console.log(`❌ Found problematic invoice number: ${invoiceNumber} in ${itemPath}`);
                problematicFound = true;
              }
              // Check if invoice exists in database
              else if (!validInvoiceNumbers.includes(invoiceNumber)) {
                console.log(`⚠️  Invoice number not found in database: ${invoiceNumber} in ${itemPath}`);
              }
            }
          });
        }
      });
    }
    
    checkDirectory(eventsDir);
    
    if (!problematicFound) {
      console.log('✅ No problematic invoice numbers found in notification files');
    }

    // Test 2: Get notifications via API and check invoice numbers
    console.log('\nTest 2: Testing invoice notifications via API...');
    
    const getOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/notifications-v2?userId=31&userType=freelancer&tab=all',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await makeRequest(getOptions);
    console.log(`✅ API Response Status: ${response.status}`);
    
    if (response.data.notifications) {
      const notifications = response.data.notifications;
      const invoiceNotifications = notifications.filter(n => 
        n.type === 'invoice_paid' || n.type === 'milestone_payment_received' || n.type === 'invoice_sent'
      );
      
      console.log(`✅ Found ${invoiceNotifications.length} invoice notifications`);
      
      let invalidInvoiceCount = 0;
      invoiceNotifications.forEach(notification => {
        const invoiceNumber = notification.metadata?.invoiceNumber;
        if (invoiceNumber) {
          if (!validInvoiceNumbers.includes(invoiceNumber)) {
            console.log(`❌ Invalid invoice number in API response: ${invoiceNumber}`);
            console.log(`   Notification: ${notification.title}`);
            console.log(`   Link: ${notification.link}`);
            invalidInvoiceCount++;
          }
        }
      });
      
      if (invalidInvoiceCount === 0) {
        console.log('✅ All invoice notifications have valid invoice numbers');
      } else {
        console.log(`❌ Found ${invalidInvoiceCount} notifications with invalid invoice numbers`);
      }

      // Test specific problematic invoice numbers
      console.log('\nTest 3: Checking for specific problematic invoice numbers...');
      const problematicNumbers = ['MGL303001', 'MGL304001', 'MGL305001', 'MGL299001', 'MGL306001', 'MGL311001'];
      
      let foundProblematic = false;
      problematicNumbers.forEach(problemNumber => {
        const found = invoiceNotifications.find(n => n.metadata?.invoiceNumber === problemNumber);
        if (found) {
          console.log(`❌ Still found problematic invoice number: ${problemNumber}`);
          foundProblematic = true;
        }
      });
      
      if (!foundProblematic) {
        console.log('✅ No problematic invoice numbers found in API response');
      }
    }

    console.log('\n🎉 Invoice notification fix test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testInvoiceNotificationFix();

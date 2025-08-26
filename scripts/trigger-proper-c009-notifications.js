#!/usr/bin/env node

/**
 * Trigger Proper C-009 Notifications
 * 
 * This script triggers the invoice.paid events through the proper bus system
 * to generate correct notifications using the enrichment system.
 */

const fs = require('fs').promises;
const path = require('path');

async function triggerProperNotifications() {
  try {
    console.log('🎯 Triggering Proper C-009 Notifications via Bus System');
    console.log('====================================================');

    // Step 1: Clean up existing corrupted notifications
    console.log('\n🧹 Step 1: Cleaning up corrupted notifications...');
    
    const notificationsDir = path.join(process.cwd(), 'data/notifications/events/2025/August/26');
    let removedCount = 0;
    
    for (const notifType of ['milestone_payment_sent', 'milestone_payment_received']) {
      const typeDir = path.join(notificationsDir, notifType);
      try {
        const files = await fs.readdir(typeDir);
        for (const file of files) {
          if (file.includes('C-009')) {
            const filePath = path.join(typeDir, file);
            const notification = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Remove if it has poor quality
            const hasIssues = 
              notification.metadata?.freelancerName === 'Freelancer' ||
              notification.metadata?.amount === 0 ||
              !notification.metadata?.organizationName ||
              notification.metadata?.organizationName === 'Organization';
            
            if (hasIssues) {
              await fs.unlink(filePath);
              console.log(`   ❌ Removed corrupted: ${file}`);
              removedCount++;
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }
    
    console.log(`   Removed ${removedCount} corrupted notifications`);

    // Step 2: Find paid invoices
    console.log('\n📋 Step 2: Finding paid invoices...');
    
    const paidInvoices = [];
    
    for (const day of ['25', '26']) {
      const invoicesDir = path.join(process.cwd(), 'data/invoices/2025/August', day, 'C-009');
      try {
        const files = await fs.readdir(invoicesDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const invoicePath = path.join(invoicesDir, file);
            const invoice = JSON.parse(await fs.readFile(invoicePath, 'utf8'));
            if (invoice.status === 'paid') {
              paidInvoices.push(invoice);
              console.log(`   ✅ ${invoice.invoiceNumber}: ${invoice.milestones[0]?.description} - $${invoice.totalAmount}`);
            }
          }
        }
      } catch (error) {
        // Skip if directory doesn't exist
      }
    }

    // Step 3: Get project data
    console.log('\n📊 Step 3: Loading project data...');
    const projectPath = path.join(process.cwd(), 'data/projects/2025/08/26/C-009/project.json');
    const project = JSON.parse(await fs.readFile(projectPath, 'utf8'));
    
    console.log(`   Project: ${project.title}`);
    console.log(`   Total Budget: $${project.totalBudget}`);
    console.log(`   Paid to Date: $${project.paidToDate}`);
    console.log(`   Remaining: $${project.totalBudget - project.paidToDate}`);

    // Step 4: Trigger proper notifications via API
    console.log('\n🔄 Step 4: Triggering proper notifications via API...');
    
    for (const invoice of paidInvoices) {
      console.log(`\n   Processing ${invoice.invoiceNumber}...`);
      
      try {
        const response = await fetch('http://localhost:3000/api/notifications/enrich-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            actorId: project.commissionerId,
            targetId: project.freelancerId,
            projectId: 'C-009',
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log(`   ✅ Created notifications for ${invoice.invoiceNumber}:`);
            console.log(`      Commissioner: "You just paid ${result.freelancerName} $${result.amount}"`);
            console.log(`      Freelancer: "${result.organizationName} paid $${result.amount}"`);
            console.log(`      Task: ${result.taskTitle}`);
            console.log(`      Remaining Budget: $${result.remainingBudget}`);
          } else {
            console.log(`   ❌ API returned error: ${result.error}`);
          }
        } else {
          console.log(`   ❌ API request failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
      }
    }

    // Step 5: Verify results
    console.log('\n🔍 Step 5: Verifying results...');
    
    let commissionerNotifs = [];
    let freelancerNotifs = [];
    
    for (const notifType of ['milestone_payment_sent', 'milestone_payment_received']) {
      const typeDir = path.join(notificationsDir, notifType);
      try {
        const files = await fs.readdir(typeDir);
        for (const file of files) {
          if (file.includes('C-009')) {
            const filePath = path.join(typeDir, file);
            const notification = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            if (notifType === 'milestone_payment_sent') {
              commissionerNotifs.push(notification);
            } else {
              freelancerNotifs.push(notification);
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`   Commissioner notifications: ${commissionerNotifs.length}`);
    console.log(`   Freelancer notifications: ${freelancerNotifs.length}`);
    
    for (const notif of commissionerNotifs) {
      const quality = calculateQuality(notif);
      console.log(`   📤 Commissioner ${notif.metadata?.invoiceNumber}: ${notif.metadata?.freelancerName} $${notif.metadata?.amount} (Quality: ${quality}/4)`);
    }
    
    for (const notif of freelancerNotifs) {
      const quality = calculateQuality(notif);
      console.log(`   📥 Freelancer ${notif.metadata?.invoiceNumber}: ${notif.metadata?.organizationName} $${notif.metadata?.amount} (Quality: ${quality}/4)`);
    }

    console.log('\n🎉 Proper Notifications Complete!');
    console.log('=================================');
    
    if (commissionerNotifs.length === paidInvoices.length && freelancerNotifs.length === paidInvoices.length) {
      console.log('✅ Perfect! All notifications properly created with API-backed enrichment.');
    } else {
      console.log('⚠️  Some notifications may be missing. Check the logs above.');
    }

  } catch (error) {
    console.error('❌ Failed to trigger proper notifications:', error);
    process.exit(1);
  }
}

function calculateQuality(notification) {
  let score = 0;
  
  const amount = Number(notification.metadata?.amount || 0);
  if (amount > 0) score += 2;
  
  const freelancerName = notification.metadata?.freelancerName;
  if (freelancerName && freelancerName !== 'Freelancer') score += 1;
  
  const organizationName = notification.metadata?.organizationName;
  if (organizationName && organizationName !== 'Organization') score += 1;
  
  return score;
}

triggerProperNotifications();

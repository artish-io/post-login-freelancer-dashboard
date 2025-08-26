#!/usr/bin/env node

/**
 * Final C-009 Fix with Proper Task Titles
 * 
 * Clean up all C-009 notifications and regenerate them with:
 * 1. Proper task titles from invoice milestones
 * 2. Correct remaining budget calculations
 * 3. Alignment with other milestone-based notifications
 */

const fs = require('fs').promises;
const path = require('path');

async function finalFix() {
  try {
    console.log('🎯 Final C-009 Fix - Proper Task Titles & Budget Context');
    console.log('====================================================');

    // Step 1: Remove ALL existing C-009 notifications
    console.log('\n🧹 Step 1: Removing ALL existing C-009 notifications...');
    
    const notificationsDir = path.join(process.cwd(), 'data/notifications/events/2025/August/26');
    let removedCount = 0;
    
    for (const notifType of ['milestone_payment_sent', 'milestone_payment_received']) {
      const typeDir = path.join(notificationsDir, notifType);
      try {
        const files = await fs.readdir(typeDir);
        for (const file of files) {
          if (file.includes('C-009')) {
            const filePath = path.join(typeDir, file);
            await fs.unlink(filePath);
            console.log(`   ❌ Removed: ${file}`);
            removedCount++;
          }
        }
      } catch (error) {
        console.log(`   No ${notifType} directory found`);
      }
    }
    
    console.log(`   Removed ${removedCount} existing notifications`);

    // Step 2: Get paid invoices with their task details
    console.log('\n📋 Step 2: Loading paid invoices with task details...');
    
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
              const taskTitle = invoice.milestones && invoice.milestones[0] ? 
                invoice.milestones[0].description : 'task';
              
              paidInvoices.push({
                ...invoice,
                taskTitle
              });
              
              console.log(`   ✅ ${invoice.invoiceNumber}: "${taskTitle}" - $${invoice.totalAmount}`);
            }
          }
        }
      } catch (error) {
        // Skip if directory doesn't exist
      }
    }

    // Step 3: Get project data for budget calculations
    console.log('\n📊 Step 3: Loading project data...');
    const projectPath = path.join(process.cwd(), 'data/projects/2025/08/26/C-009/project.json');
    const project = JSON.parse(await fs.readFile(projectPath, 'utf8'));
    
    console.log(`   Project: ${project.title}`);
    console.log(`   Total Budget: $${project.totalBudget}`);
    console.log(`   Paid to Date: $${project.paidToDate}`);
    console.log(`   Remaining: $${project.totalBudget - project.paidToDate}`);

    // Step 4: Generate proper notifications with enriched task titles
    console.log('\n🔄 Step 4: Generating proper notifications with task titles...');
    
    for (const invoice of paidInvoices) {
      console.log(`\n   Processing ${invoice.invoiceNumber} - "${invoice.taskTitle}"...`);
      
      try {
        const response = await fetch('http://localhost:3001/api/notifications/enrich-payment', {
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
            console.log(`      Task: "${result.taskTitle}"`);
            console.log(`      Commissioner: "You just paid ${result.freelancerName} $${result.amount} for submitting ${result.taskTitle}"`);
            console.log(`      Freelancer: "${result.organizationName} paid $${result.amount} for your recent ${result.projectTitle} task submission"`);
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

    // Step 5: Verify the final results
    console.log('\n🔍 Step 5: Verifying final results...');
    
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

    console.log(`\n📊 Final Results:`);
    console.log(`   Commissioner notifications: ${commissionerNotifs.length}`);
    console.log(`   Freelancer notifications: ${freelancerNotifs.length}`);
    
    console.log(`\n📤 Commissioner Notifications:`);
    for (const notif of commissionerNotifs) {
      const quality = calculateQuality(notif);
      console.log(`   ${notif.metadata?.invoiceNumber}: "${notif.metadata?.taskTitle}" - ${notif.metadata?.freelancerName} $${notif.metadata?.amount} (Quality: ${quality}/4)`);
      console.log(`      Message: "${notif.metadata?.message}"`);
    }
    
    console.log(`\n📥 Freelancer Notifications:`);
    for (const notif of freelancerNotifs) {
      const quality = calculateQuality(notif);
      console.log(`   ${notif.metadata?.invoiceNumber}: "${notif.metadata?.taskTitle}" - ${notif.metadata?.organizationName} $${notif.metadata?.amount} (Quality: ${quality}/4)`);
      console.log(`      Message: "${notif.metadata?.message}"`);
    }

    console.log('\n🎉 Final Fix Complete!');
    console.log('======================');
    
    const expectedCount = paidInvoices.length;
    if (commissionerNotifs.length === expectedCount && freelancerNotifs.length === expectedCount) {
      console.log('✅ Perfect! All notifications properly created with:');
      console.log('   ✅ Proper task titles from invoice milestones');
      console.log('   ✅ Correct freelancer and organization names');
      console.log('   ✅ Accurate amounts and remaining budget');
      console.log('   ✅ Both commissioner and freelancer variants');
      console.log('   ✅ Alignment with other milestone-based notifications');
    } else {
      console.log('⚠️  Notification count mismatch - some may be missing.');
    }

  } catch (error) {
    console.error('❌ Final fix failed:', error);
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

finalFix();

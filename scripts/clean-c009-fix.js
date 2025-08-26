#!/usr/bin/env node

/**
 * Clean C-009 Fix
 * 
 * 1. Remove ALL existing C-009 notifications (they're corrupted)
 * 2. Use the proper enrichment system to recreate them
 * 3. Ensure both commissioner and freelancer notifications exist
 */

const fs = require('fs').promises;
const path = require('path');

async function cleanAndFix() {
  try {
    console.log('🧹 Clean C-009 Fix - Using Proper Enrichment System');
    console.log('==================================================');

    // Step 1: Remove ALL existing C-009 notifications
    console.log('\n🗑️  Step 1: Removing ALL existing C-009 notifications...');
    
    const notificationsDir = path.join(process.cwd(), 'data/notifications/events/2025/August/26');
    let removedCount = 0;
    
    for (const notifType of ['milestone_payment_sent', 'milestone_payment_received', 'invoice_paid']) {
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
    
    console.log(`   Removed ${removedCount} corrupted notifications`);

    // Step 2: Find actual paid invoices
    console.log('\n📋 Step 2: Finding paid invoices...');
    
    const paidInvoices = [];
    
    // Check both days for paid invoices
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
              console.log(`   ✅ Found paid invoice: ${invoice.invoiceNumber} - ${invoice.milestones[0]?.description} - $${invoice.totalAmount}`);
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }

    if (paidInvoices.length === 0) {
      console.log('   No paid invoices found!');
      return;
    }

    // Step 3: Get project data for proper calculations
    console.log('\n📊 Step 3: Loading project data...');
    const projectPath = path.join(process.cwd(), 'data/projects/2025/08/26/C-009/project.json');
    const project = JSON.parse(await fs.readFile(projectPath, 'utf8'));
    
    console.log(`   Project: ${project.title}`);
    console.log(`   Total Budget: $${project.totalBudget}`);
    console.log(`   Paid to Date: $${project.paidToDate}`);
    console.log(`   Actual Remaining: $${project.totalBudget - project.paidToDate}`);

    // Step 4: Simulate proper invoice.paid events through the enrichment system
    console.log('\n🔄 Step 4: Recreating notifications through proper enrichment...');
    
    // Import the enrichment system
    const enrichmentModule = await import('../src/lib/notifications/payment-enrichment.js');
    const gatewayModule = await import('../src/lib/notifications/payment-notification-gateway.js');
    
    for (const invoice of paidInvoices) {
      console.log(`\n   Processing ${invoice.invoiceNumber}...`);
      
      try {
        // Use the actual enrichment system
        const enrichedData = await enrichmentModule.enrichPaymentData({
          actorId: project.commissionerId,
          targetId: project.freelancerId,
          projectId: 'C-009',
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount
        });

        if (enrichedData) {
          console.log(`   📊 Enriched data:`);
          console.log(`      Amount: $${enrichedData.amount}`);
          console.log(`      Freelancer: ${enrichedData.freelancerName}`);
          console.log(`      Organization: ${enrichedData.organizationName}`);
          console.log(`      Task: ${enrichedData.taskTitle}`);
          console.log(`      Remaining Budget: $${enrichedData.remainingBudget}`);

          // Emit through the proper gateway
          await gatewayModule.emitMilestonePaymentNotifications(enrichedData);
          
          console.log(`   ✅ Created proper notifications for ${invoice.invoiceNumber}`);
        } else {
          console.log(`   ❌ Enrichment failed for ${invoice.invoiceNumber}`);
        }
      } catch (error) {
        console.log(`   ❌ Error processing ${invoice.invoiceNumber}:`, error.message);
      }
    }

    // Step 5: Verify the results
    console.log('\n🔍 Step 5: Verifying created notifications...');
    
    let commissionerCount = 0;
    let freelancerCount = 0;
    
    for (const notifType of ['milestone_payment_sent', 'milestone_payment_received']) {
      const typeDir = path.join(notificationsDir, notifType);
      try {
        const files = await fs.readdir(typeDir);
        for (const file of files) {
          if (file.includes('C-009')) {
            const filePath = path.join(typeDir, file);
            const notification = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            if (notifType === 'milestone_payment_sent') {
              commissionerCount++;
              console.log(`   ✅ Commissioner: ${notification.metadata?.invoiceNumber} - ${notification.metadata?.freelancerName} - $${notification.metadata?.amount}`);
            } else {
              freelancerCount++;
              console.log(`   ✅ Freelancer: ${notification.metadata?.invoiceNumber} - ${notification.metadata?.organizationName} - $${notification.metadata?.amount}`);
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist
      }
    }

    console.log('\n🎉 Clean Fix Complete!');
    console.log('======================');
    console.log(`✅ Commissioner notifications: ${commissionerCount}`);
    console.log(`✅ Freelancer notifications: ${freelancerCount}`);
    console.log(`✅ Expected: ${paidInvoices.length} of each type`);
    
    if (commissionerCount === paidInvoices.length && freelancerCount === paidInvoices.length) {
      console.log('🎯 Perfect! All notifications properly created.');
    } else {
      console.log('⚠️  Mismatch detected - some notifications may be missing.');
    }

  } catch (error) {
    console.error('❌ Clean fix failed:', error);
    process.exit(1);
  }
}

cleanAndFix();

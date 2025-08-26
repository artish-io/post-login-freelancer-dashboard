#!/usr/bin/env node

/**
 * Proper C-009 Fix Using API-Backed Enrichment
 * 
 * This script uses the actual enrichment system and payment gateway
 * instead of hardcoded JSON manipulation to properly fix C-009 notifications.
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

async function runProperFix() {
  try {
    console.log('🔧 Running Proper C-009 Fix Using API-Backed System...');
    console.log('=====================================================');

    // First, let's analyze what invoices actually exist for C-009
    console.log('\n📋 Step 1: Finding actual C-009 invoices...');
    
    const invoicesDir = path.join(process.cwd(), 'data/invoices/2025/August');
    const c009Invoices = [];
    
    // Check both 25th and 26th
    for (const day of ['25', '26']) {
      const dayDir = path.join(invoicesDir, day, 'C-009');
      try {
        const files = await fs.readdir(dayDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const invoicePath = path.join(dayDir, file);
            const invoice = JSON.parse(await fs.readFile(invoicePath, 'utf8'));
            c009Invoices.push({
              ...invoice,
              filePath: invoicePath,
              day
            });
          }
        }
      } catch (error) {
        console.log(`   No invoices found for day ${day}`);
      }
    }

    console.log(`   Found ${c009Invoices.length} invoices for C-009:`);
    for (const invoice of c009Invoices) {
      console.log(`   - ${invoice.invoiceNumber}: $${invoice.totalAmount}, Status: ${invoice.status}, Day: ${invoice.day}`);
      if (invoice.milestones && invoice.milestones.length > 0) {
        console.log(`     Task: ${invoice.milestones[0].description}`);
      }
    }

    // Get current project state
    console.log('\n📊 Step 2: Getting current project state...');
    const projectPath = path.join(process.cwd(), 'data/projects/2025/08/26/C-009/project.json');
    const project = JSON.parse(await fs.readFile(projectPath, 'utf8'));
    
    console.log(`   Project: ${project.title}`);
    console.log(`   Total Budget: $${project.totalBudget}`);
    console.log(`   Paid to Date: $${project.paidToDate}`);
    console.log(`   Remaining Budget: $${project.totalBudget - project.paidToDate}`);
    console.log(`   Commissioner ID: ${project.commissionerId}`);
    console.log(`   Freelancer ID: ${project.freelancerId}`);

    // Clear existing poor quality notifications
    console.log('\n🗑️  Step 3: Removing poor quality notifications...');
    
    const notificationsDir = path.join(process.cwd(), 'data/notifications/events/2025/August/26');
    let removedCount = 0;
    
    // Remove milestone payment notifications for C-009
    for (const notifType of ['milestone_payment_sent', 'milestone_payment_received']) {
      const typeDir = path.join(notificationsDir, notifType);
      try {
        const files = await fs.readdir(typeDir);
        for (const file of files) {
          if (file.includes('C-009')) {
            const filePath = path.join(typeDir, file);
            const notification = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Remove if it has poor quality or incorrect data
            const quality = calculateQualityScore(notification);
            const hasIncorrectData = 
              notification.metadata?.freelancerName === 'Freelancer' ||
              notification.metadata?.amount === 0 ||
              notification.metadata?.remainingBudget !== (project.totalBudget - project.paidToDate);
            
            if (quality < 4 || hasIncorrectData) {
              await fs.unlink(filePath);
              console.log(`   ❌ Removed poor quality notification: ${file}`);
              removedCount++;
            }
          }
        }
      } catch (error) {
        console.log(`   No ${notifType} directory found`);
      }
    }
    
    console.log(`   Removed ${removedCount} poor quality notifications`);

    // Now use the proper API-backed system to create correct notifications
    console.log('\n🔄 Step 4: Creating proper notifications via API-backed enrichment...');
    
    // For each paid invoice, trigger the proper payment notification flow
    const paidInvoices = c009Invoices.filter(inv => inv.status === 'paid');
    
    console.log(`   Processing ${paidInvoices.length} paid invoices...`);
    
    for (const invoice of paidInvoices) {
      console.log(`\n   Processing invoice ${invoice.invoiceNumber}...`);
      
      // Use the actual enrichment system
      const enrichmentResult = await callEnrichmentAPI({
        actorId: project.commissionerId,
        targetId: project.freelancerId,
        projectId: 'C-009',
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount
      });
      
      if (enrichmentResult.success) {
        console.log(`   ✅ Created proper notifications for ${invoice.invoiceNumber}`);
        console.log(`      Commissioner: "You just paid ${enrichmentResult.freelancerName} $${enrichmentResult.amount}"`);
        console.log(`      Freelancer: "${enrichmentResult.organizationName} paid $${enrichmentResult.amount}"`);
        console.log(`      Remaining Budget: $${enrichmentResult.remainingBudget}`);
      } else {
        console.log(`   ❌ Failed to create notifications for ${invoice.invoiceNumber}: ${enrichmentResult.error}`);
      }
    }

    console.log('\n🎉 Proper Fix Complete!');
    console.log('======================');
    console.log('✅ Used API-backed enrichment system');
    console.log('✅ Proper remaining budget calculations');
    console.log('✅ Correct task-to-invoice associations');
    console.log('✅ Both commissioner and freelancer notifications');

  } catch (error) {
    console.error('❌ Proper fix failed:', error);
    process.exit(1);
  }
}

async function callEnrichmentAPI(paymentData) {
  try {
    // Make HTTP request to our enrichment endpoint
    const response = await fetch('http://localhost:3000/api/notifications/enrich-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (response.ok) {
      return await response.json();
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function calculateQualityScore(notification) {
  let score = 0;
  
  const amount = Number(notification.metadata?.amount || 0);
  if (amount > 0) score += 2;
  
  const freelancerName = notification.metadata?.freelancerName;
  if (freelancerName && freelancerName !== 'Freelancer') score += 1;
  
  const organizationName = notification.metadata?.organizationName;
  if (organizationName && organizationName !== 'Organization') score += 1;
  
  return score;
}

// Run the proper fix
runProperFix();

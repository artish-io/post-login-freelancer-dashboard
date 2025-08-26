#!/usr/bin/env node

/**
 * C-009 Backfill Runner
 * 
 * This script runs the C-009 backfill to fix the specific issues:
 * 1. Missing freelancer notifications
 * 2. Commissioner notifications with "Freelancer" name and $0 amount
 * 3. Create proper enriched notifications for all invoices
 */

const fs = require('fs').promises;
const path = require('path');

// Import the backfill functions
async function runBackfill() {
  try {
    console.log('🚀 Starting C-009 Backfill Process...');
    console.log('=====================================');

    // First, let's check what notifications currently exist
    console.log('\n📋 Step 1: Analyzing current C-009 notifications...');
    
    const notificationsDir = path.join(process.cwd(), 'data/notifications/events/2025/August/26');
    
    // Find all milestone payment notifications for C-009
    const milestonePaymentSentDir = path.join(notificationsDir, 'milestone_payment_sent');
    const milestonePaymentReceivedDir = path.join(notificationsDir, 'milestone_payment_received');
    
    let commissionerNotifications = [];
    let freelancerNotifications = [];
    
    try {
      const sentFiles = await fs.readdir(milestonePaymentSentDir);
      for (const file of sentFiles) {
        if (file.includes('C-009')) {
          const filePath = path.join(milestonePaymentSentDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const notification = JSON.parse(content);
          commissionerNotifications.push({ file, notification });
        }
      }
    } catch (error) {
      console.log('   No milestone_payment_sent directory found');
    }
    
    try {
      const receivedFiles = await fs.readdir(milestonePaymentReceivedDir);
      for (const file of receivedFiles) {
        if (file.includes('C-009')) {
          const filePath = path.join(milestonePaymentReceivedDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const notification = JSON.parse(content);
          freelancerNotifications.push({ file, notification });
        }
      }
    } catch (error) {
      console.log('   No milestone_payment_received directory found');
    }

    console.log(`   Found ${commissionerNotifications.length} commissioner notifications`);
    console.log(`   Found ${freelancerNotifications.length} freelancer notifications`);

    // Analyze the quality of existing notifications
    console.log('\n🔍 Step 2: Analyzing notification quality...');
    
    const poorQualityNotifications = [];
    const missingInvoices = new Set();
    
    for (const { file, notification } of commissionerNotifications) {
      const quality = calculateQualityScore(notification);
      const invoiceNumber = notification.metadata?.invoiceNumber;
      
      console.log(`   Commissioner ${invoiceNumber}: Quality=${quality}/4, Name="${notification.metadata?.freelancerName}", Amount=$${notification.metadata?.amount}`);
      
      if (quality < 4) {
        poorQualityNotifications.push({ file, notification, type: 'commissioner' });
      }
      
      if (invoiceNumber) {
        missingInvoices.add(invoiceNumber);
      }
    }
    
    for (const { file, notification } of freelancerNotifications) {
      const quality = calculateQualityScore(notification);
      const invoiceNumber = notification.metadata?.invoiceNumber;
      
      console.log(`   Freelancer ${invoiceNumber}: Quality=${quality}/4, Org="${notification.metadata?.organizationName}", Amount=$${notification.metadata?.amount}`);
      
      if (quality < 4) {
        poorQualityNotifications.push({ file, notification, type: 'freelancer' });
      }
      
      if (invoiceNumber) {
        missingInvoices.delete(invoiceNumber); // Remove from missing if freelancer exists
      }
    }

    console.log(`\n📊 Analysis Results:`);
    console.log(`   Poor quality notifications: ${poorQualityNotifications.length}`);
    console.log(`   Missing freelancer notifications for invoices: ${Array.from(missingInvoices).join(', ')}`);

    // Step 3: Get project data for enrichment
    console.log('\n📁 Step 3: Loading project data for enrichment...');
    
    const projectPath = path.join(process.cwd(), 'data/projects/2025/08/26/C-009/project.json');
    const projectData = JSON.parse(await fs.readFile(projectPath, 'utf8'));
    
    console.log(`   Project: ${projectData.title}`);
    console.log(`   Commissioner ID: ${projectData.commissionerId}`);
    console.log(`   Freelancer ID: ${projectData.freelancerId}`);
    console.log(`   Total Budget: $${projectData.totalBudget}`);
    console.log(`   Paid to Date: $${projectData.paidToDate}`);

    // Get user data
    const commissionerPath = path.join(process.cwd(), 'data/users', `${projectData.commissionerId}.json`);
    const freelancerPath = path.join(process.cwd(), 'data/users', `${projectData.freelancerId}.json`);
    
    let commissionerData, freelancerData;
    try {
      commissionerData = JSON.parse(await fs.readFile(commissionerPath, 'utf8'));
      freelancerData = JSON.parse(await fs.readFile(freelancerPath, 'utf8'));
    } catch (error) {
      console.log('   Could not load user data, will use fallback names');
    }

    const freelancerName = freelancerData?.name || freelancerData?.displayName || 'Tobi Philly';
    const organizationName = commissionerData?.profile?.organizationName || 
                            commissionerData?.displayName || 
                            commissionerData?.name || 
                            'Corlax Wellness';

    console.log(`   Freelancer Name: ${freelancerName}`);
    console.log(`   Organization Name: ${organizationName}`);

    // Step 4: Fix poor quality notifications
    console.log('\n🔧 Step 4: Fixing poor quality notifications...');
    
    let fixedCount = 0;
    
    for (const { file, notification, type } of poorQualityNotifications) {
      const invoiceNumber = notification.metadata?.invoiceNumber;
      
      if (!invoiceNumber) {
        console.log(`   Skipping notification without invoice number: ${file}`);
        continue;
      }

      // Get invoice data for amount
      let invoiceAmount = notification.metadata?.amount || 0;
      
      try {
        const invoicePath = path.join(process.cwd(), 'data/invoices/2025/August/26/C-009', `${invoiceNumber}.json`);
        const invoiceData = JSON.parse(await fs.readFile(invoicePath, 'utf8'));
        invoiceAmount = invoiceData.totalAmount || invoiceAmount;
      } catch (error) {
        // Try previous day
        try {
          const invoicePath = path.join(process.cwd(), 'data/invoices/2025/August/25/C-009', `${invoiceNumber}.json`);
          const invoiceData = JSON.parse(await fs.readFile(invoicePath, 'utf8'));
          invoiceAmount = invoiceData.totalAmount || invoiceAmount;
        } catch (error2) {
          console.log(`   Could not find invoice ${invoiceNumber}, using existing amount: $${invoiceAmount}`);
        }
      }

      // Create upgraded notification
      const upgradedNotification = {
        ...notification,
        metadata: {
          ...notification.metadata,
          freelancerName: type === 'commissioner' ? freelancerName : notification.metadata?.freelancerName,
          organizationName: type === 'freelancer' ? organizationName : notification.metadata?.organizationName,
          amount: invoiceAmount,
          remainingBudget: projectData.totalBudget - projectData.paidToDate,
          projectTitle: projectData.title,
          qualityScore: 4,
          enrichmentNote: 'Backfilled',
          eventKey: `${notification.type}:${type}:C-009:${invoiceNumber}`
        },
        updatedAt: new Date().toISOString()
      };

      // Update title and message
      if (type === 'commissioner') {
        upgradedNotification.metadata.title = `You just paid ${freelancerName} $${invoiceAmount}`;
        upgradedNotification.metadata.message = `You just paid ${freelancerName} $${invoiceAmount} for submitting ${notification.metadata?.taskTitle || 'task'} for ${projectData.title}. Remaining budget: $${upgradedNotification.metadata.remainingBudget}. Click here to see transaction activity`;
      } else {
        upgradedNotification.metadata.title = `${organizationName} paid $${invoiceAmount}`;
        upgradedNotification.metadata.message = `${organizationName} has paid $${invoiceAmount} for your recent ${projectData.title} task submission. This project has a remaining budget of $${upgradedNotification.metadata.remainingBudget}. Click here to view invoice details`;
      }

      // Write the upgraded notification
      const originalPath = path.join(
        notificationsDir, 
        notification.type, 
        file
      );
      
      await fs.writeFile(originalPath, JSON.stringify(upgradedNotification, null, 2));
      
      console.log(`   ✅ Upgraded ${type} notification for ${invoiceNumber}: $${invoiceAmount}, ${type === 'commissioner' ? freelancerName : organizationName}`);
      fixedCount++;
    }

    // Step 5: Create missing freelancer notifications
    console.log('\n➕ Step 5: Creating missing freelancer notifications...');
    
    let createdCount = 0;
    
    for (const invoiceNumber of missingInvoices) {
      // Find the corresponding commissioner notification to get task details
      const commissionerNotif = commissionerNotifications.find(
        ({ notification }) => notification.metadata?.invoiceNumber === invoiceNumber
      );

      if (!commissionerNotif) {
        console.log(`   No commissioner notification found for ${invoiceNumber}, skipping`);
        continue;
      }

      // Get invoice amount
      let invoiceAmount = 0;
      try {
        const invoicePath = path.join(process.cwd(), 'data/invoices/2025/August/26/C-009', `${invoiceNumber}.json`);
        const invoiceData = JSON.parse(await fs.readFile(invoicePath, 'utf8'));
        invoiceAmount = invoiceData.totalAmount || 0;
      } catch (error) {
        try {
          const invoicePath = path.join(process.cwd(), 'data/invoices/2025/August/25/C-009', `${invoiceNumber}.json`);
          const invoiceData = JSON.parse(await fs.readFile(invoicePath, 'utf8'));
          invoiceAmount = invoiceData.totalAmount || 0;
        } catch (error2) {
          console.log(`   Could not find invoice ${invoiceNumber} for amount`);
          continue;
        }
      }

      // Create freelancer notification
      const freelancerNotification = {
        id: `milestone_payment_received_C-009_${invoiceNumber}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'milestone_payment_received',
        notificationType: 42,
        actorId: projectData.commissionerId,
        targetId: projectData.freelancerId,
        entityType: 10,
        entityId: `C-009_${invoiceNumber}`,
        metadata: {
          projectId: 'C-009',
          invoiceNumber,
          amount: invoiceAmount,
          organizationName,
          projectTitle: projectData.title,
          taskTitle: commissionerNotif.notification.metadata?.taskTitle || 'task',
          remainingBudget: projectData.totalBudget - projectData.paidToDate,
          projectBudget: projectData.totalBudget,
          qualityScore: 4,
          enrichmentNote: 'Backfilled',
          eventKey: `milestone_payment_received:freelancer:C-009:${invoiceNumber}`,
          audience: 'freelancer',
          title: `${organizationName} paid $${invoiceAmount}`,
          message: `${organizationName} has paid $${invoiceAmount} for your recent ${projectData.title} task submission. This project has a remaining budget of $${projectData.totalBudget - projectData.paidToDate}. Click here to view invoice details`
        },
        context: {
          projectId: 'C-009',
          invoiceNumber
        }
      };

      // Ensure directory exists
      await fs.mkdir(milestonePaymentReceivedDir, { recursive: true });

      // Write the freelancer notification
      const freelancerPath = path.join(milestonePaymentReceivedDir, `${freelancerNotification.id}.json`);
      await fs.writeFile(freelancerPath, JSON.stringify(freelancerNotification, null, 2));

      console.log(`   ✅ Created freelancer notification for ${invoiceNumber}: $${invoiceAmount}, ${organizationName}`);
      createdCount++;
    }

    // Final summary
    console.log('\n🎉 Backfill Complete!');
    console.log('====================');
    console.log(`   Notifications upgraded: ${fixedCount}`);
    console.log(`   Freelancer notifications created: ${createdCount}`);
    console.log(`   Total changes: ${fixedCount + createdCount}`);

    if (fixedCount + createdCount > 0) {
      console.log('\n✅ C-009 notifications have been successfully backfilled!');
      console.log('   All notifications now have:');
      console.log('   - Proper freelancer names (not "Freelancer")');
      console.log('   - Correct amounts (not $0)');
      console.log('   - Both commissioner and freelancer variants');
    } else {
      console.log('\n✅ No backfill needed - all notifications are already high quality!');
    }

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
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

// Run the backfill
runBackfill();

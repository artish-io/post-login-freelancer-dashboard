#!/usr/bin/env node

/**
 * Payment Consistency Migration Script
 * 
 * This script migrates all existing paid invoices to be consistent with
 * the current /api/payments processing logic and creates missing wallet transactions.
 */

const fs = require('fs').promises;
const path = require('path');

async function migratePaymentConsistency() {
  console.log('🔄 Migrating Payment Consistency...\n');

  let invoicesProcessed = 0;
  let invoicesUpdated = 0;
  let walletTransactionsCreated = 0;
  let errors = 0;

  // Load existing wallet history
  const walletHistoryPath = path.join(process.cwd(), 'data/wallet/wallet-history.json');
  let walletHistory = [];
  try {
    const walletData = await fs.readFile(walletHistoryPath, 'utf-8');
    walletHistory = JSON.parse(walletData);
  } catch (error) {
    console.log('Creating new wallet history file...');
    walletHistory = [];
  }

  // Get next wallet transaction ID
  const getNextWalletId = () => {
    const maxId = walletHistory.reduce((max, tx) => Math.max(max, tx.id || 0), 1000);
    return maxId + 1;
  };

  // Function to scan invoices recursively
  async function scanInvoicesRecursively(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanInvoicesRecursively(fullPath);
      } else if (entry.name === 'invoice.json') {
        try {
          const invoiceData = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
          
          if (invoiceData.status === 'paid') {
            invoicesProcessed++;
            await migrateSingleInvoice(invoiceData, fullPath);
          }
        } catch (error) {
          console.error(`❌ Error processing ${fullPath}:`, error.message);
          errors++;
        }
      }
    }
  }

  async function migrateSingleInvoice(invoice, filePath) {
    const invoiceNumber = invoice.invoiceNumber;
    const totalAmount = invoice.totalAmount;
    const freelancerId = parseInt(invoice.freelancerId);
    const commissionerId = invoice.commissionerId;
    const projectId = invoice.projectId;
    
    let needsUpdate = false;
    let updates = {};

    console.log(`🔍 Processing ${invoiceNumber}...`);

    // 1. Add missing paymentDetails with correct calculations
    if (!invoice.paymentDetails) {
      const platformFee = Math.round(totalAmount * 0.05 * 100) / 100; // 5% platform fee
      const freelancerAmount = Math.round((totalAmount - platformFee) * 100) / 100;
      
      updates.paymentDetails = {
        paymentId: `migrated_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        paymentMethod: 'migrated', // Mark as migrated
        platformFee: platformFee,
        freelancerAmount: freelancerAmount,
        currency: 'USD',
        processedAt: invoice.paidDate || new Date().toISOString()
      };
      needsUpdate = true;
      console.log(`   ✅ Added paymentDetails: $${freelancerAmount} to freelancer, $${platformFee} platform fee`);
    }

    // 2. Add missing required fields
    if (!invoice.paidDate) {
      updates.paidDate = invoice.issueDate || new Date().toISOString().split('T')[0];
      needsUpdate = true;
      console.log(`   ✅ Added paidDate: ${updates.paidDate}`);
    }

    if (!invoice.invoicingMethod) {
      // Intelligent default based on invoice characteristics
      let invoicingMethod = 'completion'; // Default
      
      // If invoice has milestone number or is part of a series, likely milestone-based
      if (invoice.milestoneNumber || invoice.parentInvoiceNumber) {
        invoicingMethod = 'milestone';
      }
      
      updates.invoicingMethod = invoicingMethod;
      needsUpdate = true;
      console.log(`   ✅ Added invoicingMethod: ${invoicingMethod}`);
    }

    // 3. Fix incorrect payment calculations
    if (invoice.paymentDetails) {
      const expectedPlatformFee = Math.round(totalAmount * 0.05 * 100) / 100;
      const expectedFreelancerAmount = Math.round((totalAmount - expectedPlatformFee) * 100) / 100;
      
      if (Math.abs(invoice.paymentDetails.platformFee - expectedPlatformFee) > 0.01) {
        updates.paymentDetails = {
          ...invoice.paymentDetails,
          platformFee: expectedPlatformFee,
          freelancerAmount: expectedFreelancerAmount
        };
        needsUpdate = true;
        console.log(`   ✅ Fixed payment calculations: $${expectedFreelancerAmount} to freelancer, $${expectedPlatformFee} platform fee`);
      }
    }

    // 4. Update invoice if needed
    if (needsUpdate) {
      const updatedInvoice = { ...invoice, ...updates };
      await fs.writeFile(filePath, JSON.stringify(updatedInvoice, null, 2));
      invoicesUpdated++;
    }

    // 5. Create missing wallet transaction
    const finalFreelancerAmount = updates.paymentDetails?.freelancerAmount || 
                                 invoice.paymentDetails?.freelancerAmount || 
                                 totalAmount;

    const existingWalletTx = walletHistory.find(tx => 
      tx.projectId === projectId && 
      tx.userId === freelancerId &&
      tx.type === 'credit'
    );

    if (!existingWalletTx) {
      const walletTransaction = {
        id: getNextWalletId(),
        userId: freelancerId,
        commissionerId: commissionerId,
        organizationId: null, // Could be derived from project if needed
        projectId: projectId,
        type: 'credit',
        amount: finalFreelancerAmount,
        currency: 'USD',
        date: invoice.paidDate || updates.paidDate || new Date().toISOString(),
        source: 'project_payment',
        description: `Payment for ${invoice.projectTitle}`,
        invoiceNumber: invoiceNumber,
        migrated: true // Mark as migrated
      };

      walletHistory.push(walletTransaction);
      walletTransactionsCreated++;
      console.log(`   ✅ Created wallet transaction: $${finalFreelancerAmount} for user ${freelancerId}`);
    } else {
      // Update existing wallet transaction if amount is wrong
      if (Math.abs(existingWalletTx.amount - finalFreelancerAmount) > 0.01) {
        existingWalletTx.amount = finalFreelancerAmount;
        existingWalletTx.migrated = true;
        console.log(`   ✅ Updated wallet transaction amount: $${finalFreelancerAmount}`);
      }
    }
  }

  try {
    console.log('🔍 Scanning all paid invoices...\n');
    
    const invoicesDir = path.join(process.cwd(), 'data/invoices');
    await scanInvoicesRecursively(invoicesDir);

    // Save updated wallet history
    await fs.writeFile(walletHistoryPath, JSON.stringify(walletHistory, null, 2));

    console.log('\n📊 Migration Summary:');
    console.log(`   Invoices processed: ${invoicesProcessed}`);
    console.log(`   Invoices updated: ${invoicesUpdated}`);
    console.log(`   Wallet transactions created: ${walletTransactionsCreated}`);
    console.log(`   Errors: ${errors}`);

    if (errors === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n✅ All paid invoices now follow the /api/payments processing logic:');
      console.log('   - 5% platform fee calculation');
      console.log('   - Proper freelancer amount calculation');
      console.log('   - Complete paymentDetails structure');
      console.log('   - Corresponding wallet transactions');
      console.log('   - Required fields (paidDate, invoicingMethod)');
    } else {
      console.log(`\n⚠️  Migration completed with ${errors} errors`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
migratePaymentConsistency();

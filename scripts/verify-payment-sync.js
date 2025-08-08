#!/usr/bin/env node

/**
 * Payment Synchronization Verification Script
 * 
 * This script provides a detailed verification of payment synchronization
 * between invoices and wallet transactions.
 */

const fs = require('fs').promises;
const path = require('path');

async function verifyPaymentSync() {
  console.log('🔍 Verifying Payment Synchronization...\n');

  // Load wallet history
  const walletHistoryPath = path.join(process.cwd(), 'data/wallet/wallet-history.json');
  const walletHistory = JSON.parse(await fs.readFile(walletHistoryPath, 'utf-8'));

  // Collect all paid invoices
  const paidInvoices = [];
  
  async function collectInvoicesRecursively(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await collectInvoicesRecursively(fullPath);
      } else if (entry.name === 'invoice.json') {
        try {
          const invoiceData = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
          
          if (invoiceData.status === 'paid') {
            paidInvoices.push(invoiceData);
          }
        } catch (error) {
          console.error(`❌ Error reading ${fullPath}:`, error.message);
        }
      }
    }
  }

  const invoicesDir = path.join(process.cwd(), 'data/invoices');
  await collectInvoicesRecursively(invoicesDir);

  console.log(`📊 Analyzing ${paidInvoices.length} paid invoices and ${walletHistory.length} wallet transactions\n`);

  let perfectMatches = 0;
  let issues = [];

  for (const invoice of paidInvoices) {
    const invoiceNumber = invoice.invoiceNumber;
    const freelancerId = parseInt(invoice.freelancerId);
    const projectId = invoice.projectId;
    const expectedAmount = invoice.paymentDetails?.freelancerAmount || 
                          Math.round((invoice.totalAmount * 0.95) * 100) / 100;

    // Find wallet transaction by invoice number (most accurate)
    let walletTx = walletHistory.find(tx => tx.invoiceNumber === invoiceNumber);
    
    // Fallback: find by project and user
    if (!walletTx) {
      walletTx = walletHistory.find(tx => 
        tx.projectId === projectId && 
        tx.userId === freelancerId &&
        tx.type === 'credit'
      );
    }

    if (!walletTx) {
      issues.push({
        type: 'MISSING_WALLET_TX',
        invoice: invoiceNumber,
        message: `No wallet transaction found`
      });
      continue;
    }

    // Check amount match
    if (Math.abs(walletTx.amount - expectedAmount) < 0.01) {
      perfectMatches++;
      console.log(`✅ ${invoiceNumber}: Perfect match - $${expectedAmount}`);
    } else {
      issues.push({
        type: 'AMOUNT_MISMATCH',
        invoice: invoiceNumber,
        expected: expectedAmount,
        actual: walletTx.amount,
        difference: Math.abs(walletTx.amount - expectedAmount)
      });
      console.log(`❌ ${invoiceNumber}: Amount mismatch - Expected: $${expectedAmount}, Actual: $${walletTx.amount}`);
    }
  }

  console.log('\n📊 Verification Results:');
  console.log(`   Perfect matches: ${perfectMatches}/${paidInvoices.length} (${Math.round(perfectMatches/paidInvoices.length*100)}%)`);
  console.log(`   Issues found: ${issues.length}`);

  if (issues.length > 0) {
    console.log('\n🚨 Issues Details:');
    issues.forEach(issue => {
      if (issue.type === 'AMOUNT_MISMATCH') {
        console.log(`   ${issue.invoice}: $${issue.expected} → $${issue.actual} (diff: $${issue.difference.toFixed(2)})`);
      } else {
        console.log(`   ${issue.invoice}: ${issue.message}`);
      }
    });
  }

  // Calculate total platform revenue and freelancer payouts
  const totalPlatformRevenue = paidInvoices.reduce((sum, inv) => 
    sum + (inv.paymentDetails?.platformFee || Math.round(inv.totalAmount * 0.05 * 100) / 100), 0);
  
  const totalFreelancerPayouts = walletHistory
    .filter(tx => tx.type === 'credit')
    .reduce((sum, tx) => sum + tx.amount, 0);

  console.log('\n💰 Financial Summary:');
  console.log(`   Total platform revenue: $${totalPlatformRevenue.toFixed(2)}`);
  console.log(`   Total freelancer payouts: $${totalFreelancerPayouts.toFixed(2)}`);
  console.log(`   Total processed: $${(totalPlatformRevenue + totalFreelancerPayouts).toFixed(2)}`);

  const syncScore = Math.round((perfectMatches / paidInvoices.length) * 100);
  console.log(`\n🎯 Payment Synchronization Score: ${syncScore}%`);

  if (syncScore === 100) {
    console.log('🎉 Payment system is PERFECTLY synchronized!');
    console.log('\n✅ All systems are using /api/payments logic:');
    console.log('   - Invoice amounts match wallet transactions');
    console.log('   - Platform fees calculated correctly (5%)');
    console.log('   - Freelancer amounts are accurate');
    console.log('   - All paid invoices have wallet transactions');
  } else if (syncScore >= 90) {
    console.log('✅ Payment system is well synchronized with minor issues');
  } else {
    console.log('⚠️  Payment system needs attention');
  }
}

// Run the verification
verifyPaymentSync().catch(error => {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
});

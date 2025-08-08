#!/usr/bin/env node

/**
 * Payment Consistency Audit Script
 * 
 * This script audits all paid invoices to ensure they are consistent with
 * the current payment processing logic and identifies any discrepancies.
 */

const fs = require('fs').promises;
const path = require('path');

async function auditPaymentConsistency() {
  console.log('🔍 Auditing Payment Consistency...\n');

  const issues = [];
  let totalPaidInvoices = 0;
  let invoicesWithPaymentDetails = 0;
  let invoicesWithWalletTransactions = 0;
  let totalPlatformRevenue = 0;
  let totalFreelancerPayouts = 0;

  // Load wallet history
  const walletHistoryPath = path.join(process.cwd(), 'data/wallet/wallet-history.json');
  let walletHistory = [];
  try {
    const walletData = await fs.readFile(walletHistoryPath, 'utf-8');
    walletHistory = JSON.parse(walletData);
  } catch (error) {
    console.log('❌ Could not load wallet history');
  }

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
            totalPaidInvoices++;
            await auditSingleInvoice(invoiceData, fullPath);
          }
        } catch (error) {
          issues.push({
            type: 'FILE_ERROR',
            file: fullPath,
            message: `Could not parse invoice: ${error.message}`
          });
        }
      }
    }
  }

  async function auditSingleInvoice(invoice, filePath) {
    const invoiceNumber = invoice.invoiceNumber;
    const projectId = invoice.projectId;
    const freelancerId = invoice.freelancerId;
    const totalAmount = invoice.totalAmount;

    // Check 1: Payment Details Structure
    if (!invoice.paymentDetails) {
      issues.push({
        type: 'MISSING_PAYMENT_DETAILS',
        invoiceNumber,
        file: filePath,
        message: 'Paid invoice missing paymentDetails structure'
      });
    } else {
      invoicesWithPaymentDetails++;
      
      // Check platform fee calculation (should be 5%)
      const expectedPlatformFee = Math.round(totalAmount * 0.05 * 100) / 100;
      const actualPlatformFee = invoice.paymentDetails.platformFee;
      
      if (Math.abs(expectedPlatformFee - actualPlatformFee) > 0.01) {
        issues.push({
          type: 'INCORRECT_PLATFORM_FEE',
          invoiceNumber,
          expected: expectedPlatformFee,
          actual: actualPlatformFee,
          message: `Platform fee should be 5% of total amount`
        });
      }
      
      // Check freelancer amount calculation
      const expectedFreelancerAmount = Math.round((totalAmount - expectedPlatformFee) * 100) / 100;
      const actualFreelancerAmount = invoice.paymentDetails.freelancerAmount;
      
      if (Math.abs(expectedFreelancerAmount - actualFreelancerAmount) > 0.01) {
        issues.push({
          type: 'INCORRECT_FREELANCER_AMOUNT',
          invoiceNumber,
          expected: expectedFreelancerAmount,
          actual: actualFreelancerAmount,
          message: `Freelancer amount should be total - platform fee`
        });
      }

      totalPlatformRevenue += actualPlatformFee;
      totalFreelancerPayouts += actualFreelancerAmount;
    }

    // Check 2: Wallet Transaction Existence
    const walletTransaction = walletHistory.find(tx => 
      tx.projectId === projectId && 
      tx.userId === parseInt(freelancerId) &&
      tx.type === 'credit'
    );

    if (!walletTransaction) {
      issues.push({
        type: 'MISSING_WALLET_TRANSACTION',
        invoiceNumber,
        projectId,
        freelancerId,
        message: 'Paid invoice has no corresponding wallet transaction'
      });
    } else {
      invoicesWithWalletTransactions++;
      
      // Check wallet amount matches freelancer amount
      const expectedWalletAmount = invoice.paymentDetails?.freelancerAmount || totalAmount;
      if (Math.abs(walletTransaction.amount - expectedWalletAmount) > 0.01) {
        issues.push({
          type: 'WALLET_AMOUNT_MISMATCH',
          invoiceNumber,
          walletAmount: walletTransaction.amount,
          expectedAmount: expectedWalletAmount,
          message: 'Wallet transaction amount does not match invoice freelancer amount'
        });
      }
    }

    // Check 3: Required Fields
    const requiredFields = ['paidDate', 'invoicingMethod'];
    for (const field of requiredFields) {
      if (!invoice[field]) {
        issues.push({
          type: 'MISSING_REQUIRED_FIELD',
          invoiceNumber,
          field,
          message: `Missing required field: ${field}`
        });
      }
    }

    // Check 4: Invoicing Method Consistency
    if (invoice.invoicingMethod && !['milestone', 'completion'].includes(invoice.invoicingMethod)) {
      issues.push({
        type: 'INVALID_INVOICING_METHOD',
        invoiceNumber,
        invoicingMethod: invoice.invoicingMethod,
        message: 'Invalid invoicing method (should be milestone or completion)'
      });
    }
  }

  try {
    const invoicesDir = path.join(process.cwd(), 'data/invoices');
    await scanInvoicesRecursively(invoicesDir);

    // Generate Report
    console.log('📊 Payment Consistency Audit Report\n');
    
    console.log('📈 Summary Statistics:');
    console.log(`   Total paid invoices: ${totalPaidInvoices}`);
    console.log(`   Invoices with payment details: ${invoicesWithPaymentDetails}/${totalPaidInvoices} (${Math.round(invoicesWithPaymentDetails/totalPaidInvoices*100)}%)`);
    console.log(`   Invoices with wallet transactions: ${invoicesWithWalletTransactions}/${totalPaidInvoices} (${Math.round(invoicesWithWalletTransactions/totalPaidInvoices*100)}%)`);
    console.log(`   Total platform revenue: $${totalPlatformRevenue.toFixed(2)}`);
    console.log(`   Total freelancer payouts: $${totalFreelancerPayouts.toFixed(2)}`);
    console.log(`   Total issues found: ${issues.length}\n`);

    // Group issues by type
    const issuesByType = {};
    issues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });

    console.log('🚨 Issues Found:');
    if (issues.length === 0) {
      console.log('   ✅ No issues found - all payments are consistent!');
    } else {
      Object.keys(issuesByType).forEach(type => {
        console.log(`\n   ${type} (${issuesByType[type].length} issues):`);
        issuesByType[type].slice(0, 5).forEach(issue => {
          console.log(`   - ${issue.invoiceNumber || 'Unknown'}: ${issue.message}`);
          if (issue.expected !== undefined) {
            console.log(`     Expected: ${issue.expected}, Actual: ${issue.actual}`);
          }
        });
        if (issuesByType[type].length > 5) {
          console.log(`   ... and ${issuesByType[type].length - 5} more`);
        }
      });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (invoicesWithPaymentDetails < totalPaidInvoices) {
      console.log(`   - Migrate ${totalPaidInvoices - invoicesWithPaymentDetails} invoices to include paymentDetails`);
    }
    if (invoicesWithWalletTransactions < totalPaidInvoices) {
      console.log(`   - Create ${totalPaidInvoices - invoicesWithWalletTransactions} missing wallet transactions`);
    }
    if (issues.length > 0) {
      console.log(`   - Fix ${issues.length} data consistency issues`);
      console.log(`   - Run migration script to standardize payment processing`);
    }

    // Calculate consistency score
    const consistencyScore = Math.round(((totalPaidInvoices - issues.length) / totalPaidInvoices) * 100);
    console.log(`\n🎯 Payment Consistency Score: ${consistencyScore}%`);
    
    if (consistencyScore >= 95) {
      console.log('🎉 Payment system is highly consistent!');
    } else if (consistencyScore >= 80) {
      console.log('⚠️  Payment system needs minor improvements');
    } else {
      console.log('🚨 Payment system needs significant fixes');
    }

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    process.exit(1);
  }
}

// Run the audit
auditPaymentConsistency();

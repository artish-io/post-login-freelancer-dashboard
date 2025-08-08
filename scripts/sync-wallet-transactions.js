#!/usr/bin/env node

/**
 * Wallet Transaction Synchronization Script
 * 
 * This script ensures all paid invoices have corresponding wallet transactions
 * with amounts that match the /api/payments processing logic.
 */

const fs = require('fs').promises;
const path = require('path');

async function syncWalletTransactions() {
  console.log('🔄 Synchronizing Wallet Transactions...\n');

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

  // Collect all paid invoices
  const invoicesDir = path.join(process.cwd(), 'data/invoices');
  await collectInvoicesRecursively(invoicesDir);

  console.log(`📊 Found ${paidInvoices.length} paid invoices`);

  // Create a clean wallet history with only the original transactions (before migration)
  const originalTransactions = walletHistory.filter(tx => !tx.migrated);
  console.log(`📊 Found ${originalTransactions.length} original wallet transactions`);

  // Get next wallet transaction ID
  const getNextWalletId = () => {
    const maxId = originalTransactions.reduce((max, tx) => Math.max(max, tx.id || 0), 1000);
    return maxId + 1;
  };

  let nextId = getNextWalletId();
  const newWalletHistory = [...originalTransactions];

  // Create wallet transactions for all paid invoices
  for (const invoice of paidInvoices) {
    const freelancerId = parseInt(invoice.freelancerId);
    const projectId = invoice.projectId;
    const invoiceNumber = invoice.invoiceNumber;
    
    // Calculate correct freelancer amount using /api/payments logic
    const totalAmount = invoice.totalAmount;
    const platformFee = Math.round(totalAmount * 0.05 * 100) / 100; // 5% platform fee
    const freelancerAmount = Math.round((totalAmount - platformFee) * 100) / 100;

    // Check if wallet transaction already exists (from original data)
    const existingTx = originalTransactions.find(tx => 
      tx.projectId === projectId && 
      tx.userId === freelancerId &&
      tx.type === 'credit'
    );

    if (existingTx) {
      // Update existing transaction to match invoice amount
      existingTx.amount = freelancerAmount;
      existingTx.invoiceNumber = invoiceNumber;
      existingTx.description = `Payment for ${invoice.projectTitle}`;
      existingTx.source = 'project_payment';
      console.log(`✅ Updated existing wallet transaction for ${invoiceNumber}: $${freelancerAmount}`);
    } else {
      // Create new wallet transaction
      const walletTransaction = {
        id: nextId++,
        userId: freelancerId,
        commissionerId: invoice.commissionerId,
        organizationId: null,
        projectId: projectId,
        type: 'credit',
        amount: freelancerAmount,
        currency: 'USD',
        date: invoice.paidDate || invoice.issueDate || new Date().toISOString().split('T')[0] + 'T00:00:00Z',
        source: 'project_payment',
        description: `Payment for ${invoice.projectTitle}`,
        invoiceNumber: invoiceNumber,
        synced: true // Mark as synced
      };

      newWalletHistory.push(walletTransaction);
      console.log(`✅ Created wallet transaction for ${invoiceNumber}: $${freelancerAmount} for user ${freelancerId}`);
    }
  }

  // Sort wallet history by date
  newWalletHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Save updated wallet history
  await fs.writeFile(walletHistoryPath, JSON.stringify(newWalletHistory, null, 2));

  console.log('\n📊 Synchronization Summary:');
  console.log(`   Original transactions: ${originalTransactions.length}`);
  console.log(`   Total transactions after sync: ${newWalletHistory.length}`);
  console.log(`   New transactions created: ${newWalletHistory.length - originalTransactions.length}`);

  console.log('\n🎉 Wallet transactions synchronized successfully!');
  console.log('\n✅ All wallet transactions now follow /api/payments logic:');
  console.log('   - Amounts match invoice freelancer amounts');
  console.log('   - 5% platform fee deducted from total');
  console.log('   - Proper transaction metadata');
  console.log('   - Chronological ordering');
}

// Run the synchronization
syncWalletTransactions().catch(error => {
  console.error('❌ Synchronization failed:', error.message);
  process.exit(1);
});

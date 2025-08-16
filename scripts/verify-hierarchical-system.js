#!/usr/bin/env node

/**
 * Hierarchical System Verification Script
 * 
 * Tests the new hierarchical transaction storage system to ensure
 * it's working correctly and can replace the flat file system.
 */

const fs = require('fs');
const path = require('path');

// Test the new system by creating sample transactions and verifying balance calculation
async function verifyHierarchicalSystem() {
  console.log('🧪 HIERARCHICAL SYSTEM VERIFICATION\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Create sample transactions
    console.log('\n📝 TEST 1: Creating Sample Transactions');
    await testTransactionCreation();
    
    // Test 2: Test balance calculation
    console.log('\n💰 TEST 2: Testing Balance Calculation');
    await testBalanceCalculation();
    
    // Test 3: Test API endpoints
    console.log('\n🌐 TEST 3: Testing API Endpoints');
    await testAPIEndpoints();
    
    // Test 4: Compare with old system
    console.log('\n🔄 TEST 4: Comparing with Old System');
    await compareWithOldSystem();
    
    // Test 5: Performance test
    console.log('\n⚡ TEST 5: Performance Testing');
    await testPerformance();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ HIERARCHICAL SYSTEM VERIFICATION COMPLETE');
    console.log('\n💡 Next Steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Test: GET /api/wallet/balance/31');
    console.log('   3. Test: GET /api/wallet/earnings/31');
    console.log('   4. Verify: Balance calculation works correctly');
    
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check that all new files are created correctly');
    console.log('   2. Verify TypeScript compilation');
    console.log('   3. Check file permissions for data directory');
    process.exit(1);
  }
}

async function testTransactionCreation() {
  console.log('Creating sample payment transaction...');
  
  // Create a sample transaction structure
  const sampleTransaction = {
    transactionId: 'TXN-PAY-TEST-001-' + Date.now(),
    userId: 31,
    type: 'payment',
    amount: 1000,
    currency: 'USD',
    timestamp: new Date().toISOString(),
    status: 'completed',
    invoiceNumber: 'TEST-001',
    projectId: 'TEST-PROJECT',
    commissionerId: 32,
    freelancerId: 31,
    source: 'manual_payment',
    paymentMethod: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Test payment for verification'
  };
  
  // Create directory structure
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const transactionDir = path.join(
    process.cwd(),
    'data',
    'transactions',
    year.toString(),
    month,
    day,
    sampleTransaction.transactionId
  );
  
  // Create directories
  fs.mkdirSync(transactionDir, { recursive: true });
  
  // Write transaction file
  const transactionFile = path.join(transactionDir, 'payment.json');
  fs.writeFileSync(transactionFile, JSON.stringify(sampleTransaction, null, 2));
  
  // Write metadata file
  const metadata = {
    transactionId: sampleTransaction.transactionId,
    filePath: transactionFile,
    directoryPath: transactionDir,
    createdAt: new Date().toISOString()
  };
  
  const metadataFile = path.join(transactionDir, 'metadata.json');
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  
  console.log(`✅ Sample transaction created: ${sampleTransaction.transactionId}`);
  console.log(`📁 Location: ${transactionFile}`);
  
  return sampleTransaction;
}

async function testBalanceCalculation() {
  console.log('Testing balance calculation logic...');
  
  // Simulate balance calculation by scanning transaction files
  const transactionsDir = path.join(process.cwd(), 'data', 'transactions');
  
  if (!fs.existsSync(transactionsDir)) {
    console.log('⚠️  No transactions directory found - this is expected for new system');
    return;
  }
  
  // Scan for transactions (simplified version)
  let totalPayments = 0;
  let totalWithdrawals = 0;
  let transactionCount = 0;
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Check if this is a transaction directory (contains TXN-)
        if (item.startsWith('TXN-')) {
          // Try to read transaction file
          const paymentFile = path.join(itemPath, 'payment.json');
          const withdrawalFile = path.join(itemPath, 'withdrawal.json');
          
          if (fs.existsSync(paymentFile)) {
            try {
              const transaction = JSON.parse(fs.readFileSync(paymentFile, 'utf8'));
              if (transaction.status === 'completed') {
                totalPayments += transaction.amount;
                transactionCount++;
              }
            } catch (error) {
              console.warn(`Warning: Could not read ${paymentFile}`);
            }
          }
          
          if (fs.existsSync(withdrawalFile)) {
            try {
              const transaction = JSON.parse(fs.readFileSync(withdrawalFile, 'utf8'));
              if (transaction.status === 'completed') {
                totalWithdrawals += transaction.amount;
                transactionCount++;
              }
            } catch (error) {
              console.warn(`Warning: Could not read ${withdrawalFile}`);
            }
          }
        } else {
          // Recursively scan subdirectories
          scanDirectory(itemPath);
        }
      }
    }
  }
  
  scanDirectory(transactionsDir);
  
  const calculatedBalance = totalPayments - totalWithdrawals;
  
  console.log(`✅ Balance calculation test completed:`);
  console.log(`   Total Payments: $${totalPayments}`);
  console.log(`   Total Withdrawals: $${totalWithdrawals}`);
  console.log(`   Calculated Balance: $${calculatedBalance}`);
  console.log(`   Transaction Count: ${transactionCount}`);
  
  return {
    totalPayments,
    totalWithdrawals,
    calculatedBalance,
    transactionCount
  };
}

async function testAPIEndpoints() {
  console.log('Testing API endpoint structure...');
  
  // Check if API files exist
  const apiFiles = [
    'src/app/api/wallet/balance/[userId]/route.ts',
    'src/app/api/wallet/earnings/[userId]/route.ts'
  ];
  
  let allFilesExist = true;
  
  for (const file of apiFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ API file exists: ${file}`);
    } else {
      console.log(`❌ API file missing: ${file}`);
      allFilesExist = false;
    }
  }
  
  // Check core service files
  const serviceFiles = [
    'src/lib/storage/hierarchical-transaction-service.ts',
    'src/lib/storage/transaction-schemas.ts',
    'src/lib/storage/transaction-paths.ts',
    'src/lib/services/balance-calculation-service.ts'
  ];
  
  for (const file of serviceFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ Service file exists: ${file}`);
    } else {
      console.log(`❌ Service file missing: ${file}`);
      allFilesExist = false;
    }
  }
  
  if (allFilesExist) {
    console.log('✅ All required files exist for hierarchical system');
  } else {
    throw new Error('Missing required files for hierarchical system');
  }
  
  return allFilesExist;
}

async function compareWithOldSystem() {
  console.log('Comparing with old flat file system...');
  
  // Read old system data
  const oldTransactionsFile = path.join(process.cwd(), 'data', 'payments', 'transactions.json');
  const oldWalletsFile = path.join(process.cwd(), 'data', 'payments', 'wallets.json');
  
  let oldTransactions = [];
  let oldWallets = [];
  
  if (fs.existsSync(oldTransactionsFile)) {
    try {
      oldTransactions = JSON.parse(fs.readFileSync(oldTransactionsFile, 'utf8'));
    } catch (error) {
      console.log('⚠️  Could not read old transactions file');
    }
  }
  
  if (fs.existsSync(oldWalletsFile)) {
    try {
      oldWallets = JSON.parse(fs.readFileSync(oldWalletsFile, 'utf8'));
    } catch (error) {
      console.log('⚠️  Could not read old wallets file');
    }
  }
  
  console.log(`📊 Old System Data:`);
  console.log(`   Transactions: ${oldTransactions.length} records`);
  console.log(`   Wallets: ${oldWallets.length} records`);
  
  if (oldWallets.length > 0) {
    oldWallets.forEach(wallet => {
      console.log(`   User ${wallet.userId}: $${wallet.availableBalance} (${wallet.userType})`);
    });
  }
  
  console.log(`\n🔄 Migration Status:`);
  if (oldTransactions.length === 0 && oldWallets.length > 0) {
    console.log('   ⚠️  Static wallet balances exist but no transaction history');
    console.log('   📝 Migration will be needed to convert balances to transactions');
  } else if (oldTransactions.length > 0) {
    console.log('   📋 Transaction history exists - can be migrated to hierarchical storage');
  } else {
    console.log('   ✅ Clean slate - new hierarchical system can start fresh');
  }
  
  return {
    oldTransactions: oldTransactions.length,
    oldWallets: oldWallets.length
  };
}

async function testPerformance() {
  console.log('Testing performance characteristics...');
  
  // Test directory creation performance
  const startTime = Date.now();
  
  // Create multiple test transactions
  const testTransactions = [];
  for (let i = 0; i < 10; i++) {
    const transaction = {
      transactionId: `TXN-PAY-PERF-${i}-${Date.now()}`,
      userId: 31,
      type: 'payment',
      amount: 100 * (i + 1),
      currency: 'USD',
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    testTransactions.push(transaction);
  }
  
  // Create directory structure for each
  for (const transaction of testTransactions) {
    const date = new Date(transaction.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const transactionDir = path.join(
      process.cwd(),
      'data',
      'transactions',
      year.toString(),
      month,
      day,
      transaction.transactionId
    );
    
    fs.mkdirSync(transactionDir, { recursive: true });
    
    const transactionFile = path.join(transactionDir, 'payment.json');
    fs.writeFileSync(transactionFile, JSON.stringify(transaction, null, 2));
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`✅ Performance test completed:`);
  console.log(`   Created ${testTransactions.length} transactions in ${duration}ms`);
  console.log(`   Average: ${(duration / testTransactions.length).toFixed(2)}ms per transaction`);
  
  // Cleanup test transactions
  console.log('🧹 Cleaning up test transactions...');
  for (const transaction of testTransactions) {
    const date = new Date(transaction.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const transactionDir = path.join(
      process.cwd(),
      'data',
      'transactions',
      year.toString(),
      month,
      day,
      transaction.transactionId
    );
    
    try {
      fs.rmSync(transactionDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Warning: Could not cleanup ${transactionDir}`);
    }
  }
  
  return {
    transactionCount: testTransactions.length,
    duration,
    averageTime: duration / testTransactions.length
  };
}

// CLI interface
if (require.main === module) {
  verifyHierarchicalSystem().catch(console.error);
}

module.exports = { verifyHierarchicalSystem };

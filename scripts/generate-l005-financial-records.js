#!/usr/bin/env node

/**
 * Generate Missing Financial Records for Project L-005
 * 
 * This script generates the missing upfront invoice and transaction records
 * for project L-005 to complete the financial audit trail.
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const PROJECT_ID = 'L-005';
const UPFRONT_AMOUNT = 480; // 12% of $4000
const COMMISSIONER_ID = 32;
const FREELANCER_ID = 31;
const ORGANIZATION_ID = 1;

class L005FinancialRecordsGenerator {
  constructor() {
    this.results = [];
    this.startTime = new Date();
  }

  async generateFinancialRecords() {
    console.log('💰 Generating Missing Financial Records for Project L-005...\n');
    
    try {
      // Step 1: Generate upfront invoice
      await this.generateUpfrontInvoice();
      
      // Step 2: Generate transaction record
      await this.generateTransactionRecord();
      
      // Step 3: Update freelancer wallet
      await this.updateFreelancerWallet();
      
      // Step 4: Verify financial consistency
      await this.verifyFinancialConsistency();
      
      // Step 5: Generate summary
      this.generateSummary();
      
    } catch (error) {
      console.error('❌ Failed to generate financial records:', error.message);
      this.results.push({
        step: 'Error',
        status: 'FAILED',
        details: error.message
      });
      this.generateSummary();
    }
  }

  async generateUpfrontInvoice() {
    console.log('📄 Step 1: Generating Upfront Invoice...');
    
    try {
      const invoiceNumber = `COMP-UPF-${PROJECT_ID}-${Date.now()}`;
      const now = new Date().toISOString();
      const originalDate = '2025-08-18T22:44:51.266Z'; // L-005 creation date
      
      const upfrontInvoice = {
        invoiceNumber,
        invoiceType: 'completion_upfront',
        method: 'completion',
        projectId: PROJECT_ID,
        freelancerId: FREELANCER_ID,
        commissionerId: COMMISSIONER_ID,
        organizationId: ORGANIZATION_ID,
        totalAmount: UPFRONT_AMOUNT,
        percentage: 12,
        status: 'paid',
        currency: 'USD',
        description: 'Upfront payment (12% of total budget) for Social Media Campaign Marketing project',
        lineItems: [
          {
            description: 'Upfront Payment (12% of $4,000)',
            amount: UPFRONT_AMOUNT,
            quantity: 1
          }
        ],
        billTo: {
          name: 'TechCorp',
          organizationId: ORGANIZATION_ID,
          commissionerId: COMMISSIONER_ID
        },
        billFrom: {
          name: 'Sarah Johnson',
          freelancerId: FREELANCER_ID
        },
        generatedAt: originalDate, // Backdate to original project creation
        sentAt: originalDate,
        paidAt: now, // Mark as paid now (retroactively)
        dueDate: originalDate, // Upfront payments are due immediately
        createdAt: originalDate,
        updatedAt: now,
        retroactive: {
          generated: true,
          reason: 'Missing upfront invoice generated retroactively',
          originalProjectCreation: originalDate,
          retroactiveGeneration: now
        }
      };
      
      // Save to invoices file
      await this.saveInvoice(upfrontInvoice);
      
      console.log(`  ✅ Generated upfront invoice: ${invoiceNumber}`);
      console.log(`  💰 Amount: $${UPFRONT_AMOUNT}`);
      console.log(`  📅 Backdated to: ${originalDate}`);
      
      this.results.push({
        step: 'Upfront Invoice',
        status: 'PASSED',
        details: {
          invoiceNumber,
          amount: UPFRONT_AMOUNT,
          status: 'paid',
          backdated: true
        }
      });
      
    } catch (error) {
      console.error('  ❌ Failed to generate upfront invoice:', error.message);
      throw new Error(`Upfront invoice generation failed: ${error.message}`);
    }
    
    console.log('');
  }

  async generateTransactionRecord() {
    console.log('💳 Step 2: Generating Transaction Record...');
    
    try {
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const originalDate = '2025-08-18T22:44:51.266Z';
      
      const transaction = {
        transactionId,
        type: 'completion_upfront_payment',
        projectId: PROJECT_ID,
        invoiceNumber: `COMP-UPF-${PROJECT_ID}-${Date.now()}`,
        amount: UPFRONT_AMOUNT,
        currency: 'USD',
        fromUserId: COMMISSIONER_ID,
        toUserId: FREELANCER_ID,
        fromUserType: 'commissioner',
        toUserType: 'freelancer',
        status: 'completed',
        paymentMethod: 'mock_payment', // Using mock payment for retroactive generation
        description: `Upfront payment for ${PROJECT_ID} - Social Media Campaign Marketing`,
        metadata: {
          projectId: PROJECT_ID,
          projectTitle: 'Social Media Campaign Marketing',
          invoicingMethod: 'completion',
          paymentType: 'upfront',
          percentage: 12,
          totalProjectBudget: 4000,
          remainingBudget: 3520,
          retroactive: true,
          originalProjectCreation: originalDate
        },
        fees: {
          platformFee: UPFRONT_AMOUNT * 0.03, // 3% platform fee
          processingFee: 2.50, // Fixed processing fee
          totalFees: (UPFRONT_AMOUNT * 0.03) + 2.50
        },
        netAmount: UPFRONT_AMOUNT - ((UPFRONT_AMOUNT * 0.03) + 2.50),
        createdAt: originalDate, // Backdate to project creation
        processedAt: now,
        completedAt: now
      };
      
      // Save to transactions file
      await this.saveTransaction(transaction);
      
      console.log(`  ✅ Generated transaction: ${transactionId}`);
      console.log(`  💰 Amount: $${UPFRONT_AMOUNT}`);
      console.log(`  💸 Net Amount: $${transaction.netAmount.toFixed(2)}`);
      console.log(`  📅 Backdated to: ${originalDate}`);
      
      this.results.push({
        step: 'Transaction Record',
        status: 'PASSED',
        details: {
          transactionId,
          amount: UPFRONT_AMOUNT,
          netAmount: transaction.netAmount,
          status: 'completed',
          backdated: true
        }
      });
      
    } catch (error) {
      console.error('  ❌ Failed to generate transaction record:', error.message);
      throw new Error(`Transaction generation failed: ${error.message}`);
    }
    
    console.log('');
  }

  async updateFreelancerWallet() {
    console.log('👛 Step 3: Updating Freelancer Wallet...');
    
    try {
      // Calculate net amount after fees
      const platformFee = UPFRONT_AMOUNT * 0.03;
      const processingFee = 2.50;
      const netAmount = UPFRONT_AMOUNT - platformFee - processingFee;
      
      // Read current wallet
      const walletPath = path.join(process.cwd(), 'data', 'wallets.json');
      let wallets = [];
      
      try {
        const walletsData = await fs.readFile(walletPath, 'utf8');
        wallets = JSON.parse(walletsData);
      } catch (e) {
        // File doesn't exist, start with empty array
      }
      
      // Find or create freelancer wallet
      let freelancerWallet = wallets.find(w => w.userId === FREELANCER_ID && w.userType === 'freelancer');
      
      if (!freelancerWallet) {
        freelancerWallet = {
          userId: FREELANCER_ID,
          userType: 'freelancer',
          balance: 0,
          currency: 'USD',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        wallets.push(freelancerWallet);
      }
      
      // Update balance
      const previousBalance = freelancerWallet.balance;
      freelancerWallet.balance += netAmount;
      freelancerWallet.updatedAt = new Date().toISOString();
      
      // Add transaction history entry
      if (!freelancerWallet.transactions) {
        freelancerWallet.transactions = [];
      }
      
      freelancerWallet.transactions.push({
        transactionId: `tx_${Date.now()}_wallet`,
        type: 'credit',
        amount: netAmount,
        description: `Upfront payment for ${PROJECT_ID}`,
        projectId: PROJECT_ID,
        createdAt: new Date().toISOString(),
        retroactive: true
      });
      
      // Save updated wallets
      await fs.writeFile(walletPath, JSON.stringify(wallets, null, 2));
      
      console.log(`  ✅ Updated freelancer wallet (ID: ${FREELANCER_ID})`);
      console.log(`  💰 Previous Balance: $${previousBalance.toFixed(2)}`);
      console.log(`  💰 Credit Amount: $${netAmount.toFixed(2)}`);
      console.log(`  💰 New Balance: $${freelancerWallet.balance.toFixed(2)}`);
      
      this.results.push({
        step: 'Wallet Update',
        status: 'PASSED',
        details: {
          freelancerId: FREELANCER_ID,
          previousBalance,
          creditAmount: netAmount,
          newBalance: freelancerWallet.balance
        }
      });
      
    } catch (error) {
      console.error('  ❌ Failed to update freelancer wallet:', error.message);
      throw new Error(`Wallet update failed: ${error.message}`);
    }
    
    console.log('');
  }

  async verifyFinancialConsistency() {
    console.log('🔍 Step 4: Verifying Financial Consistency...');
    
    try {
      // Check that all financial records are consistent
      const checks = {
        projectHasUpfrontFlag: false,
        invoiceExists: false,
        transactionExists: false,
        walletUpdated: false
      };
      
      // Check project
      const projectPath = path.join(process.cwd(), 'data', 'projects', '2025', '08', '18', 'L-005', 'project.json');
      const projectData = await fs.readFile(projectPath, 'utf8');
      const project = JSON.parse(projectData);
      
      checks.projectHasUpfrontFlag = project.upfrontPaid === true && project.upfrontAmount === UPFRONT_AMOUNT;
      
      // Check invoice exists
      try {
        const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
        const invoicesData = await fs.readFile(invoicesPath, 'utf8');
        const invoices = JSON.parse(invoicesData);
        
        const upfrontInvoice = invoices.find(inv => 
          inv.projectId === PROJECT_ID && 
          inv.invoiceType === 'completion_upfront' &&
          inv.totalAmount === UPFRONT_AMOUNT
        );
        
        checks.invoiceExists = !!upfrontInvoice;
      } catch (e) {
        checks.invoiceExists = false;
      }
      
      // Check transaction exists
      try {
        const transactionsPath = path.join(process.cwd(), 'data', 'transactions.json');
        const transactionsData = await fs.readFile(transactionsPath, 'utf8');
        const transactions = JSON.parse(transactionsData);
        
        const upfrontTransaction = transactions.find(tx => 
          tx.projectId === PROJECT_ID && 
          tx.type === 'completion_upfront_payment' &&
          tx.amount === UPFRONT_AMOUNT
        );
        
        checks.transactionExists = !!upfrontTransaction;
      } catch (e) {
        checks.transactionExists = false;
      }
      
      // Check wallet updated
      try {
        const walletsPath = path.join(process.cwd(), 'data', 'wallets.json');
        const walletsData = await fs.readFile(walletsPath, 'utf8');
        const wallets = JSON.parse(walletsData);
        
        const freelancerWallet = wallets.find(w => w.userId === FREELANCER_ID);
        checks.walletUpdated = freelancerWallet && freelancerWallet.balance > 0;
      } catch (e) {
        checks.walletUpdated = false;
      }
      
      const allChecksPass = Object.values(checks).every(check => check === true);
      
      console.log(`  ${checks.projectHasUpfrontFlag ? '✅' : '❌'} Project has upfront payment flag`);
      console.log(`  ${checks.invoiceExists ? '✅' : '❌'} Upfront invoice exists`);
      console.log(`  ${checks.transactionExists ? '✅' : '❌'} Transaction record exists`);
      console.log(`  ${checks.walletUpdated ? '✅' : '❌'} Freelancer wallet updated`);
      
      this.results.push({
        step: 'Financial Consistency',
        status: allChecksPass ? 'PASSED' : 'FAILED',
        details: checks
      });
      
    } catch (error) {
      console.error('  ❌ Financial consistency check failed:', error.message);
      this.results.push({
        step: 'Financial Consistency',
        status: 'FAILED',
        details: error.message
      });
    }
    
    console.log('');
  }

  async saveInvoice(invoice) {
    try {
      const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
      let invoices = [];
      
      try {
        const invoicesData = await fs.readFile(invoicesPath, 'utf8');
        invoices = JSON.parse(invoicesData);
      } catch (e) {
        // File doesn't exist, start with empty array
      }
      
      invoices.push(invoice);
      await fs.writeFile(invoicesPath, JSON.stringify(invoices, null, 2));
      
    } catch (error) {
      throw new Error(`Failed to save invoice: ${error.message}`);
    }
  }

  async saveTransaction(transaction) {
    try {
      const transactionsPath = path.join(process.cwd(), 'data', 'transactions.json');
      let transactions = [];
      
      try {
        const transactionsData = await fs.readFile(transactionsPath, 'utf8');
        transactions = JSON.parse(transactionsData);
      } catch (e) {
        // File doesn't exist, start with empty array
      }
      
      transactions.push(transaction);
      await fs.writeFile(transactionsPath, JSON.stringify(transactions, null, 2));
      
    } catch (error) {
      throw new Error(`Failed to save transaction: ${error.message}`);
    }
  }

  generateSummary() {
    const duration = new Date() - this.startTime;
    const passedSteps = this.results.filter(r => r.status === 'PASSED').length;
    const failedSteps = this.results.filter(r => r.status === 'FAILED').length;
    
    console.log('📊 FINANCIAL RECORDS SUMMARY');
    console.log('=============================');
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    console.log(`Steps Passed: ${passedSteps}/${this.results.length}`);
    console.log(`Steps Failed: ${failedSteps}/${this.results.length}`);
    console.log('');
    
    for (const result of this.results) {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${result.step}`);
    }
    
    console.log('');
    
    if (failedSteps === 0) {
      console.log('🎉 SUCCESS!');
      console.log('✅ Complete financial audit trail generated for L-005');
      console.log('✅ Upfront invoice created and marked as paid');
      console.log('✅ Transaction record generated with proper fees');
      console.log('✅ Freelancer wallet credited with net amount');
      console.log('✅ All financial records are consistent');
      console.log('');
      console.log('💰 Financial Summary:');
      console.log(`  - Upfront Amount: $${UPFRONT_AMOUNT}`);
      console.log(`  - Platform Fee (3%): $${(UPFRONT_AMOUNT * 0.03).toFixed(2)}`);
      console.log(`  - Processing Fee: $2.50`);
      console.log(`  - Net to Freelancer: $${(UPFRONT_AMOUNT - (UPFRONT_AMOUNT * 0.03) - 2.50).toFixed(2)}`);
    } else {
      console.log('⚠️  SOME STEPS FAILED');
      console.log('Please review the errors above and try again');
    }
  }
}

// Run the generator
if (require.main === module) {
  const generator = new L005FinancialRecordsGenerator();
  generator.generateFinancialRecords().catch(console.error);
}

module.exports = L005FinancialRecordsGenerator;

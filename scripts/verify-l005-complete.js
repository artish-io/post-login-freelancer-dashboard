#!/usr/bin/env node

/**
 * Final Verification: L-005 Complete Implementation
 * 
 * This script performs a final verification that L-005 has been completely
 * fixed with all missing notifications, invoices, and transaction data.
 */

const fs = require('fs').promises;
const path = require('path');

class L005CompleteVerifier {
  constructor() {
    this.checks = [];
    this.startTime = new Date();
  }

  async verify() {
    console.log('🔍 Final Verification: L-005 Complete Implementation...\n');
    
    try {
      await this.checkProjectStatus();
      await this.checkNotifications();
      await this.checkInvoice();
      await this.checkTransaction();
      await this.checkWallet();
      await this.checkFinancialConsistency();
      
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
    }
  }

  async checkProjectStatus() {
    console.log('📋 Checking Project Status...');
    
    try {
      const projectPath = path.join(process.cwd(), 'data', 'projects', '2025', '08', '18', 'L-005', 'project.json');
      const projectData = await fs.readFile(projectPath, 'utf8');
      const project = JSON.parse(projectData);
      
      const checks = {
        hasCompletionMethod: project.invoicingMethod === 'completion',
        hasUpfrontPaid: project.upfrontPaid === true,
        hasUpfrontAmount: project.upfrontAmount === 480,
        hasRemainingBudget: project.remainingBudget === 3520,
        hasManualInvoiceAmount: project.manualInvoiceAmount === 880,
        hasCompletionPayments: !!project.completionPayments,
        hasRetroactiveFlag: !!project.retroactiveActivation
      };
      
      const allPass = Object.values(checks).every(check => check === true);
      
      console.log(`  ${checks.hasCompletionMethod ? '✅' : '❌'} Invoicing method: completion`);
      console.log(`  ${checks.hasUpfrontPaid ? '✅' : '❌'} Upfront paid: true`);
      console.log(`  ${checks.hasUpfrontAmount ? '✅' : '❌'} Upfront amount: $480`);
      console.log(`  ${checks.hasRemainingBudget ? '✅' : '❌'} Remaining budget: $3,520`);
      console.log(`  ${checks.hasManualInvoiceAmount ? '✅' : '❌'} Manual invoice amount: $880`);
      console.log(`  ${checks.hasCompletionPayments ? '✅' : '❌'} Completion payments object exists`);
      console.log(`  ${checks.hasRetroactiveFlag ? '✅' : '❌'} Retroactive activation flag exists`);
      
      this.checks.push({
        category: 'Project Status',
        status: allPass ? 'PASS' : 'FAIL',
        details: checks
      });
      
    } catch (error) {
      console.error('  ❌ Project check failed:', error.message);
      this.checks.push({
        category: 'Project Status',
        status: 'FAIL',
        error: error.message
      });
    }
    
    console.log('');
  }

  async checkNotifications() {
    console.log('🔔 Checking Notifications...');
    
    try {
      // Check completion notifications
      const notificationsPath = path.join(process.cwd(), 'data', 'completion-notifications.json');
      const notificationsData = await fs.readFile(notificationsPath, 'utf8');
      const notifications = JSON.parse(notificationsData);
      
      const l005Notifications = notifications.filter(n => n.projectId === 'L-005');
      const projectActivation = l005Notifications.find(n => n.type === 'completion.project_activated');
      const upfrontPayment = l005Notifications.find(n => n.type === 'completion.upfront_payment');
      
      // Check event log
      const eventLogPath = path.join(process.cwd(), 'data', 'completion-event-log.json');
      const eventLogData = await fs.readFile(eventLogPath, 'utf8');
      const events = JSON.parse(eventLogData);
      
      const l005Events = events.filter(e => e.projectId === 'L-005');
      
      const checks = {
        notificationFileExists: true,
        eventLogFileExists: true,
        hasProjectActivationNotification: !!projectActivation,
        hasUpfrontPaymentNotification: !!upfrontPayment,
        hasCorrectNotificationCount: l005Notifications.length === 2,
        hasCorrectEventCount: l005Events.length === 2,
        notificationsHaveRetroactiveFlag: l005Notifications.every(n => n.context?.retroactive === true),
        eventsHaveRetroactiveFlag: l005Events.every(e => e.context?.retroactive === true)
      };
      
      const allPass = Object.values(checks).every(check => check === true);
      
      console.log(`  ${checks.notificationFileExists ? '✅' : '❌'} Completion notifications file exists`);
      console.log(`  ${checks.eventLogFileExists ? '✅' : '❌'} Completion event log file exists`);
      console.log(`  ${checks.hasProjectActivationNotification ? '✅' : '❌'} Project activation notification exists`);
      console.log(`  ${checks.hasUpfrontPaymentNotification ? '✅' : '❌'} Upfront payment notification exists`);
      console.log(`  ${checks.hasCorrectNotificationCount ? '✅' : '❌'} Correct notification count (2)`);
      console.log(`  ${checks.hasCorrectEventCount ? '✅' : '❌'} Correct event count (2)`);
      console.log(`  ${checks.notificationsHaveRetroactiveFlag ? '✅' : '❌'} Notifications have retroactive flag`);
      console.log(`  ${checks.eventsHaveRetroactiveFlag ? '✅' : '❌'} Events have retroactive flag`);
      
      this.checks.push({
        category: 'Notifications',
        status: allPass ? 'PASS' : 'FAIL',
        details: checks
      });
      
    } catch (error) {
      console.error('  ❌ Notifications check failed:', error.message);
      this.checks.push({
        category: 'Notifications',
        status: 'FAIL',
        error: error.message
      });
    }
    
    console.log('');
  }

  async checkInvoice() {
    console.log('📄 Checking Invoice...');
    
    try {
      const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
      const invoicesData = await fs.readFile(invoicesPath, 'utf8');
      const invoices = JSON.parse(invoicesData);
      
      const l005Invoice = invoices.find(inv => inv.projectId === 'L-005' && inv.invoiceType === 'completion_upfront');
      
      const checks = {
        invoiceExists: !!l005Invoice,
        hasCorrectType: l005Invoice?.invoiceType === 'completion_upfront',
        hasCorrectMethod: l005Invoice?.method === 'completion',
        hasCorrectAmount: l005Invoice?.totalAmount === 480,
        hasCorrectPercentage: l005Invoice?.percentage === 12,
        hasCorrectStatus: l005Invoice?.status === 'paid',
        hasRetroactiveFlag: !!l005Invoice?.retroactive,
        hasCorrectFreelancer: l005Invoice?.freelancerId === 31,
        hasCorrectCommissioner: l005Invoice?.commissionerId === 32
      };
      
      const allPass = Object.values(checks).every(check => check === true);
      
      console.log(`  ${checks.invoiceExists ? '✅' : '❌'} L-005 upfront invoice exists`);
      console.log(`  ${checks.hasCorrectType ? '✅' : '❌'} Invoice type: completion_upfront`);
      console.log(`  ${checks.hasCorrectMethod ? '✅' : '❌'} Invoice method: completion`);
      console.log(`  ${checks.hasCorrectAmount ? '✅' : '❌'} Invoice amount: $480`);
      console.log(`  ${checks.hasCorrectPercentage ? '✅' : '❌'} Invoice percentage: 12%`);
      console.log(`  ${checks.hasCorrectStatus ? '✅' : '❌'} Invoice status: paid`);
      console.log(`  ${checks.hasRetroactiveFlag ? '✅' : '❌'} Invoice has retroactive flag`);
      console.log(`  ${checks.hasCorrectFreelancer ? '✅' : '❌'} Correct freelancer ID (31)`);
      console.log(`  ${checks.hasCorrectCommissioner ? '✅' : '❌'} Correct commissioner ID (32)`);
      
      this.checks.push({
        category: 'Invoice',
        status: allPass ? 'PASS' : 'FAIL',
        details: checks
      });
      
    } catch (error) {
      console.error('  ❌ Invoice check failed:', error.message);
      this.checks.push({
        category: 'Invoice',
        status: 'FAIL',
        error: error.message
      });
    }
    
    console.log('');
  }

  async checkTransaction() {
    console.log('💳 Checking Transaction...');
    
    try {
      const transactionsPath = path.join(process.cwd(), 'data', 'transactions.json');
      const transactionsData = await fs.readFile(transactionsPath, 'utf8');
      const transactions = JSON.parse(transactionsData);
      
      const l005Transaction = transactions.find(tx => tx.projectId === 'L-005' && tx.type === 'completion_upfront_payment');
      
      const checks = {
        transactionExists: !!l005Transaction,
        hasCorrectType: l005Transaction?.type === 'completion_upfront_payment',
        hasCorrectAmount: l005Transaction?.amount === 480,
        hasCorrectStatus: l005Transaction?.status === 'completed',
        hasCorrectFromUser: l005Transaction?.fromUserId === 32,
        hasCorrectToUser: l005Transaction?.toUserId === 31,
        hasCorrectNetAmount: Math.abs(l005Transaction?.netAmount - 463.10) < 0.01,
        hasFees: !!l005Transaction?.fees,
        hasRetroactiveFlag: l005Transaction?.metadata?.retroactive === true
      };
      
      const allPass = Object.values(checks).every(check => check === true);
      
      console.log(`  ${checks.transactionExists ? '✅' : '❌'} L-005 upfront transaction exists`);
      console.log(`  ${checks.hasCorrectType ? '✅' : '❌'} Transaction type: completion_upfront_payment`);
      console.log(`  ${checks.hasCorrectAmount ? '✅' : '❌'} Transaction amount: $480`);
      console.log(`  ${checks.hasCorrectStatus ? '✅' : '❌'} Transaction status: completed`);
      console.log(`  ${checks.hasCorrectFromUser ? '✅' : '❌'} From user: 32 (commissioner)`);
      console.log(`  ${checks.hasCorrectToUser ? '✅' : '❌'} To user: 31 (freelancer)`);
      console.log(`  ${checks.hasCorrectNetAmount ? '✅' : '❌'} Net amount: $463.10`);
      console.log(`  ${checks.hasFees ? '✅' : '❌'} Transaction has fees`);
      console.log(`  ${checks.hasRetroactiveFlag ? '✅' : '❌'} Transaction has retroactive flag`);
      
      this.checks.push({
        category: 'Transaction',
        status: allPass ? 'PASS' : 'FAIL',
        details: checks
      });
      
    } catch (error) {
      console.error('  ❌ Transaction check failed:', error.message);
      this.checks.push({
        category: 'Transaction',
        status: 'FAIL',
        error: error.message
      });
    }
    
    console.log('');
  }

  async checkWallet() {
    console.log('👛 Checking Wallet...');
    
    try {
      const walletsPath = path.join(process.cwd(), 'data', 'wallets.json');
      const walletsData = await fs.readFile(walletsPath, 'utf8');
      const wallets = JSON.parse(walletsData);
      
      const freelancerWallet = wallets.find(w => w.userId === 31 && w.userType === 'freelancer');
      const l005Transaction = freelancerWallet?.transactions?.find(tx => tx.projectId === 'L-005');
      
      const checks = {
        walletExists: !!freelancerWallet,
        hasPositiveBalance: freelancerWallet?.balance > 0,
        hasCorrectBalance: Math.abs(freelancerWallet?.balance - 463.10) < 0.01,
        hasTransactionHistory: !!freelancerWallet?.transactions,
        hasL005Transaction: !!l005Transaction,
        l005TransactionHasRetroactiveFlag: l005Transaction?.retroactive === true
      };
      
      const allPass = Object.values(checks).every(check => check === true);
      
      console.log(`  ${checks.walletExists ? '✅' : '❌'} Freelancer wallet exists`);
      console.log(`  ${checks.hasPositiveBalance ? '✅' : '❌'} Wallet has positive balance`);
      console.log(`  ${checks.hasCorrectBalance ? '✅' : '❌'} Wallet balance: $463.10`);
      console.log(`  ${checks.hasTransactionHistory ? '✅' : '❌'} Wallet has transaction history`);
      console.log(`  ${checks.hasL005Transaction ? '✅' : '❌'} Wallet has L-005 transaction`);
      console.log(`  ${checks.l005TransactionHasRetroactiveFlag ? '✅' : '❌'} L-005 transaction has retroactive flag`);
      
      this.checks.push({
        category: 'Wallet',
        status: allPass ? 'PASS' : 'FAIL',
        details: checks
      });
      
    } catch (error) {
      console.error('  ❌ Wallet check failed:', error.message);
      this.checks.push({
        category: 'Wallet',
        status: 'FAIL',
        error: error.message
      });
    }
    
    console.log('');
  }

  async checkFinancialConsistency() {
    console.log('🔍 Checking Financial Consistency...');
    
    try {
      // Cross-reference all financial records
      const projectPath = path.join(process.cwd(), 'data', 'projects', '2025', '08', '18', 'L-005', 'project.json');
      const projectData = await fs.readFile(projectPath, 'utf8');
      const project = JSON.parse(projectData);
      
      const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
      const invoicesData = await fs.readFile(invoicesPath, 'utf8');
      const invoices = JSON.parse(invoicesData);
      const invoice = invoices.find(inv => inv.projectId === 'L-005');
      
      const transactionsPath = path.join(process.cwd(), 'data', 'transactions.json');
      const transactionsData = await fs.readFile(transactionsPath, 'utf8');
      const transactions = JSON.parse(transactionsData);
      const transaction = transactions.find(tx => tx.projectId === 'L-005');
      
      const checks = {
        projectUpfrontMatchesInvoice: project.upfrontAmount === invoice?.totalAmount,
        invoiceAmountMatchesTransaction: invoice?.totalAmount === transaction?.amount,
        projectBudgetConsistent: project.totalBudget === 4000,
        remainingBudgetCorrect: project.remainingBudget === 3520,
        manualInvoiceAmountCorrect: project.manualInvoiceAmount === 880,
        allRecordsHaveL005: [project, invoice, transaction].every(record => 
          record && (record.projectId === 'L-005' || record.id === 'L-005'))
      };
      
      const allPass = Object.values(checks).every(check => check === true);
      
      console.log(`  ${checks.projectUpfrontMatchesInvoice ? '✅' : '❌'} Project upfront matches invoice amount`);
      console.log(`  ${checks.invoiceAmountMatchesTransaction ? '✅' : '❌'} Invoice amount matches transaction amount`);
      console.log(`  ${checks.projectBudgetConsistent ? '✅' : '❌'} Project budget consistent ($4,000)`);
      console.log(`  ${checks.remainingBudgetCorrect ? '✅' : '❌'} Remaining budget correct ($3,520)`);
      console.log(`  ${checks.manualInvoiceAmountCorrect ? '✅' : '❌'} Manual invoice amount correct ($880)`);
      console.log(`  ${checks.allRecordsHaveL005 ? '✅' : '❌'} All records reference L-005`);
      
      this.checks.push({
        category: 'Financial Consistency',
        status: allPass ? 'PASS' : 'FAIL',
        details: checks
      });
      
    } catch (error) {
      console.error('  ❌ Financial consistency check failed:', error.message);
      this.checks.push({
        category: 'Financial Consistency',
        status: 'FAIL',
        error: error.message
      });
    }
    
    console.log('');
  }

  generateFinalReport() {
    const duration = new Date() - this.startTime;
    const passedChecks = this.checks.filter(c => c.status === 'PASS').length;
    const failedChecks = this.checks.filter(c => c.status === 'FAIL').length;
    
    console.log('📊 FINAL VERIFICATION REPORT');
    console.log('=============================');
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    console.log(`Checks Passed: ${passedChecks}/${this.checks.length}`);
    console.log(`Checks Failed: ${failedChecks}/${this.checks.length}`);
    console.log('');
    
    for (const check of this.checks) {
      const status = check.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${check.category}`);
    }
    
    console.log('');
    
    if (failedChecks === 0) {
      console.log('🎉 VERIFICATION COMPLETE - ALL CHECKS PASSED!');
      console.log('');
      console.log('✅ Project L-005 is fully operational with:');
      console.log('  - Complete completion-based invoicing setup');
      console.log('  - Proper upfront payment ($480) executed and recorded');
      console.log('  - All required notifications generated');
      console.log('  - Complete financial audit trail');
      console.log('  - Freelancer wallet properly credited ($463.10)');
      console.log('  - All data properly flagged as retroactive');
      console.log('');
      console.log('🚀 L-005 is ready for normal completion workflow:');
      console.log('  - Task approvals will work normally');
      console.log('  - Manual invoicing available ($880 per task)');
      console.log('  - Final payment will calculate remaining budget');
      console.log('  - All future notifications will be generated normally');
    } else {
      console.log('⚠️  VERIFICATION INCOMPLETE');
      console.log(`❌ ${failedChecks} checks failed`);
      console.log('Please review the failed checks above');
    }
  }
}

// Run verification
if (require.main === module) {
  const verifier = new L005CompleteVerifier();
  verifier.verify().catch(console.error);
}

module.exports = L005CompleteVerifier;

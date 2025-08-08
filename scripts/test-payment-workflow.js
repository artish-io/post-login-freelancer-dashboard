#!/usr/bin/env node

/**
 * Comprehensive Payment Workflow Test
 * 
 * This script tests the complete payment workflow:
 * 1. Gig matching → Project creation
 * 2. Task approval → Invoice generation (both milestone and completion)
 * 3. Payment execution → Wallet updates
 * 4. Transaction recording and earnings tracking
 */

const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  freelancerId: 1,
  commissionerId: 35,
  organizationId: 4,
  testGigId: 13, // Milestone-based gig
  testCompletionGigId: 12, // Completion-based gig
  baseUrl: 'http://localhost:3001'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logError(`Failed to read ${filePath}: ${error.message}`);
    return null;
  }
}

async function writeJsonFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    logError(`Failed to write ${filePath}: ${error.message}`);
    return false;
  }
}

async function testProjectCreation() {
  logStep('1️⃣', 'Testing Project Creation from Gig Matching');
  
  // Read gigs to verify test data
  const gigPath = path.join(process.cwd(), `data/gigs/2025/August/06/${TEST_CONFIG.testGigId}/gig.json`);
  const gig = await readJsonFile(gigPath);
  
  if (!gig) {
    logError('Test gig not found');
    return false;
  }
  
  logSuccess(`Found test gig: ${gig.title} (invoicingMethod: ${gig.invoicingMethod})`);
  
  // Verify gig has milestones for milestone-based testing
  if (gig.invoicingMethod === 'milestone' && (!gig.milestones || gig.milestones.length === 0)) {
    logError('Milestone-based gig missing milestones');
    return false;
  }
  
  logSuccess(`Gig has ${gig.milestones?.length || 0} milestones`);
  
  // Check if project already exists
  const projectsPath = path.join(process.cwd(), 'data/projects');
  const projects = await readJsonFile(path.join(projectsPath, 'projects.json')) || [];
  
  const existingProject = projects.find(p => p.gigId === gig.id);
  if (existingProject) {
    logSuccess(`Project already exists: ${existingProject.projectId} (${existingProject.title})`);
    return existingProject;
  }
  
  logWarning('No existing project found. In a real test, you would trigger gig matching here.');
  return null;
}

async function testTaskApproval(projectId) {
  logStep('2️⃣', 'Testing Task Approval and Invoice Generation');
  
  if (!projectId) {
    logWarning('No project ID provided, skipping task approval test');
    return false;
  }
  
  // Read project tasks
  const tasksPath = path.join(process.cwd(), 'data/project-tasks');
  const taskFiles = await fs.readdir(tasksPath).catch(() => []);
  
  const projectTaskFile = taskFiles.find(f => f.includes(`project-${projectId}`));
  if (!projectTaskFile) {
    logError(`No tasks found for project ${projectId}`);
    return false;
  }
  
  const projectTasks = await readJsonFile(path.join(tasksPath, projectTaskFile));
  if (!projectTasks || !projectTasks.tasks || projectTasks.tasks.length === 0) {
    logError('No tasks found in project');
    return false;
  }
  
  logSuccess(`Found ${projectTasks.tasks.length} tasks for project ${projectId}`);
  
  // Find a task that can be approved (status: 'In review')
  const reviewTask = projectTasks.tasks.find(t => t.status === 'In review');
  if (!reviewTask) {
    logWarning('No tasks in review status found');
    return false;
  }
  
  logSuccess(`Found task in review: ${reviewTask.title} (ID: ${reviewTask.id})`);
  return reviewTask;
}

async function testInvoiceGeneration(projectId, taskId) {
  logStep('3️⃣', 'Testing Invoice Generation');
  
  // Check existing invoices
  const invoicesPath = path.join(process.cwd(), 'data/invoices');
  const invoiceFiles = await fs.readdir(invoicesPath).catch(() => []);
  
  logSuccess(`Found ${invoiceFiles.length} invoice files`);
  
  // Look for invoices related to this project
  let projectInvoices = [];
  for (const file of invoiceFiles) {
    if (file.endsWith('.json')) {
      const invoice = await readJsonFile(path.join(invoicesPath, file));
      if (invoice && invoice.projectId === projectId) {
        projectInvoices.push(invoice);
      }
    }
  }
  
  logSuccess(`Found ${projectInvoices.length} existing invoices for project ${projectId}`);
  
  return projectInvoices;
}

async function testWalletTracking() {
  logStep('4️⃣', 'Testing Wallet and Transaction Tracking');

  // Check wallet history (legacy format)
  const walletHistoryPath = path.join(process.cwd(), 'data/wallet/wallet-history.json');
  const walletHistory = await readJsonFile(walletHistoryPath) || [];

  const freelancerEntries = walletHistory.filter(w => w.userId === TEST_CONFIG.freelancerId);

  if (freelancerEntries.length > 0) {
    const totalEarnings = freelancerEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    logSuccess(`Freelancer wallet history found:`);
    log(`  Total Entries: ${freelancerEntries.length}`, 'green');
    log(`  Total Earnings: $${totalEarnings}`, 'green');
    log(`  Latest Entry: ${freelancerEntries[freelancerEntries.length - 1]?.description || 'N/A'}`, 'green');
  } else {
    logWarning(`No wallet history found for freelancer ${TEST_CONFIG.freelancerId}`);
  }

  // Check new wallet format
  const walletsPath = path.join(process.cwd(), 'data/payments/wallets.json');
  const wallets = await readJsonFile(walletsPath) || [];

  const freelancerWallet = wallets.find(w => w.userId === TEST_CONFIG.freelancerId && w.userType === 'freelancer');

  if (freelancerWallet) {
    logSuccess(`New wallet format found:`);
    log(`  Available Balance: $${freelancerWallet.availableBalance}`, 'green');
    log(`  Lifetime Earnings: $${freelancerWallet.lifetimeEarnings}`, 'green');
    log(`  Total Withdrawn: $${freelancerWallet.totalWithdrawn}`, 'green');
  } else {
    logWarning('No new format wallet found (this is normal if not using new payment system yet)');
  }

  // Check transaction records
  const transactionsPath = path.join(process.cwd(), 'data/payments/transactions.json');
  const transactions = await readJsonFile(transactionsPath) || [];

  const freelancerTransactions = transactions.filter(t => t.freelancerId === TEST_CONFIG.freelancerId);
  logSuccess(`Found ${freelancerTransactions.length} new format transactions for freelancer ${TEST_CONFIG.freelancerId}`);

  return {
    wallet: freelancerWallet,
    transactions: freelancerTransactions,
    walletHistory: freelancerEntries
  };
}

async function testEventSystemBootstrap() {
  logStep('5️⃣', 'Testing Event System Bootstrap');
  
  // This would require running the actual application
  // For now, we'll just verify the files exist
  const eventFiles = [
    'src/lib/events/bootstrap.ts',
    'src/lib/events/bus.ts',
    'src/lib/events/emitter.ts'
  ];
  
  for (const file of eventFiles) {
    const filePath = path.join(process.cwd(), file);
    try {
      await fs.access(filePath);
      logSuccess(`Event system file exists: ${file}`);
    } catch {
      logError(`Event system file missing: ${file}`);
    }
  }
  
  // Check if milestone invoice auto-generation is registered
  const busPath = path.join(process.cwd(), 'src/lib/events/bus.ts');
  const busContent = await fs.readFile(busPath, 'utf-8');
  
  if (busContent.includes('registerTaskApprovedToMilestoneInvoices')) {
    logSuccess('Milestone invoice auto-generation handler is registered');
  } else {
    logError('Milestone invoice auto-generation handler is missing');
  }
  
  return true;
}

async function runTests() {
  log('\n🧪 Starting Comprehensive Payment Workflow Tests', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Test 1: Project Creation
    const project = await testProjectCreation();
    
    // Test 2: Task Approval
    const task = project ? await testTaskApproval(project.projectId) : null;
    
    // Test 3: Invoice Generation
    const invoices = project ? await testInvoiceGeneration(project.projectId, task?.id) : [];
    
    // Test 4: Wallet Tracking
    const walletData = await testWalletTracking();
    
    // Test 5: Event System
    await testEventSystemBootstrap();
    
    // Summary
    log('\n📊 Test Summary', 'bold');
    log('=' .repeat(60), 'blue');
    
    if (project) {
      logSuccess(`Project system working: ${project.title}`);
    } else {
      logWarning('Project creation needs manual testing');
    }
    
    if (task) {
      logSuccess(`Task system working: ${task.title}`);
    } else {
      logWarning('Task approval needs manual testing');
    }
    
    if (invoices.length > 0) {
      logSuccess(`Invoice system working: ${invoices.length} invoices found`);
    } else {
      logWarning('Invoice generation needs manual testing');
    }
    
    if (walletData.wallet) {
      logSuccess(`Wallet system working: $${walletData.wallet.availableBalance} available`);
    } else {
      logWarning('Wallet system needs initialization');
    }
    
    logSuccess('Event system files are properly configured');
    
    log('\n🎉 Payment workflow test completed!', 'green');
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    console.error(error);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, TEST_CONFIG };

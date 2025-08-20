#!/usr/bin/env node

/**
 * Demo Script: Completion Payment Guard
 * 
 * This script demonstrates how the completion payment guard works by:
 * 1. Creating a completion-based gig
 * 2. Attempting to match without payment (should fail)
 * 3. Processing upfront payment
 * 4. Attempting to match with payment (should succeed)
 */

const fs = require('fs').promises;
const path = require('path');

// Demo configuration
const DEMO_CONFIG = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3001',
  testDataRoot: process.env.DATA_ROOT || './data'
};

// Demo data
const DEMO_GIG = {
  id: 9999,
  title: 'Demo Completion Gig',
  organizationId: 8000,
  commissionerId: 8002,
  category: 'Design',
  subcategory: 'Logo Design',
  tags: ['Design', 'Branding'],
  hourlyRateMin: 50,
  hourlyRateMax: 100,
  description: 'Demo gig for testing completion payment guard',
  deliveryTimeWeeks: 2,
  estimatedHours: 40,
  status: 'Available',
  toolsRequired: ['Figma', 'Illustrator'],
  executionMethod: 'completion',
  invoicingMethod: 'completion',
  startType: 'Immediately',
  lowerBudget: 1000,
  upperBudget: 2000,
  postedDate: new Date().toISOString().split('T')[0],
  notes: 'Demo gig with completion-based invoicing',
  isPublic: true,
  targetFreelancerId: null,
  isTargetedRequest: false
};

const DEMO_APPLICATION = {
  id: 9999,
  gigId: 9999,
  freelancerId: 31,
  pitch: 'Demo application for testing payment guard',
  sampleLinks: ['https://example.com/portfolio'],
  skills: ['Design', 'Branding'],
  tools: ['Figma', 'Illustrator'],
  submittedAt: new Date().toISOString(),
  status: 'pending'
};

class CompletionPaymentGuardDemo {
  constructor() {
    this.demoStartTime = new Date();
  }

  async runDemo() {
    console.log('🎭 Completion Payment Guard Demo\n');
    console.log('This demo shows how the payment guard prevents matching');
    console.log('without upfront payment for completion-based gigs.\n');
    
    try {
      // Step 1: Setup demo data
      console.log('📋 Step 1: Setting up demo data...');
      await this.setupDemoData();
      console.log('✅ Demo data created\n');
      
      // Step 2: Attempt matching without payment (should fail)
      console.log('🚫 Step 2: Attempting to match without payment...');
      const matchWithoutPayment = await this.attemptMatching();
      console.log(`Result: ${matchWithoutPayment.success ? 'UNEXPECTED SUCCESS' : 'EXPECTED FAILURE'}`);
      console.log(`Message: ${matchWithoutPayment.message}\n`);
      
      // Step 3: Process upfront payment
      console.log('💳 Step 3: Processing upfront payment...');
      const paymentResult = await this.processUpfrontPayment();
      console.log(`Payment: ${paymentResult.success ? 'SUCCESS' : 'FAILED'}\n`);
      
      // Step 4: Attempt matching with payment (should succeed)
      console.log('✅ Step 4: Attempting to match with payment...');
      const matchWithPayment = await this.attemptMatching();
      console.log(`Result: ${matchWithPayment.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`Message: ${matchWithPayment.message}\n`);
      
      // Step 5: Cleanup
      console.log('🧹 Step 5: Cleaning up demo data...');
      await this.cleanupDemoData();
      console.log('✅ Cleanup completed\n');
      
      console.log('🎉 Demo completed successfully!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      await this.cleanupDemoData();
    }
  }

  async setupDemoData() {
    // This would create demo gig and application data
    // For now, we'll just log what would be created
    console.log(`  - Creating demo gig: ${DEMO_GIG.title}`);
    console.log(`  - Creating demo application from freelancer ${DEMO_APPLICATION.freelancerId}`);
    console.log(`  - Gig invoicing method: ${DEMO_GIG.invoicingMethod}`);
    console.log(`  - Budget range: $${DEMO_GIG.lowerBudget} - $${DEMO_GIG.upperBudget}`);
  }

  async attemptMatching() {
    // This would call the actual API endpoint
    // For demo purposes, we'll simulate the response
    console.log('  - Calling /api/gigs/match-freelancer...');
    console.log('  - Guard checking for completion-based gig...');
    console.log('  - Guard verifying upfront payment...');
    
    // Simulate checking for upfront payment
    const hasUpfrontPayment = await this.checkUpfrontPayment();
    
    if (!hasUpfrontPayment) {
      return {
        success: false,
        message: 'Cannot match with freelancer: Upfront payment (12%) must be executed before project activation for completion-based gigs.',
        status: 402
      };
    } else {
      return {
        success: true,
        message: 'Successfully matched with freelancer! Project activated.',
        projectId: 'C-001'
      };
    }
  }

  async checkUpfrontPayment() {
    // This would check for actual upfront invoices and transactions
    // For demo, we'll simulate based on whether we've "processed" payment
    try {
      const demoPaymentFile = path.join(DEMO_CONFIG.testDataRoot, 'demo-upfront-payment.json');
      await fs.access(demoPaymentFile);
      return true;
    } catch {
      return false;
    }
  }

  async processUpfrontPayment() {
    // This would call the actual upfront payment API
    // For demo, we'll create a marker file
    console.log('  - Calculating upfront amount (12% of budget)...');
    const upfrontAmount = Math.round(DEMO_GIG.upperBudget * 0.12);
    console.log(`  - Upfront amount: $${upfrontAmount}`);
    
    console.log('  - Creating upfront invoice...');
    console.log('  - Processing payment...');
    console.log('  - Creating transaction record...');
    
    // Create demo payment marker
    const demoPaymentFile = path.join(DEMO_CONFIG.testDataRoot, 'demo-upfront-payment.json');
    const paymentData = {
      invoiceNumber: `COMP-UPF-C-001-${Date.now()}`,
      projectId: 'C-001',
      amount: upfrontAmount,
      status: 'paid',
      processedAt: new Date().toISOString()
    };
    
    try {
      await fs.mkdir(path.dirname(demoPaymentFile), { recursive: true });
      await fs.writeFile(demoPaymentFile, JSON.stringify(paymentData, null, 2));
      return { success: true, amount: upfrontAmount };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cleanupDemoData() {
    // Remove demo payment marker
    try {
      const demoPaymentFile = path.join(DEMO_CONFIG.testDataRoot, 'demo-upfront-payment.json');
      await fs.unlink(demoPaymentFile);
    } catch {
      // File might not exist, that's okay
    }
  }
}

// Run the demo
if (require.main === module) {
  const demo = new CompletionPaymentGuardDemo();
  demo.runDemo().catch(console.error);
}

module.exports = { CompletionPaymentGuardDemo };

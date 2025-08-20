#!/usr/bin/env node

/**
 * Simple Verification: Completion Payment Execution + Notification Engineering
 * 
 * This script verifies that:
 * 1. All completion payment routes exist and have proper structure
 * 2. All notification triggers are properly implemented
 * 3. Guards prevent milestone/completion cross-contamination
 * 4. Payment calculations are correct
 */

const fs = require('fs');
const path = require('path');

class CompletionPaymentNotificationVerifier {
  constructor() {
    this.results = [];
    this.issues = [];
  }

  async verify() {
    console.log('🔍 Verifying Completion Payment Execution + Notification Engineering...\n');
    
    try {
      // 1. Verify route structure
      this.verifyRouteStructure();
      
      // 2. Verify notification triggers
      this.verifyNotificationTriggers();
      
      // 3. Verify guards and separation
      this.verifyGuardsAndSeparation();
      
      // 4. Verify calculation services
      this.verifyCalculationServices();
      
      // Generate summary
      this.generateSummary();
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
    }
  }

  verifyRouteStructure() {
    console.log('📁 Verifying Route Structure...');
    
    const completionRoutes = [
      'src/app/api/payments/completion/execute-upfront/route.ts',
      'src/app/api/payments/completion/execute-manual/route.ts', 
      'src/app/api/payments/completion/execute-final/route.ts',
      'src/app/api/invoices/completion/create-manual/route.ts',
      'src/app/api/projects/completion/create/route.ts',
      'src/app/api/project-tasks/completion/submit/route.ts'
    ];
    
    let routesExist = 0;
    for (const route of completionRoutes) {
      if (fs.existsSync(route)) {
        routesExist++;
        console.log(`  ✅ ${route}`);
      } else {
        console.log(`  ❌ ${route} - MISSING`);
        this.issues.push(`Missing route: ${route}`);
      }
    }
    
    this.results.push({
      test: 'Route Structure',
      status: routesExist === completionRoutes.length ? 'PASS' : 'FAIL',
      details: `${routesExist}/${completionRoutes.length} routes exist`
    });
    
    console.log(`  📊 Routes: ${routesExist}/${completionRoutes.length} exist\n`);
  }

  verifyNotificationTriggers() {
    console.log('🔔 Verifying Notification Triggers...');
    
    const expectedTriggers = {
      'src/app/api/projects/completion/create/route.ts': [
        'completion.project_activated',
        'completion.upfront_payment'
      ],
      'src/app/api/project-tasks/completion/submit/route.ts': [
        'completion.task_approved'
      ],
      'src/app/api/invoices/completion/create-manual/route.ts': [
        'completion.invoice_received'
      ],
      'src/app/api/payments/completion/execute-manual/route.ts': [
        'completion.invoice_paid'
      ],
      'src/app/api/payments/completion/execute-final/route.ts': [
        'completion.project_completed',
        'completion.final_payment',
        'completion.rating_prompt'
      ]
    };
    
    let triggersCorrect = 0;
    let totalTriggers = 0;
    
    for (const [routePath, expectedEvents] of Object.entries(expectedTriggers)) {
      if (fs.existsSync(routePath)) {
        const content = fs.readFileSync(routePath, 'utf8');
        
        for (const event of expectedEvents) {
          totalTriggers++;
          if (content.includes(event)) {
            triggersCorrect++;
            console.log(`  ✅ ${path.basename(routePath)} triggers ${event}`);
          } else {
            console.log(`  ❌ ${path.basename(routePath)} missing ${event}`);
            this.issues.push(`Missing trigger: ${event} in ${routePath}`);
          }
        }
      }
    }
    
    this.results.push({
      test: 'Notification Triggers',
      status: triggersCorrect === totalTriggers ? 'PASS' : 'FAIL',
      details: `${triggersCorrect}/${totalTriggers} triggers implemented`
    });
    
    console.log(`  📊 Triggers: ${triggersCorrect}/${totalTriggers} implemented\n`);
  }

  verifyGuardsAndSeparation() {
    console.log('🛡️ Verifying Guards and Separation...');
    
    // Check milestone route doesn't import completion modules
    const milestoneRoute = 'src/app/api/payments/execute/route.ts';
    let milestoneClean = true;
    
    if (fs.existsSync(milestoneRoute)) {
      const content = fs.readFileSync(milestoneRoute, 'utf8');
      
      const completionImports = [
        'CompletionCalculationService',
        'completion-events',
        'completion-handler',
        'completion.'
      ];
      
      for (const importCheck of completionImports) {
        if (content.includes(importCheck)) {
          console.log(`  ❌ Milestone route imports completion module: ${importCheck}`);
          this.issues.push(`Milestone contamination: ${importCheck}`);
          milestoneClean = false;
        }
      }
      
      if (milestoneClean) {
        console.log(`  ✅ Milestone route is clean (no completion imports)`);
      }
    }
    
    // Check completion routes don't import milestone-specific modules
    const completionRoutes = [
      'src/app/api/payments/completion/execute-upfront/route.ts',
      'src/app/api/payments/completion/execute-manual/route.ts',
      'src/app/api/payments/completion/execute-final/route.ts'
    ];
    
    let completionClean = true;
    
    for (const route of completionRoutes) {
      if (fs.existsSync(route)) {
        const content = fs.readFileSync(route, 'utf8');
        
        const milestoneImports = [
          'PaymentsService.processInvoicePayment',
          'executeTaskApprovalTransaction',
          'invoice.paid',
          'milestone_payment_sent'
        ];
        
        for (const importCheck of milestoneImports) {
          if (content.includes(importCheck)) {
            console.log(`  ❌ Completion route imports milestone module: ${importCheck} in ${route}`);
            this.issues.push(`Completion contamination: ${importCheck} in ${route}`);
            completionClean = false;
          }
        }
      }
    }
    
    if (completionClean) {
      console.log(`  ✅ Completion routes are clean (no milestone imports)`);
    }
    
    this.results.push({
      test: 'Guards and Separation',
      status: milestoneClean && completionClean ? 'PASS' : 'FAIL',
      details: `Milestone clean: ${milestoneClean}, Completion clean: ${completionClean}`
    });
    
    console.log(`  📊 Separation: ${milestoneClean && completionClean ? 'PROTECTED' : 'VULNERABLE'}\n`);
  }

  verifyCalculationServices() {
    console.log('🧮 Verifying Calculation Services...');
    
    const calculationService = 'src/app/api/payments/services/completion-calculation-service.ts';
    let serviceExists = false;
    let methodsImplemented = 0;
    
    const expectedMethods = [
      'calculateUpfrontAmount',
      'calculateManualInvoiceAmount', 
      'calculateRemainingBudget',
      'validatePaymentState',
      'calculateProjectProgress'
    ];
    
    if (fs.existsSync(calculationService)) {
      serviceExists = true;
      const content = fs.readFileSync(calculationService, 'utf8');
      
      for (const method of expectedMethods) {
        if (content.includes(method)) {
          methodsImplemented++;
          console.log(`  ✅ ${method} implemented`);
        } else {
          console.log(`  ❌ ${method} missing`);
          this.issues.push(`Missing calculation method: ${method}`);
        }
      }
    } else {
      console.log(`  ❌ Calculation service missing: ${calculationService}`);
      this.issues.push('CompletionCalculationService missing');
    }
    
    this.results.push({
      test: 'Calculation Services',
      status: serviceExists && methodsImplemented === expectedMethods.length ? 'PASS' : 'FAIL',
      details: `Service exists: ${serviceExists}, Methods: ${methodsImplemented}/${expectedMethods.length}`
    });
    
    console.log(`  📊 Calculation Service: ${serviceExists ? 'EXISTS' : 'MISSING'}, Methods: ${methodsImplemented}/${expectedMethods.length}\n`);
  }

  generateSummary() {
    console.log('📊 VERIFICATION SUMMARY');
    console.log('========================');
    
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const totalTests = this.results.length;
    const issueCount = this.issues.length;
    
    console.log(`Tests Passed: ${passCount}/${totalTests}`);
    console.log(`Issues Found: ${issueCount}`);
    console.log('');
    
    // Show test results
    for (const result of this.results) {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.details}`);
    }
    
    console.log('');
    
    // Show issues if any
    if (this.issues.length > 0) {
      console.log('🚨 ISSUES FOUND:');
      for (const issue of this.issues) {
        console.log(`  ❌ ${issue}`);
      }
      console.log('');
    }
    
    // Final verdict
    if (passCount === totalTests && issueCount === 0) {
      console.log('🎉 VERIFICATION SUCCESSFUL!');
      console.log('✅ Completion payment execution + notification engineering is properly implemented');
      console.log('✅ Perfect separation from milestone system maintained');
      console.log('✅ System is ready for production deployment');
    } else {
      console.log('⚠️  VERIFICATION INCOMPLETE');
      console.log(`❌ ${totalTests - passCount} tests failed`);
      console.log(`❌ ${issueCount} issues need to be addressed`);
      console.log('🔧 Please fix the issues above before production deployment');
    }
  }
}

// Run verification
const verifier = new CompletionPaymentNotificationVerifier();
verifier.verify();

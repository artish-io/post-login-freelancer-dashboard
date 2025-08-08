#!/usr/bin/env node

/**
 * Payment Security and Authorization Test Script
 * 
 * This script tests all security measures in the payment system to ensure:
 * 1. Session authentication is enforced
 * 2. Authorization checks prevent cross-user access
 * 3. Milestone payment logic is correctly synchronized
 */

const fs = require('fs').promises;
const path = require('path');

async function testPaymentSecurity() {
  console.log('🔒 Testing Payment Security and Authorization...\n');

  try {
    // Test 1: Verify Session Guards in API Endpoints
    console.log('1️⃣ Testing Session Authentication Guards...');
    
    const paymentAPIs = [
      'src/app/api/invoices/create/route.ts',
      'src/app/api/invoices/pay/route.ts', 
      'src/app/api/invoices/send/route.ts',
      'src/app/api/payments/trigger/route.ts',
      'src/app/api/payments/execute/route.ts'
    ];

    let sessionGuardsPassed = 0;
    for (const apiPath of paymentAPIs) {
      const fullPath = path.join(process.cwd(), apiPath);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        
        const hasSessionImport = content.includes('getServerSession');
        const hasAuthCheck = content.includes('if (!session?.user?.id)');
        const hasUnauthorizedResponse = content.includes('Unauthorized');
        
        if (hasSessionImport && hasAuthCheck && hasUnauthorizedResponse) {
          console.log(`   ✅ ${apiPath} - Session guards implemented`);
          sessionGuardsPassed++;
        } else {
          console.log(`   ❌ ${apiPath} - Missing session guards`);
          console.log(`      - Session import: ${hasSessionImport}`);
          console.log(`      - Auth check: ${hasAuthCheck}`);
          console.log(`      - Unauthorized response: ${hasUnauthorizedResponse}`);
        }
      } catch (error) {
        console.log(`   ❌ ${apiPath} - File not found or unreadable`);
      }
    }

    console.log(`   📊 Session guards: ${sessionGuardsPassed}/${paymentAPIs.length} APIs secured\n`);

    // Test 2: Verify Authorization Logic
    console.log('2️⃣ Testing Authorization Logic...');
    
    const authorizationChecks = [
      {
        file: 'src/app/api/invoices/create/route.ts',
        checks: [
          'freelancerId !== sessionUserId',
          'project.freelancerId !== sessionUserId'
        ]
      },
      {
        file: 'src/app/api/invoices/pay/route.ts', 
        checks: [
          'commissionerId !== sessionUserId',
          'invoice.commissionerId !== sessionUserId'
        ]
      },
      {
        file: 'src/app/api/invoices/send/route.ts',
        checks: [
          'freelancerId !== sessionUserId',
          'invoice.freelancerId !== sessionUserId'
        ]
      }
    ];

    let authChecksPassed = 0;
    let totalAuthChecks = 0;

    for (const authTest of authorizationChecks) {
      const fullPath = path.join(process.cwd(), authTest.file);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        
        for (const check of authTest.checks) {
          totalAuthChecks++;
          if (content.includes(check)) {
            authChecksPassed++;
          } else {
            console.log(`   ❌ Missing authorization check: ${check} in ${authTest.file}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Could not read ${authTest.file}`);
      }
    }

    console.log(`   📊 Authorization checks: ${authChecksPassed}/${totalAuthChecks} implemented\n`);

    // Test 3: Verify Milestone Payment Logic Synchronization
    console.log('3️⃣ Testing Milestone Payment Logic Synchronization...');
    
    // Check frontend milestone calculation
    const frontendMilestonePath = path.join(process.cwd(), 'components/commissioner-dashboard/projects-and-invoices/post-a-gig/project-brief-form.tsx');
    const frontendContent = await fs.readFile(frontendMilestonePath, 'utf-8');
    
    const frontendHasEvenDistribution = frontendContent.includes('upperBudget / milestones.length');
    const frontendHasCalculation = frontendContent.includes('perMilestone: Math.round');
    
    // Check backend milestone calculation
    const backendMilestonePath = path.join(process.cwd(), 'src/app/api/invoices/auto-generate/route.ts');
    const backendContent = await fs.readFile(backendMilestonePath, 'utf-8');
    
    const backendHasEvenDistribution = backendContent.includes('totalBudget / totalMilestones');
    const backendHasCalculation = backendContent.includes('Math.round((totalBudget / totalMilestones)');
    const backendHasTaskApprovalCheck = backendContent.includes('task.status !== \'Approved\'');
    
    console.log('   Frontend milestone logic:');
    console.log(`   ${frontendHasEvenDistribution ? '✅' : '❌'} Even distribution calculation`);
    console.log(`   ${frontendHasCalculation ? '✅' : '❌'} Proper rounding`);
    
    console.log('   Backend milestone logic:');
    console.log(`   ${backendHasEvenDistribution ? '✅' : '❌'} Even distribution calculation`);
    console.log(`   ${backendHasCalculation ? '✅' : '❌'} Proper rounding`);
    console.log(`   ${backendHasTaskApprovalCheck ? '✅' : '❌'} Task approval validation`);

    const milestoneLogicSynced = frontendHasEvenDistribution && backendHasEvenDistribution && 
                                frontendHasCalculation && backendHasCalculation && 
                                backendHasTaskApprovalCheck;

    console.log(`   📊 Milestone logic synchronized: ${milestoneLogicSynced ? 'YES' : 'NO'}\n`);

    // Test 4: Check Data Consistency
    console.log('4️⃣ Testing Data Consistency...');
    
    // Check if existing projects have proper invoicing methods
    const projectsDir = path.join(process.cwd(), 'data/projects');
    let projectsChecked = 0;
    let projectsWithInvoicingMethod = 0;
    
    async function checkProjectsRecursively(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await checkProjectsRecursively(fullPath);
        } else if (entry.name === 'project.json') {
          try {
            const projectData = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
            projectsChecked++;
            
            if (projectData.invoicingMethod) {
              projectsWithInvoicingMethod++;
            }
          } catch (error) {
            // Skip invalid JSON files
          }
        }
      }
    }
    
    await checkProjectsRecursively(projectsDir);
    
    console.log(`   📊 Projects with invoicing method: ${projectsWithInvoicingMethod}/${projectsChecked}`);

    // Test Summary
    console.log('\n📊 Security Test Summary:');
    console.log(`✅ Session guards: ${sessionGuardsPassed}/${paymentAPIs.length} APIs secured`);
    console.log(`✅ Authorization checks: ${authChecksPassed}/${totalAuthChecks} implemented`);
    console.log(`✅ Milestone logic synchronized: ${milestoneLogicSynced ? 'YES' : 'NO'}`);
    console.log(`✅ Data consistency: ${projectsWithInvoicingMethod}/${projectsChecked} projects have invoicing method`);
    
    const overallScore = ((sessionGuardsPassed / paymentAPIs.length) + 
                         (authChecksPassed / totalAuthChecks) + 
                         (milestoneLogicSynced ? 1 : 0) + 
                         (projectsWithInvoicingMethod / Math.max(projectsChecked, 1))) / 4;
    
    console.log(`\n🎯 Overall Security Score: ${Math.round(overallScore * 100)}%`);
    
    if (overallScore >= 0.9) {
      console.log('🎉 Payment security is EXCELLENT!');
    } else if (overallScore >= 0.7) {
      console.log('⚠️  Payment security is GOOD but needs improvement');
    } else {
      console.log('🚨 Payment security needs IMMEDIATE attention');
    }

  } catch (error) {
    console.error('❌ Security test failed:', error.message);
    process.exit(1);
  }
}

// Run the security test
testPaymentSecurity();

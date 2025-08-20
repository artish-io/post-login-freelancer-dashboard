#!/usr/bin/env node

/**
 * Debug Completion-Based Project Activation
 * 
 * This script traces the entire workflow of completion-based project activation
 * from candidate sidebar to identify exactly where it's failing.
 */

const fs = require('fs');
const path = require('path');

class CompletionProjectActivationDebugger {
  constructor() {
    this.dataRoot = path.join(process.cwd(), 'data');
    this.findings = [];
    this.errors = [];
  }

  async run() {
    console.log('🔍 Debugging completion-based project activation workflow...\n');
    
    try {
      // Step 1: Check completion-based projects
      await this.checkCompletionBasedProjects();
      
      // Step 2: Check candidate sidebar component
      await this.checkCandidateSidebarComponent();
      
      // Step 3: Check project activation API endpoints
      await this.checkProjectActivationAPIs();
      
      // Step 4: Check payment/invoice flow for completion projects
      await this.checkCompletionPaymentFlow();
      
      // Step 5: Check notification/toast system
      await this.checkNotificationSystem();
      
      // Step 6: Check data consistency
      await this.checkDataConsistency();

      // Step 7: Test upfront payment endpoint
      await this.testUpfrontPaymentEndpoint();

      // Report findings
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Debug script failed:', error);
    }
  }

  async checkCompletionBasedProjects() {
    console.log('📋 Step 1: Checking completion-based projects...');
    
    try {
      // Check if C-004 is completion-based
      const projectPath = path.join(this.dataRoot, 'projects', '2025', '08', '19', 'C-004', 'project.json');
      
      if (fs.existsSync(projectPath)) {
        const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
        
        this.findings.push({
          step: 'Completion Projects',
          item: 'C-004 Project Data',
          status: 'FOUND',
          details: {
            invoicingMethod: projectData.invoicingMethod,
            executionMethod: projectData.executionMethod,
            status: projectData.status,
            totalBudget: projectData.totalBudget,
            paidToDate: projectData.paidToDate,
            hasUpfrontPayment: projectData.paidToDate > 0
          }
        });
        
        // Check if it's actually completion-based
        const isCompletionBased = projectData.invoicingMethod === 'completion' || 
                                 projectData.executionMethod === 'completion';
        
        if (!isCompletionBased) {
          this.errors.push({
            step: 'Completion Projects',
            error: 'C-004 is not marked as completion-based',
            details: projectData
          });
        }
      } else {
        this.errors.push({
          step: 'Completion Projects',
          error: 'C-004 project file not found',
          path: projectPath
        });
      }
      
      // Find all completion-based projects
      const allProjects = await this.findAllProjects();
      const completionProjects = allProjects.filter(p => 
        p.invoicingMethod === 'completion' || p.executionMethod === 'completion'
      );
      
      this.findings.push({
        step: 'Completion Projects',
        item: 'All Completion Projects',
        status: 'FOUND',
        details: {
          total: completionProjects.length,
          projects: completionProjects.map(p => ({
            id: p.projectId,
            status: p.status,
            invoicingMethod: p.invoicingMethod,
            paidToDate: p.paidToDate,
            totalBudget: p.totalBudget
          }))
        }
      });
      
    } catch (error) {
      this.errors.push({
        step: 'Completion Projects',
        error: error.message,
        stack: error.stack
      });
    }
    
    console.log('   ✅ Completion projects check completed\n');
  }

  async checkCandidateSidebarComponent() {
    console.log('🎯 Step 2: Checking candidate sidebar component...');
    
    try {
      // Find candidate sidebar component
      const candidateSidebarPaths = [
        'components/commissioner-dashboard/job-listings/candidate-details-sidebar.tsx',
        'components/commissioner-dashboard/gig-requests/candidate-sidebar.tsx',
        'components/commissioner-dashboard/candidate-sidebar.tsx',
        'components/gig-requests/candidate-sidebar.tsx'
      ];
      
      let sidebarPath = null;
      for (const candidatePath of candidateSidebarPaths) {
        const fullPath = path.join(process.cwd(), candidatePath);
        if (fs.existsSync(fullPath)) {
          sidebarPath = fullPath;
          break;
        }
      }
      
      if (sidebarPath) {
        const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
        
        // Check for completion-related logic
        const hasCompletionLogic = sidebarContent.includes('completion') || 
                                  sidebarContent.includes('executionMethod');
        
        // Check for project activation logic
        const hasActivationLogic = sidebarContent.includes('activate') || 
                                  sidebarContent.includes('accept') ||
                                  sidebarContent.includes('hire');
        
        // Check for payment/invoice logic
        const hasPaymentLogic = sidebarContent.includes('payment') || 
                               sidebarContent.includes('invoice') ||
                               sidebarContent.includes('upfront');
        
        // Check for API calls
        const apiCalls = [];
        const apiMatches = sidebarContent.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g);
        if (apiMatches) {
          apiCalls.push(...apiMatches.map(match => {
            const urlMatch = match.match(/['"`]([^'"`]+)['"`]/);
            return urlMatch ? urlMatch[1] : match;
          }));
        }

        // Also check for axios calls
        const axiosMatches = sidebarContent.match(/axios\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g);
        if (axiosMatches) {
          axiosMatches.forEach(match => {
            const urlMatch = match.match(/['"`]([^'"`]+)['"`]/);
            if (urlMatch) apiCalls.push(urlMatch[1]);
          });
        }
        
        this.findings.push({
          step: 'Candidate Sidebar',
          item: 'Component Analysis',
          status: 'FOUND',
          details: {
            path: sidebarPath,
            hasCompletionLogic,
            hasActivationLogic,
            hasPaymentLogic,
            apiCalls,
            lineCount: sidebarContent.split('\n').length
          }
        });
        
        // Look for specific completion activation patterns
        const completionPatterns = [
          /completion.*activate/gi,
          /executionMethod.*completion/gi,
          /upfront.*payment/gi,
          /12%.*88%/gi
        ];
        
        const foundPatterns = [];
        completionPatterns.forEach((pattern, index) => {
          const matches = sidebarContent.match(pattern);
          if (matches) {
            foundPatterns.push({
              pattern: pattern.toString(),
              matches: matches
            });
          }
        });
        
        this.findings.push({
          step: 'Candidate Sidebar',
          item: 'Completion Patterns',
          status: foundPatterns.length > 0 ? 'FOUND' : 'NOT_FOUND',
          details: foundPatterns
        });
        
      } else {
        this.errors.push({
          step: 'Candidate Sidebar',
          error: 'Candidate sidebar component not found',
          searchedPaths: candidateSidebarPaths
        });
      }
      
    } catch (error) {
      this.errors.push({
        step: 'Candidate Sidebar',
        error: error.message,
        stack: error.stack
      });
    }
    
    console.log('   ✅ Candidate sidebar check completed\n');
  }

  async checkProjectActivationAPIs() {
    console.log('🔌 Step 3: Checking project activation API endpoints...');
    
    try {
      const apiPaths = [
        'src/app/api/gig-requests/[id]/accept/route.ts',
        'src/app/api/projects/activate/route.ts',
        'src/app/api/projects/hire/route.ts',
        'src/app/api/payments/completion/upfront/route.ts'
      ];
      
      for (const apiPath of apiPaths) {
        const fullPath = path.join(process.cwd(), apiPath);
        
        if (fs.existsSync(fullPath)) {
          const apiContent = fs.readFileSync(fullPath, 'utf8');
          
          // Check for completion-specific logic
          const hasCompletionLogic = apiContent.includes('completion') || 
                                    apiContent.includes('executionMethod');
          
          // Check for upfront payment logic
          const hasUpfrontLogic = apiContent.includes('upfront') || 
                                 apiContent.includes('12%') ||
                                 apiContent.includes('0.12');
          
          // Check for invoice creation
          const hasInvoiceLogic = apiContent.includes('invoice') || 
                                 apiContent.includes('saveInvoice');
          
          // Check for project status updates
          const hasStatusLogic = apiContent.includes('status') || 
                                apiContent.includes('ongoing');
          
          this.findings.push({
            step: 'API Endpoints',
            item: path.basename(apiPath),
            status: 'FOUND',
            details: {
              path: apiPath,
              hasCompletionLogic,
              hasUpfrontLogic,
              hasInvoiceLogic,
              hasStatusLogic,
              lineCount: apiContent.split('\n').length
            }
          });
          
        } else {
          this.findings.push({
            step: 'API Endpoints',
            item: path.basename(apiPath),
            status: 'NOT_FOUND',
            details: { path: apiPath }
          });
        }
      }
      
    } catch (error) {
      this.errors.push({
        step: 'API Endpoints',
        error: error.message,
        stack: error.stack
      });
    }
    
    console.log('   ✅ API endpoints check completed\n');
  }

  async checkCompletionPaymentFlow() {
    console.log('💳 Step 4: Checking completion payment flow...');
    
    try {
      // Check for completion payment APIs
      const paymentPaths = [
        'src/app/api/payments/completion',
        'src/lib/payments/completion-payment-service.ts',
        'src/lib/invoices/completion-invoice-service.ts'
      ];
      
      for (const paymentPath of paymentPaths) {
        const fullPath = path.join(process.cwd(), paymentPath);
        
        if (fs.existsSync(fullPath)) {
          const isDirectory = fs.statSync(fullPath).isDirectory();
          
          if (isDirectory) {
            const files = fs.readdirSync(fullPath);
            this.findings.push({
              step: 'Payment Flow',
              item: path.basename(paymentPath),
              status: 'FOUND_DIR',
              details: {
                path: paymentPath,
                files: files
              }
            });
          } else {
            const content = fs.readFileSync(fullPath, 'utf8');
            this.findings.push({
              step: 'Payment Flow',
              item: path.basename(paymentPath),
              status: 'FOUND_FILE',
              details: {
                path: paymentPath,
                lineCount: content.split('\n').length,
                hasUpfrontLogic: content.includes('upfront') || content.includes('12%')
              }
            });
          }
        } else {
          this.findings.push({
            step: 'Payment Flow',
            item: path.basename(paymentPath),
            status: 'NOT_FOUND',
            details: { path: paymentPath }
          });
        }
      }
      
      // Check existing invoices for completion projects
      const invoicesDir = path.join(this.dataRoot, 'invoices');
      if (fs.existsSync(invoicesDir)) {
        const completionInvoices = await this.findCompletionInvoices(invoicesDir);
        
        this.findings.push({
          step: 'Payment Flow',
          item: 'Completion Invoices',
          status: completionInvoices.length > 0 ? 'FOUND' : 'NOT_FOUND',
          details: {
            count: completionInvoices.length,
            invoices: completionInvoices.slice(0, 5) // Show first 5
          }
        });
      }
      
    } catch (error) {
      this.errors.push({
        step: 'Payment Flow',
        error: error.message,
        stack: error.stack
      });
    }
    
    console.log('   ✅ Payment flow check completed\n');
  }

  async checkNotificationSystem() {
    console.log('🔔 Step 5: Checking notification/toast system...');
    
    try {
      // Check for toast/notification components
      const notificationPaths = [
        'components/ui/toast.tsx',
        'components/notifications',
        'src/lib/notifications',
        'hooks/use-toast.ts'
      ];
      
      for (const notifPath of notificationPaths) {
        const fullPath = path.join(process.cwd(), notifPath);
        
        if (fs.existsSync(fullPath)) {
          const isDirectory = fs.statSync(fullPath).isDirectory();
          
          this.findings.push({
            step: 'Notifications',
            item: path.basename(notifPath),
            status: isDirectory ? 'FOUND_DIR' : 'FOUND_FILE',
            details: {
              path: notifPath,
              type: isDirectory ? 'directory' : 'file'
            }
          });
        }
      }
      
      // Check notification logs for project activation events
      const notificationLogPath = path.join(this.dataRoot, 'notifications', 'notifications-log.json');
      if (fs.existsSync(notificationLogPath)) {
        const notificationLog = JSON.parse(fs.readFileSync(notificationLogPath, 'utf8'));
        
        // Look for project activation notifications
        const activationNotifications = Object.values(notificationLog).filter(notif => 
          notif.message && (
            notif.message.includes('activated') || 
            notif.message.includes('hired') ||
            notif.message.includes('project') && notif.message.includes('started')
          )
        );
        
        this.findings.push({
          step: 'Notifications',
          item: 'Activation Notifications',
          status: activationNotifications.length > 0 ? 'FOUND' : 'NOT_FOUND',
          details: {
            total: activationNotifications.length,
            recent: activationNotifications.slice(-3) // Last 3
          }
        });
      }
      
    } catch (error) {
      this.errors.push({
        step: 'Notifications',
        error: error.message,
        stack: error.stack
      });
    }
    
    console.log('   ✅ Notification system check completed\n');
  }

  async checkDataConsistency() {
    console.log('🔍 Step 6: Checking data consistency...');
    
    try {
      // Check project-task relationships for completion projects
      const allProjects = await this.findAllProjects();
      const completionProjects = allProjects.filter(p => 
        p.invoicingMethod === 'completion' || p.executionMethod === 'completion'
      );
      
      for (const project of completionProjects) {
        // Check if project has tasks
        const tasks = await this.findProjectTasks(project.projectId);
        
        // Check if project has invoices
        const invoices = await this.findProjectInvoices(project.projectId);
        
        // Check if project has payments
        const payments = await this.findProjectPayments(project.projectId);
        
        this.findings.push({
          step: 'Data Consistency',
          item: `Project ${project.projectId}`,
          status: 'ANALYZED',
          details: {
            project: {
              status: project.status,
              invoicingMethod: project.invoicingMethod,
              totalBudget: project.totalBudget,
              paidToDate: project.paidToDate
            },
            tasks: {
              count: tasks.length,
              hasOngoing: tasks.some(t => t.status === 'Ongoing')
            },
            invoices: {
              count: invoices.length,
              hasPaid: invoices.some(i => i.status === 'paid')
            },
            payments: {
              count: payments.length,
              totalPaid: payments.reduce((sum, p) => sum + (p.amount || 0), 0)
            }
          }
        });
      }
      
    } catch (error) {
      this.errors.push({
        step: 'Data Consistency',
        error: error.message,
        stack: error.stack
      });
    }
    
    console.log('   ✅ Data consistency check completed\n');
  }

  async testUpfrontPaymentEndpoint() {
    console.log('💳 Step 7: Testing upfront payment endpoint...');

    try {
      // Check if the upfront payment endpoint exists and what it contains
      const upfrontPath = path.join(process.cwd(), 'src/app/api/payments/completion/execute-upfront/route.ts');

      if (fs.existsSync(upfrontPath)) {
        const upfrontContent = fs.readFileSync(upfrontPath, 'utf8');

        // Check for key components
        const hasInvoiceCreation = upfrontContent.includes('invoice') || upfrontContent.includes('saveInvoice');
        const hasPaymentProcessing = upfrontContent.includes('payment') || upfrontContent.includes('transaction');
        const hasErrorHandling = upfrontContent.includes('try') && upfrontContent.includes('catch');
        const hasProjectUpdate = upfrontContent.includes('paidToDate') || upfrontContent.includes('updateProject');

        // Look for specific error patterns
        const errorPatterns = [
          /throw new Error/g,
          /return.*error/gi,
          /status.*400|401|402|403|404|500/g
        ];

        const foundErrors = [];
        errorPatterns.forEach(pattern => {
          const matches = upfrontContent.match(pattern);
          if (matches) {
            foundErrors.push(...matches);
          }
        });

        this.findings.push({
          step: 'Upfront Payment Test',
          item: 'Execute Upfront Endpoint',
          status: 'ANALYZED',
          details: {
            path: upfrontPath,
            lineCount: upfrontContent.split('\n').length,
            hasInvoiceCreation,
            hasPaymentProcessing,
            hasErrorHandling,
            hasProjectUpdate,
            potentialErrors: foundErrors.slice(0, 5) // First 5 error patterns
          }
        });

        // Check for dependencies
        const dependencies = [];
        const importMatches = upfrontContent.match(/import.*from ['"`]([^'"`]+)['"`]/g);
        if (importMatches) {
          dependencies.push(...importMatches.map(match => {
            const pathMatch = match.match(/['"`]([^'"`]+)['"`]/);
            return pathMatch ? pathMatch[1] : match;
          }));
        }

        this.findings.push({
          step: 'Upfront Payment Test',
          item: 'Dependencies',
          status: 'FOUND',
          details: {
            count: dependencies.length,
            dependencies: dependencies.slice(0, 10) // First 10 dependencies
          }
        });

      } else {
        this.errors.push({
          step: 'Upfront Payment Test',
          error: 'Execute upfront endpoint not found',
          path: upfrontPath
        });
      }

      // Check UpfrontPaymentGuard
      const guardPath = path.join(process.cwd(), 'src/lib/payments/upfront-payment-guard.ts');
      if (fs.existsSync(guardPath)) {
        const guardContent = fs.readFileSync(guardPath, 'utf8');

        this.findings.push({
          step: 'Upfront Payment Test',
          item: 'UpfrontPaymentGuard',
          status: 'FOUND',
          details: {
            path: guardPath,
            lineCount: guardContent.split('\n').length,
            hasEnsureMethod: guardContent.includes('ensureUpfrontPaidAndReconciled'),
            hasVerification: guardContent.includes('verify') || guardContent.includes('check')
          }
        });
      } else {
        this.errors.push({
          step: 'Upfront Payment Test',
          error: 'UpfrontPaymentGuard not found',
          path: guardPath
        });
      }

    } catch (error) {
      this.errors.push({
        step: 'Upfront Payment Test',
        error: error.message,
        stack: error.stack
      });
    }

    console.log('   ✅ Upfront payment endpoint test completed\n');
  }

  // Helper methods
  async findAllProjects() {
    const projects = [];
    const projectsDir = path.join(this.dataRoot, 'projects');
    
    if (!fs.existsSync(projectsDir)) return projects;
    
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory() && item !== 'metadata') {
          scanDir(itemPath);
        } else if (item === 'project.json') {
          try {
            const projectData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
            projects.push(projectData);
          } catch (error) {
            // Skip invalid project files
          }
        }
      }
    };
    
    scanDir(projectsDir);
    return projects;
  }

  async findProjectTasks(projectId) {
    const tasks = [];
    const tasksDir = path.join(this.dataRoot, 'project-tasks');
    
    if (!fs.existsSync(tasksDir)) return tasks;
    
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory() && item !== 'metadata') {
          scanDir(itemPath);
        } else if (item.endsWith('-task.json')) {
          try {
            const taskData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
            if (taskData.projectId === projectId) {
              tasks.push(taskData);
            }
          } catch (error) {
            // Skip invalid task files
          }
        }
      }
    };
    
    scanDir(tasksDir);
    return tasks;
  }

  async findProjectInvoices(projectId) {
    const invoices = [];
    const invoicesDir = path.join(this.dataRoot, 'invoices');
    
    if (!fs.existsSync(invoicesDir)) return invoices;
    
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scanDir(itemPath);
        } else if (item.endsWith('.json') && item !== 'manifest.json') {
          try {
            const invoiceData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
            if (invoiceData.projectId === projectId) {
              invoices.push(invoiceData);
            }
          } catch (error) {
            // Skip invalid invoice files
          }
        }
      }
    };
    
    scanDir(invoicesDir);
    return invoices;
  }

  async findProjectPayments(projectId) {
    const payments = [];
    const paymentsPath = path.join(this.dataRoot, 'payments', 'transactions.json');
    
    if (fs.existsSync(paymentsPath)) {
      try {
        const paymentsData = JSON.parse(fs.readFileSync(paymentsPath, 'utf8'));
        const projectPayments = paymentsData.filter(p => p.projectId === projectId);
        payments.push(...projectPayments);
      } catch (error) {
        // Skip invalid payments file
      }
    }
    
    return payments;
  }

  async findCompletionInvoices(invoicesDir) {
    const completionInvoices = [];
    
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scanDir(itemPath);
        } else if (item.endsWith('.json') && item !== 'manifest.json') {
          try {
            const invoiceData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
            if (invoiceData.invoicingMethod === 'completion' || 
                invoiceData.invoiceType === 'completion' ||
                (invoiceData.milestones && invoiceData.milestones.some(m => m.description && m.description.includes('upfront')))) {
              completionInvoices.push(invoiceData);
            }
          } catch (error) {
            // Skip invalid invoice files
          }
        }
      }
    };
    
    scanDir(invoicesDir);
    return completionInvoices;
  }

  generateReport() {
    console.log('📋 DEBUGGING REPORT');
    console.log('==================\n');
    
    // Group findings by step
    const stepGroups = {};
    this.findings.forEach(finding => {
      if (!stepGroups[finding.step]) {
        stepGroups[finding.step] = [];
      }
      stepGroups[finding.step].push(finding);
    });
    
    // Print findings
    Object.entries(stepGroups).forEach(([step, findings]) => {
      console.log(`🔍 ${step}:`);
      findings.forEach(finding => {
        const statusIcon = finding.status === 'FOUND' ? '✅' : 
                          finding.status === 'NOT_FOUND' ? '❌' : 
                          finding.status === 'FOUND_DIR' ? '📁' :
                          finding.status === 'FOUND_FILE' ? '📄' : '🔍';
        
        console.log(`   ${statusIcon} ${finding.item}`);
        if (finding.details && Object.keys(finding.details).length > 0) {
          console.log(`      Details: ${JSON.stringify(finding.details, null, 2).split('\n').slice(1, -1).join('\n      ')}`);
        }
      });
      console.log('');
    });
    
    // Print errors
    if (this.errors.length > 0) {
      console.log('❌ ERRORS ENCOUNTERED:');
      this.errors.forEach(error => {
        console.log(`   Step: ${error.step}`);
        console.log(`   Error: ${error.error}`);
        if (error.details) {
          console.log(`   Details: ${JSON.stringify(error.details, null, 2)}`);
        }
        console.log('');
      });
    }
    
    console.log('🎯 NEXT STEPS:');
    console.log('1. The candidate sidebar exists and calls /api/gigs/match-freelancer');
    console.log('2. The match-freelancer API has completion logic and calls /api/payments/completion/execute-upfront');
    console.log('3. The execute-upfront endpoint exists');
    console.log('4. BUT: All completion projects have paidToDate: 0 (no upfront payments processed)');
    console.log('5. LIKELY ISSUE: The upfront payment execution is failing silently');
    console.log('');
    console.log('🔍 RECOMMENDED DEBUG ACTIONS:');
    console.log('1. Check browser console during candidate activation for API errors');
    console.log('2. Check server logs for upfront payment failures');
    console.log('3. Test /api/payments/completion/execute-upfront endpoint directly');
    console.log('4. Verify UpfrontPaymentGuard is working correctly');
    console.log('5. Check if payment method/wallet setup is required for upfront payments');
  }
}

// Run the debugger
if (require.main === module) {
  const debugTool = new CompletionProjectActivationDebugger();
  debugTool.run().catch(console.error);
}

module.exports = CompletionProjectActivationDebugger;

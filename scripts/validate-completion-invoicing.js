#!/usr/bin/env node

/**
 * Completion Invoicing Validation Utility
 * 
 * This script validates the current state of completion invoicing data
 * and checks for any inconsistencies or issues in the system.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Validate completion invoicing data integrity
 */
async function validateCompletionInvoicingData() {
  console.log('🔍 Validating Completion Invoicing Data Integrity');
  console.log('=' .repeat(50));
  
  const issues = [];
  const warnings = [];
  
  try {
    // Check for completion-based projects
    const projectsPath = path.join(process.cwd(), 'data', 'projects');
    const completionProjects = await findCompletionProjects(projectsPath);
    
    console.log(`📊 Found ${completionProjects.length} completion-based projects`);
    
    for (const project of completionProjects) {
      console.log(`\n🔍 Validating project ${project.projectId}: ${project.title}`);
      
      // Validate project structure
      const projectIssues = await validateProject(project);
      issues.push(...projectIssues);
      
      // Validate associated invoices
      const invoiceIssues = await validateProjectInvoices(project);
      issues.push(...invoiceIssues);
      
      // Validate task completion logic
      const taskIssues = await validateProjectTasks(project);
      issues.push(...taskIssues);
    }
    
    // Generate validation report
    generateValidationReport(completionProjects, issues, warnings);
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

/**
 * Find all completion-based projects
 */
async function findCompletionProjects(projectsPath) {
  const projects = [];
  
  try {
    const years = await fs.readdir(projectsPath);
    
    for (const year of years) {
      if (year.startsWith('.')) continue;
      
      const yearPath = path.join(projectsPath, year);
      const months = await fs.readdir(yearPath);
      
      for (const month of months) {
        if (month.startsWith('.')) continue;
        
        const monthPath = path.join(yearPath, month);
        const days = await fs.readdir(monthPath);
        
        for (const day of days) {
          if (day.startsWith('.')) continue;
          
          const dayPath = path.join(monthPath, day);
          const projectDirs = await fs.readdir(dayPath);
          
          for (const projectDir of projectDirs) {
            if (projectDir.startsWith('.')) continue;
            
            const projectPath = path.join(dayPath, projectDir, 'project.json');
            
            try {
              const projectData = JSON.parse(await fs.readFile(projectPath, 'utf-8'));
              
              if (projectData.invoicingMethod === 'completion') {
                projects.push({
                  ...projectData,
                  filePath: projectPath
                });
              }
            } catch (error) {
              console.warn(`⚠️ Could not read project file: ${projectPath}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not scan projects directory:', error.message);
  }
  
  return projects;
}

/**
 * Validate individual project
 */
async function validateProject(project) {
  const issues = [];
  
  // Check required fields
  if (!project.invoicingMethod || project.invoicingMethod !== 'completion') {
    issues.push({
      type: 'ERROR',
      project: project.projectId,
      issue: 'Missing or invalid invoicingMethod',
      details: `Expected 'completion', got '${project.invoicingMethod}'`
    });
  }
  
  if (!project.budget || (!project.budget.upper && !project.budget.lower)) {
    issues.push({
      type: 'ERROR',
      project: project.projectId,
      issue: 'Missing budget information',
      details: 'Completion invoicing requires budget data'
    });
  }
  
  if (!project.totalTasks || project.totalTasks <= 0) {
    issues.push({
      type: 'WARNING',
      project: project.projectId,
      issue: 'No tasks defined',
      details: 'Project should have tasks for completion tracking'
    });
  }
  
  return issues;
}

/**
 * Validate project invoices
 */
async function validateProjectInvoices(project) {
  const issues = [];
  
  try {
    // Look for upfront and completion invoices
    const invoicesPath = path.join(process.cwd(), 'data', 'invoices');
    const upfrontInvoice = await findInvoiceByPattern(invoicesPath, `CMP${project.projectId}-UP`);
    const completionInvoice = await findInvoiceByPattern(invoicesPath, `CMP${project.projectId}-COMP`);
    
    if (project.status === 'ongoing' || project.status === 'completed') {
      if (!upfrontInvoice) {
        issues.push({
          type: 'WARNING',
          project: project.projectId,
          issue: 'Missing upfront invoice',
          details: 'Active completion project should have upfront invoice'
        });
      } else {
        // Validate upfront amount (should be 12% of budget)
        const expectedUpfront = Math.round((project.budget?.upper || project.budget?.lower || 0) * 0.12);
        if (Math.abs(upfrontInvoice.amount - expectedUpfront) > 1) {
          issues.push({
            type: 'ERROR',
            project: project.projectId,
            issue: 'Incorrect upfront invoice amount',
            details: `Expected $${expectedUpfront}, got $${upfrontInvoice.amount}`
          });
        }
      }
    }
    
    if (project.status === 'completed') {
      if (!completionInvoice) {
        issues.push({
          type: 'ERROR',
          project: project.projectId,
          issue: 'Missing completion invoice',
          details: 'Completed project should have completion invoice'
        });
      } else {
        // Validate completion amount (should be 88% of budget)
        const totalBudget = project.budget?.upper || project.budget?.lower || 0;
        const expectedCompletion = totalBudget - Math.round(totalBudget * 0.12);
        if (Math.abs(completionInvoice.amount - expectedCompletion) > 1) {
          issues.push({
            type: 'ERROR',
            project: project.projectId,
            issue: 'Incorrect completion invoice amount',
            details: `Expected $${expectedCompletion}, got $${completionInvoice.amount}`
          });
        }
      }
      
      // Validate total invoice amounts equal budget
      if (upfrontInvoice && completionInvoice) {
        const totalInvoiced = upfrontInvoice.amount + completionInvoice.amount;
        const totalBudget = project.budget?.upper || project.budget?.lower || 0;
        if (Math.abs(totalInvoiced - totalBudget) > 1) {
          issues.push({
            type: 'ERROR',
            project: project.projectId,
            issue: 'Invoice amounts do not match budget',
            details: `Budget: $${totalBudget}, Invoiced: $${totalInvoiced}`
          });
        }
      }
    }
    
  } catch (error) {
    issues.push({
      type: 'ERROR',
      project: project.projectId,
      issue: 'Could not validate invoices',
      details: error.message
    });
  }
  
  return issues;
}

/**
 * Validate project tasks
 */
async function validateProjectTasks(project) {
  const issues = [];
  
  try {
    // Find project tasks
    const tasksPath = path.join(path.dirname(project.filePath), 'tasks.json');
    
    try {
      const tasksData = JSON.parse(await fs.readFile(tasksPath, 'utf-8'));
      const tasks = tasksData.tasks || [];
      
      if (project.status === 'completed') {
        // All tasks should be approved for completed projects
        const unapprovedTasks = tasks.filter(task => 
          task.status !== 'Approved' && !task.completed
        );
        
        if (unapprovedTasks.length > 0) {
          issues.push({
            type: 'ERROR',
            project: project.projectId,
            issue: 'Completed project has unapproved tasks',
            details: `${unapprovedTasks.length} tasks not approved: ${unapprovedTasks.map(t => t.id).join(', ')}`
          });
        }
      }
      
      // Check task count matches project.totalTasks
      if (project.totalTasks && tasks.length !== project.totalTasks) {
        issues.push({
          type: 'WARNING',
          project: project.projectId,
          issue: 'Task count mismatch',
          details: `Project says ${project.totalTasks} tasks, found ${tasks.length}`
        });
      }
      
    } catch (taskError) {
      issues.push({
        type: 'WARNING',
        project: project.projectId,
        issue: 'Could not read tasks file',
        details: taskError.message
      });
    }
    
  } catch (error) {
    issues.push({
      type: 'ERROR',
      project: project.projectId,
      issue: 'Could not validate tasks',
      details: error.message
    });
  }
  
  return issues;
}

/**
 * Find invoice by pattern
 */
async function findInvoiceByPattern(invoicesPath, pattern) {
  try {
    const years = await fs.readdir(invoicesPath);
    
    for (const year of years) {
      if (year.startsWith('.')) continue;
      
      const yearPath = path.join(invoicesPath, year);
      const months = await fs.readdir(yearPath);
      
      for (const month of months) {
        if (month.startsWith('.')) continue;
        
        const monthPath = path.join(yearPath, month);
        const days = await fs.readdir(monthPath);
        
        for (const day of days) {
          if (day.startsWith('.')) continue;
          
          const dayPath = path.join(monthPath, day);
          const files = await fs.readdir(dayPath);
          
          for (const file of files) {
            if (file.includes(pattern)) {
              const invoiceData = JSON.parse(await fs.readFile(path.join(dayPath, file), 'utf-8'));
              return invoiceData;
            }
          }
        }
      }
    }
  } catch (error) {
    // Invoice not found or directory doesn't exist
  }
  
  return null;
}

/**
 * Generate validation report
 */
function generateValidationReport(projects, issues, warnings) {
  console.log('\n📊 VALIDATION REPORT');
  console.log('=' .repeat(30));
  
  const errors = issues.filter(i => i.type === 'ERROR');
  const warns = issues.filter(i => i.type === 'WARNING');
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`   Projects validated: ${projects.length}`);
  console.log(`   Errors found: ${errors.length}`);
  console.log(`   Warnings found: ${warns.length}`);
  
  if (errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    errors.forEach(error => {
      console.log(`   ❌ Project ${error.project}: ${error.issue}`);
      console.log(`      ${error.details}`);
    });
  }
  
  if (warns.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    warns.forEach(warning => {
      console.log(`   ⚠️ Project ${warning.project}: ${warning.issue}`);
      console.log(`      ${warning.details}`);
    });
  }
  
  if (errors.length === 0 && warns.length === 0) {
    console.log('\n✅ All completion invoicing data is valid!');
  }
  
  console.log('\n🎯 RECOMMENDATIONS:');
  if (errors.length > 0) {
    console.log('   1. Fix all errors before deploying to production');
    console.log('   2. Review completion invoicing logic for consistency');
  }
  if (warns.length > 0) {
    console.log('   3. Address warnings to improve data quality');
  }
  console.log('   4. Run this validation regularly to catch issues early');
}

// Execute if run directly
if (require.main === module) {
  validateCompletionInvoicingData();
}

module.exports = {
  validateCompletionInvoicingData,
  findCompletionProjects,
  validateProject,
  validateProjectInvoices,
  validateProjectTasks
};

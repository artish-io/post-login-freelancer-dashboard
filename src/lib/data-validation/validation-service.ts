/**
 * Data Validation Service
 * 
 * Comprehensive validation system to identify inconsistencies across
 * projects, tasks, invoices, and other data structures
 */

import { readAllProjects, readProject } from '../projects-utils';
import { readAllTasks, readProjectTasks } from '../project-tasks/hierarchical-storage';
import { getAllInvoices } from '../invoice-storage';
import { listTasksByProject } from '../../app/api/payments/repos/tasks-repo';
import { readAllProjects as readRepoProjects } from '../../app/api/payments/repos/projects-repo';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'project' | 'task' | 'invoice' | 'data_integrity' | 'storage_consistency';
  entityType: string;
  entityId: string | number;
  issue: string;
  details: any;
  suggestedFix?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationReport {
  timestamp: string;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  categories: Record<string, number>;
  issues: ValidationIssue[];
  summary: {
    projectsValidated: number;
    tasksValidated: number;
    invoicesValidated: number;
    storageInconsistencies: number;
  };
}

/**
 * Run comprehensive data validation
 */
export async function runComprehensiveValidation(): Promise<ValidationReport> {
  console.log('🔍 Starting comprehensive data validation...');
  
  const issues: ValidationIssue[] = [];
  const summary = {
    projectsValidated: 0,
    tasksValidated: 0,
    invoicesValidated: 0,
    storageInconsistencies: 0
  };

  try {
    // Validate projects
    const projectIssues = await validateProjects();
    issues.push(...projectIssues);
    summary.projectsValidated = projectIssues.filter(i => i.category === 'project').length;

    // Validate tasks
    const taskIssues = await validateTasks();
    issues.push(...taskIssues);
    summary.tasksValidated = taskIssues.filter(i => i.category === 'task').length;

    // Validate invoices
    const invoiceIssues = await validateInvoices();
    issues.push(...invoiceIssues);
    summary.invoicesValidated = invoiceIssues.filter(i => i.category === 'invoice').length;

    // Validate storage consistency
    const storageIssues = await validateStorageConsistency();
    issues.push(...storageIssues);
    summary.storageInconsistencies = storageIssues.length;

    // Validate data integrity
    const integrityIssues = await validateDataIntegrity();
    issues.push(...integrityIssues);

  } catch (error) {
    issues.push({
      type: 'error',
      category: 'data_integrity',
      entityType: 'validation',
      entityId: 'system',
      issue: 'Validation process failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      severity: 'critical'
    });
  }

  // Generate report
  const report = generateValidationReport(issues, summary);
  
  console.log(`✅ Validation complete: ${report.totalIssues} issues found`);
  return report;
}

/**
 * Validate projects for consistency and completeness
 */
async function validateProjects(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  try {
    console.log('📋 Validating projects...');
    
    // Get projects from both storage systems
    const hierarchicalProjects = await readAllProjects();
    const repoProjects = await readRepoProjects();
    
    // Check for missing required fields
    for (const project of hierarchicalProjects) {
      if (!project.projectId) {
        issues.push({
          type: 'error',
          category: 'project',
          entityType: 'project',
          entityId: project.projectId || 'unknown',
          issue: 'Missing project ID',
          details: { project },
          severity: 'critical',
          suggestedFix: 'Assign a unique project ID'
        });
      }

      if (!project.title || project.title.trim().length === 0) {
        issues.push({
          type: 'error',
          category: 'project',
          entityType: 'project',
          entityId: project.projectId,
          issue: 'Missing or empty project title',
          details: { project },
          severity: 'high',
          suggestedFix: 'Add a descriptive project title'
        });
      }

      if (!project.freelancerId || !project.commissionerId) {
        issues.push({
          type: 'error',
          category: 'project',
          entityType: 'project',
          entityId: project.projectId,
          issue: 'Missing freelancer or commissioner ID',
          details: { 
            freelancerId: project.freelancerId, 
            commissionerId: project.commissionerId 
          },
          severity: 'critical',
          suggestedFix: 'Assign valid freelancer and commissioner IDs'
        });
      }

      if (!project.status || !['ongoing', 'paused', 'completed'].includes(project.status.toLowerCase())) {
        issues.push({
          type: 'warning',
          category: 'project',
          entityType: 'project',
          entityId: project.projectId,
          issue: 'Invalid or missing project status',
          details: { status: project.status },
          severity: 'medium',
          suggestedFix: 'Set status to one of: ongoing, paused, completed'
        });
      }

      if (!project.createdAt) {
        issues.push({
          type: 'warning',
          category: 'project',
          entityType: 'project',
          entityId: project.projectId,
          issue: 'Missing creation date',
          details: { project },
          severity: 'medium',
          suggestedFix: 'Add createdAt timestamp'
        });
      }
    }

    // Check for projects in repo but not in hierarchical storage
    for (const repoProject of repoProjects) {
      const hierarchicalProject = hierarchicalProjects.find(p => p.projectId === repoProject.projectId);
      if (!hierarchicalProject) {
        issues.push({
          type: 'warning',
          category: 'project',
          entityType: 'project',
          entityId: repoProject.projectId,
          issue: 'Project exists in repo but not in hierarchical storage',
          details: { repoProject },
          severity: 'medium',
          suggestedFix: 'Migrate project to hierarchical storage'
        });
      }
    }

  } catch (error) {
    issues.push({
      type: 'error',
      category: 'project',
      entityType: 'validation',
      entityId: 'projects',
      issue: 'Failed to validate projects',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      severity: 'critical'
    });
  }

  return issues;
}

/**
 * Validate tasks for consistency and completeness
 */
async function validateTasks(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  try {
    console.log('📝 Validating tasks...');
    
    const allTasks = await readAllTasks();
    
    for (const task of allTasks) {
      // Check required fields
      if (!task.taskId) {
        issues.push({
          type: 'error',
          category: 'task',
          entityType: 'task',
          entityId: task.taskId || 'unknown',
          issue: 'Missing task ID',
          details: { task },
          severity: 'critical'
        });
      }

      if (!task.projectId) {
        issues.push({
          type: 'error',
          category: 'task',
          entityType: 'task',
          entityId: task.taskId,
          issue: 'Missing project ID',
          details: { task },
          severity: 'critical'
        });
      }

      if (!task.title || task.title.trim().length === 0) {
        issues.push({
          type: 'error',
          category: 'task',
          entityType: 'task',
          entityId: task.taskId,
          issue: 'Missing or empty task title',
          details: { task },
          severity: 'high'
        });
      }

      // Check if parent project exists
      if (task.projectId) {
        try {
          const project = await readProject(task.projectId);
          if (!project) {
            issues.push({
              type: 'error',
              category: 'task',
              entityType: 'task',
              entityId: task.taskId,
              issue: 'Task references non-existent project',
              details: { taskId: task.taskId, projectId: task.projectId },
              severity: 'critical',
              suggestedFix: 'Remove orphaned task or create missing project'
            });
          }
        } catch (error) {
          issues.push({
            type: 'warning',
            category: 'task',
            entityType: 'task',
            entityId: task.taskId,
            issue: 'Could not verify parent project exists',
            details: { taskId: task.taskId, projectId: task.projectId, error },
            severity: 'medium'
          });
        }
      }

      // Check task status
      const validStatuses = ['ongoing', 'submitted', 'in review', 'approved', 'rejected'];
      if (!task.status || !validStatuses.includes(task.status.toLowerCase())) {
        issues.push({
          type: 'warning',
          category: 'task',
          entityType: 'task',
          entityId: task.taskId,
          issue: 'Invalid task status',
          details: { status: task.status, validStatuses },
          severity: 'medium'
        });
      }

      // Check for inconsistent completion status
      if (task.completed && task.status?.toLowerCase() !== 'approved') {
        issues.push({
          type: 'warning',
          category: 'task',
          entityType: 'task',
          entityId: task.taskId,
          issue: 'Task marked as completed but status is not approved',
          details: { completed: task.completed, status: task.status },
          severity: 'medium',
          suggestedFix: 'Set status to approved or completed to false'
        });
      }
    }

  } catch (error) {
    issues.push({
      type: 'error',
      category: 'task',
      entityType: 'validation',
      entityId: 'tasks',
      issue: 'Failed to validate tasks',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      severity: 'critical'
    });
  }

  return issues;
}

/**
 * Validate invoices for consistency and completeness
 */
async function validateInvoices(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  try {
    console.log('💰 Validating invoices...');
    
    const allInvoices = await getAllInvoices();
    
    for (const invoice of allInvoices) {
      // Check required fields
      if (!invoice.invoiceNumber) {
        issues.push({
          type: 'error',
          category: 'invoice',
          entityType: 'invoice',
          entityId: invoice.invoiceNumber || 'unknown',
          issue: 'Missing invoice number',
          details: { invoice },
          severity: 'critical'
        });
      }

      if (!invoice.freelancerId || !invoice.commissionerId) {
        issues.push({
          type: 'error',
          category: 'invoice',
          entityType: 'invoice',
          entityId: invoice.invoiceNumber,
          issue: 'Missing freelancer or commissioner ID',
          details: { 
            freelancerId: invoice.freelancerId, 
            commissionerId: invoice.commissionerId 
          },
          severity: 'critical'
        });
      }

      if (!invoice.totalAmount || invoice.totalAmount <= 0) {
        issues.push({
          type: 'error',
          category: 'invoice',
          entityType: 'invoice',
          entityId: invoice.invoiceNumber,
          issue: 'Invalid or missing total amount',
          details: { totalAmount: invoice.totalAmount },
          severity: 'high'
        });
      }

      // Check if referenced project exists
      if (invoice.projectId) {
        try {
          const project = await readProject(invoice.projectId);
          if (!project) {
            issues.push({
              type: 'warning',
              category: 'invoice',
              entityType: 'invoice',
              entityId: invoice.invoiceNumber,
              issue: 'Invoice references non-existent project',
              details: { invoiceNumber: invoice.invoiceNumber, projectId: invoice.projectId },
              severity: 'medium'
            });
          }
        } catch (error) {
          // Project might be in different storage, this is just a warning
        }
      }
    }

  } catch (error) {
    issues.push({
      type: 'error',
      category: 'invoice',
      entityType: 'validation',
      entityId: 'invoices',
      issue: 'Failed to validate invoices',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      severity: 'critical'
    });
  }

  return issues;
}

/**
 * Validate storage consistency between different storage systems
 */
async function validateStorageConsistency(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  try {
    console.log('🗄️ Validating storage consistency...');
    
    // Import the migration analysis
    const { analyzeTaskStorageInconsistencies } = await import('../project-tasks/data-migration');
    const taskAnalysis = await analyzeTaskStorageInconsistencies();
    
    // Convert task storage inconsistencies to validation issues
    for (const inconsistency of taskAnalysis.inconsistencies) {
      issues.push({
        type: 'error',
        category: 'storage_consistency',
        entityType: 'task',
        entityId: inconsistency.taskId,
        issue: inconsistency.issue,
        details: {
          taskId: inconsistency.taskId,
          projectId: inconsistency.projectId,
          currentLocation: inconsistency.currentLocation,
          correctLocation: inconsistency.correctLocation
        },
        severity: 'high',
        suggestedFix: 'Run task storage migration to fix location'
      });
    }

    // Convert task storage errors to validation issues
    for (const error of taskAnalysis.errors) {
      issues.push({
        type: 'error',
        category: 'storage_consistency',
        entityType: 'task',
        entityId: error.taskId,
        issue: error.error,
        details: {
          taskId: error.taskId,
          projectId: error.projectId
        },
        severity: 'critical'
      });
    }

  } catch (error) {
    issues.push({
      type: 'error',
      category: 'storage_consistency',
      entityType: 'validation',
      entityId: 'storage',
      issue: 'Failed to validate storage consistency',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      severity: 'critical'
    });
  }

  return issues;
}

/**
 * Validate data integrity across different entities
 */
async function validateDataIntegrity(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  try {
    console.log('🔗 Validating data integrity...');

    const allProjects = await readAllProjects();
    const allTasks = await readAllTasks();
    const allInvoices = await getAllInvoices();

    // Check for orphaned tasks (tasks without projects)
    for (const task of allTasks) {
      if (task.projectId) {
        const project = allProjects.find(p => p.projectId === task.projectId);
        if (!project) {
          issues.push({
            type: 'error',
            category: 'data_integrity',
            entityType: 'task',
            entityId: task.taskId,
            issue: 'Orphaned task - references non-existent project',
            details: { taskId: task.taskId, projectId: task.projectId },
            severity: 'high',
            suggestedFix: 'Remove orphaned task or create missing project'
          });
        }
      }
    }

    // Check for projects without tasks
    for (const project of allProjects) {
      const projectTasks = allTasks.filter(t => t.projectId === project.projectId);
      if (projectTasks.length === 0) {
        issues.push({
          type: 'warning',
          category: 'data_integrity',
          entityType: 'project',
          entityId: project.projectId,
          issue: 'Project has no tasks',
          details: { projectId: project.projectId, title: project.title },
          severity: 'medium',
          suggestedFix: 'Add tasks to project or mark as template'
        });
      }
    }

    // Check for invoices without corresponding approved tasks
    for (const invoice of allInvoices) {
      if (invoice.projectId && invoice.milestones) {
        for (const milestone of invoice.milestones) {
          if (milestone.taskId) {
            const task = allTasks.find(t => t.taskId === milestone.taskId);
            if (!task) {
              issues.push({
                type: 'warning',
                category: 'data_integrity',
                entityType: 'invoice',
                entityId: invoice.invoiceNumber,
                issue: 'Invoice references non-existent task',
                details: {
                  invoiceNumber: invoice.invoiceNumber,
                  taskId: milestone.taskId
                },
                severity: 'medium'
              });
            } else if (task.status?.toLowerCase() !== 'approved' && !task.completed) {
              issues.push({
                type: 'warning',
                category: 'data_integrity',
                entityType: 'invoice',
                entityId: invoice.invoiceNumber,
                issue: 'Invoice for non-approved task',
                details: {
                  invoiceNumber: invoice.invoiceNumber,
                  taskId: milestone.taskId,
                  taskStatus: task.status,
                  taskCompleted: task.completed
                },
                severity: 'medium',
                suggestedFix: 'Ensure task is approved before invoicing'
              });
            }
          }
        }
      }
    }

  } catch (error) {
    issues.push({
      type: 'error',
      category: 'data_integrity',
      entityType: 'validation',
      entityId: 'integrity',
      issue: 'Failed to validate data integrity',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      severity: 'critical'
    });
  }

  return issues;
}

/**
 * Generate validation report from issues
 */
function generateValidationReport(issues: ValidationIssue[], summary: any): ValidationReport {
  const categories: Record<string, number> = {};
  let criticalIssues = 0;
  let highIssues = 0;
  let mediumIssues = 0;
  let lowIssues = 0;

  for (const issue of issues) {
    categories[issue.category] = (categories[issue.category] || 0) + 1;
    
    switch (issue.severity) {
      case 'critical':
        criticalIssues++;
        break;
      case 'high':
        highIssues++;
        break;
      case 'medium':
        mediumIssues++;
        break;
      case 'low':
        lowIssues++;
        break;
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalIssues: issues.length,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    categories,
    issues,
    summary
  };
}

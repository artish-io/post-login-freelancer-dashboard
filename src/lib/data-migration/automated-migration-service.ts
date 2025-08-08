/**
 * Automated Migration Service
 * 
 * Provides automated fixes for common data validation issues
 */

import { ValidationIssue } from '../data-validation/validation-service';
import { migrateTaskStorageLocations } from '../project-tasks/data-migration';
import { updateProject } from '../projects-utils';
import { writeTask } from '../project-tasks/hierarchical-storage';

export interface MigrationResult {
  issueId: string;
  success: boolean;
  action: string;
  details: any;
  error?: string;
}

export interface AutoMigrationReport {
  timestamp: string;
  totalIssues: number;
  fixedIssues: number;
  failedIssues: number;
  skippedIssues: number;
  results: MigrationResult[];
  summary: {
    storageInconsistencies: number;
    missingFields: number;
    dataIntegrityIssues: number;
    otherIssues: number;
  };
}

/**
 * Run automated migration to fix validation issues
 */
export async function runAutomatedMigration(
  issues: ValidationIssue[],
  options: {
    dryRun?: boolean;
    categories?: string[];
    maxFixes?: number;
  } = {}
): Promise<AutoMigrationReport> {
  console.log(`🔧 Starting automated migration for ${issues.length} issues...`);
  
  const { dryRun = false, categories = [], maxFixes = 100 } = options;
  const results: MigrationResult[] = [];
  const summary = {
    storageInconsistencies: 0,
    missingFields: 0,
    dataIntegrityIssues: 0,
    otherIssues: 0
  };

  // Filter issues if categories specified
  let issuesToFix = categories.length > 0 
    ? issues.filter(issue => categories.includes(issue.category))
    : issues;

  // Limit number of fixes
  issuesToFix = issuesToFix.slice(0, maxFixes);

  let fixedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const issue of issuesToFix) {
    try {
      const result = await fixIssue(issue, dryRun);
      results.push(result);

      if (result.success) {
        fixedCount++;
      } else {
        failedCount++;
      }

      // Update summary
      switch (issue.category) {
        case 'storage_consistency':
          summary.storageInconsistencies++;
          break;
        case 'data_integrity':
          summary.dataIntegrityIssues++;
          break;
        default:
          if (issue.issue.toLowerCase().includes('missing')) {
            summary.missingFields++;
          } else {
            summary.otherIssues++;
          }
      }

    } catch (error) {
      failedCount++;
      results.push({
        issueId: `${issue.entityType}-${issue.entityId}`,
        success: false,
        action: 'fix_attempt',
        details: { issue },
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle special cases that require batch operations
  if (!dryRun) {
    const storageIssues = issuesToFix.filter(i => i.category === 'storage_consistency');
    if (storageIssues.length > 0) {
      try {
        console.log('🗄️ Running batch task storage migration...');
        const migrationResult = await migrateTaskStorageLocations();
        
        results.push({
          issueId: 'batch-storage-migration',
          success: true,
          action: 'batch_storage_migration',
          details: {
            migratedTasks: migrationResult.migratedTasks,
            totalTasks: migrationResult.totalTasks
          }
        });
      } catch (error) {
        results.push({
          issueId: 'batch-storage-migration',
          success: false,
          action: 'batch_storage_migration',
          details: {},
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  const report: AutoMigrationReport = {
    timestamp: new Date().toISOString(),
    totalIssues: issuesToFix.length,
    fixedIssues: fixedCount,
    failedIssues: failedCount,
    skippedIssues: skippedCount,
    results,
    summary
  };

  console.log(`✅ Migration complete: ${fixedCount} fixed, ${failedCount} failed, ${skippedCount} skipped`);
  return report;
}

/**
 * Fix a single validation issue
 */
async function fixIssue(issue: ValidationIssue, dryRun: boolean): Promise<MigrationResult> {
  const issueId = `${issue.entityType}-${issue.entityId}`;
  
  if (dryRun) {
    return {
      issueId,
      success: true,
      action: 'dry_run_simulation',
      details: { issue, wouldFix: getFixAction(issue) }
    };
  }

  try {
    switch (issue.category) {
      case 'project':
        return await fixProjectIssue(issue);
      
      case 'task':
        return await fixTaskIssue(issue);
      
      case 'invoice':
        return await fixInvoiceIssue(issue);
      
      case 'storage_consistency':
        return await fixStorageConsistencyIssue(issue);
      
      case 'data_integrity':
        return await fixDataIntegrityIssue(issue);
      
      default:
        return {
          issueId,
          success: false,
          action: 'unsupported_category',
          details: { category: issue.category },
          error: 'Unsupported issue category for automated fixing'
        };
    }
  } catch (error) {
    return {
      issueId,
      success: false,
      action: 'fix_error',
      details: { issue },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fix project-related issues
 */
async function fixProjectIssue(issue: ValidationIssue): Promise<MigrationResult> {
  const issueId = `project-${issue.entityId}`;
  
  if (issue.issue.includes('Missing creation date')) {
    // Add missing createdAt timestamp
    await updateProject(Number(issue.entityId), {
      createdAt: new Date().toISOString()
    });
    
    return {
      issueId,
      success: true,
      action: 'add_creation_date',
      details: { projectId: issue.entityId }
    };
  }
  
  if (issue.issue.includes('Invalid or missing project status')) {
    // Set default status to 'ongoing'
    await updateProject(Number(issue.entityId), {
      status: 'ongoing'
    });
    
    return {
      issueId,
      success: true,
      action: 'set_default_status',
      details: { projectId: issue.entityId, status: 'ongoing' }
    };
  }

  return {
    issueId,
    success: false,
    action: 'unsupported_project_fix',
    details: { issue: issue.issue },
    error: 'No automated fix available for this project issue'
  };
}

/**
 * Fix task-related issues
 */
async function fixTaskIssue(issue: ValidationIssue): Promise<MigrationResult> {
  const issueId = `task-${issue.entityId}`;
  
  if (issue.issue.includes('Task marked as completed but status is not approved')) {
    // This requires manual review, cannot be automatically fixed
    return {
      issueId,
      success: false,
      action: 'manual_review_required',
      details: { issue: issue.issue },
      error: 'Task completion status inconsistency requires manual review'
    };
  }

  return {
    issueId,
    success: false,
    action: 'unsupported_task_fix',
    details: { issue: issue.issue },
    error: 'No automated fix available for this task issue'
  };
}

/**
 * Fix invoice-related issues
 */
async function fixInvoiceIssue(issue: ValidationIssue): Promise<MigrationResult> {
  const issueId = `invoice-${issue.entityId}`;
  
  // Most invoice issues require manual review
  return {
    issueId,
    success: false,
    action: 'manual_review_required',
    details: { issue: issue.issue },
    error: 'Invoice issues require manual review for data integrity'
  };
}

/**
 * Fix storage consistency issues
 */
async function fixStorageConsistencyIssue(issue: ValidationIssue): Promise<MigrationResult> {
  const issueId = `storage-${issue.entityId}`;
  
  // Storage consistency issues are handled by batch migration
  return {
    issueId,
    success: true,
    action: 'scheduled_for_batch_migration',
    details: { issue: issue.issue }
  };
}

/**
 * Fix data integrity issues
 */
async function fixDataIntegrityIssue(issue: ValidationIssue): Promise<MigrationResult> {
  const issueId = `integrity-${issue.entityId}`;
  
  if (issue.issue.includes('Orphaned task')) {
    // Orphaned tasks require manual decision - delete or reassign
    return {
      issueId,
      success: false,
      action: 'manual_decision_required',
      details: { issue: issue.issue },
      error: 'Orphaned tasks require manual decision to delete or reassign'
    };
  }

  return {
    issueId,
    success: false,
    action: 'unsupported_integrity_fix',
    details: { issue: issue.issue },
    error: 'No automated fix available for this data integrity issue'
  };
}

/**
 * Get the action that would be taken to fix an issue
 */
function getFixAction(issue: ValidationIssue): string {
  switch (issue.category) {
    case 'project':
      if (issue.issue.includes('Missing creation date')) return 'Add current timestamp as createdAt';
      if (issue.issue.includes('Invalid or missing project status')) return 'Set status to ongoing';
      break;
    case 'storage_consistency':
      return 'Migrate to correct storage location';
    case 'data_integrity':
      if (issue.issue.includes('Orphaned task')) return 'Requires manual review - delete or reassign';
      break;
  }
  return 'No automated fix available';
}

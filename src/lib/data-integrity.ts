/**
 * Data Integrity Validation Utilities
 * 
 * This module provides functions to validate data consistency between
 * projects and hierarchical project tasks to prevent silent data corruption.
 */

export interface DataIntegrityIssue {
  type: 'warning' | 'error';
  projectId: number;
  field: string;
  message: string;
  expected?: any;
  actual?: any;
}

export interface DataIntegrityReport {
  isValid: boolean;
  issues: DataIntegrityIssue[];
  summary: {
    totalProjects: number;
    issuesFound: number;
    warnings: number;
    errors: number;
  };
}

/**
 * Validates data consistency between projects and hierarchical project tasks
 */
export function validateDataIntegrity(
  projectsData: any[],
  projectTasksData: any[]
): DataIntegrityReport {
  const issues: DataIntegrityIssue[] = [];

  // Check for projects in projects.json that don't have corresponding task data
  projectsData.forEach(project => {
    const taskData = projectTasksData.find(pt => pt.projectId === project.projectId);
    
    if (!taskData) {
      issues.push({
        type: 'error',
        projectId: project.projectId,
        field: 'tasks',
        message: 'Project exists in projects.json but has no corresponding task data'
      });
      return;
    }

    // Validate totalTasks consistency
    const actualTaskCount = taskData.tasks?.length || 0;
    if (project.totalTasks && project.totalTasks !== actualTaskCount) {
      issues.push({
        type: 'warning',
        projectId: project.projectId,
        field: 'totalTasks',
        message: 'totalTasks in projects.json does not match actual task count',
        expected: actualTaskCount,
        actual: project.totalTasks
      });
    }

    // Check for deprecated progress field
    if (project.hasOwnProperty('progress')) {
      issues.push({
        type: 'warning',
        projectId: project.projectId,
        field: 'progress',
        message: 'Static progress field found in projects.json - should be calculated dynamically'
      });
    }

    // Validate organizationId consistency
    if (project.organizationId !== taskData.organizationId) {
      issues.push({
        type: 'error',
        projectId: project.projectId,
        field: 'organizationId',
        message: 'organizationId mismatch between projects and hierarchical project tasks',
        expected: taskData.organizationId,
        actual: project.organizationId
      });
    }
  });

  // Check for orphaned task data
  projectTasksData.forEach(taskData => {
    const project = projectsData.find(p => p.projectId === taskData.projectId);
    
    if (!project) {
      issues.push({
        type: 'warning',
        projectId: taskData.projectId,
        field: 'project',
        message: 'Task data exists but no corresponding project in projects.json'
      });
    }
  });

  const warnings = issues.filter(i => i.type === 'warning').length;
  const errors = issues.filter(i => i.type === 'error').length;

  return {
    isValid: errors === 0,
    issues,
    summary: {
      totalProjects: projectsData.length,
      issuesFound: issues.length,
      warnings,
      errors
    }
  };
}

/**
 * Calculates accurate progress based on task approval status
 */
export function calculateProjectProgress(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0;
  
  const approvedTasks = tasks.filter(task => task.status === 'Approved').length;
  return Math.round((approvedTasks / tasks.length) * 100);
}

/**
 * Logs data integrity issues to console with appropriate severity
 */
export function logDataIntegrityReport(report: DataIntegrityReport): void {
  if (report.isValid && report.issues.length === 0) {
    console.log('✅ Data integrity check passed - no issues found');
    return;
  }

  console.group('🔍 Data Integrity Report');
  console.log(`📊 Summary: ${report.summary.totalProjects} projects, ${report.summary.issuesFound} issues found`);
  
  if (report.summary.errors > 0) {
    console.log(`❌ Errors: ${report.summary.errors}`);
  }
  
  if (report.summary.warnings > 0) {
    console.log(`⚠️ Warnings: ${report.summary.warnings}`);
  }

  report.issues.forEach(issue => {
    const icon = issue.type === 'error' ? '❌' : '⚠️';
    console.log(`${icon} Project ${issue.projectId} (${issue.field}): ${issue.message}`);
    
    if (issue.expected !== undefined && issue.actual !== undefined) {
      console.log(`   Expected: ${issue.expected}, Actual: ${issue.actual}`);
    }
  });
  
  console.groupEnd();
}

/**
 * Development-only function to run data integrity checks
 */
export async function runDataIntegrityCheck(): Promise<DataIntegrityReport> {
  try {
    const [projectsRes, tasksRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/project-tasks')
    ]);

    if (!projectsRes.ok || !tasksRes.ok) {
      throw new Error('Failed to fetch data for integrity check');
    }

    const projectsData = await projectsRes.json();
    const tasksData = await tasksRes.json();

    const report = validateDataIntegrity(projectsData, tasksData);
    
    if (process.env.NODE_ENV === 'development') {
      logDataIntegrityReport(report);
    }

    return report;
  } catch (error) {
    console.error('🔥 Data integrity check failed:', error);
    throw error;
  }
}

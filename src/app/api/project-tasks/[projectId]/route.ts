// File: src/app/api/project-tasks/[projectId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { readProjectTasks } from '@/lib/project-tasks/hierarchical-storage';
import { readAllProjects } from '@/lib/projects-utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateFreelancerProjectAccess } from '@/lib/freelancer-access-control';
import { getTasks } from '@/lib/tasks/task-store';
import { validateProjectTaskConsistency } from '@/lib/validators/project-task-consistency';

/**
 * Map hierarchical task status to canonical format
 */
function mapHierarchicalStatus(status: string): 'todo' | 'in_progress' | 'review' | 'done' {
  const normalized = status?.toLowerCase() || 'todo';

  if (normalized.includes('ongoing') || normalized.includes('progress')) return 'in_progress';
  if (normalized.includes('review') || normalized.includes('submitted')) return 'review';
  if (normalized.includes('approved') || normalized.includes('done') || normalized.includes('completed')) return 'done';

  return 'todo';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId: projectIdParam } = await params;
    const projectId = Number(projectIdParam);

    if (isNaN(projectId)) {
      return NextResponse.json({
        error: 'Invalid project ID',
        code: 'INVALID_PROJECT_ID'
      }, { status: 400 });
    }

    // Validate session and access control
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // Load all projects to validate access
    const allProjects = await readAllProjects();

    // Validate that the user has access to this project
    const hasAccess = validateFreelancerProjectAccess(
      projectId,
      allProjects,
      session.user as any
    );

    if (!hasAccess) {
      return NextResponse.json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      }, { status: 403 });
    }

    // 📋 Validate project-task consistency and trigger consolidation if needed
    const validation = await validateProjectTaskConsistency(projectId, { logWarnings: true });
    if (validation.warnings.length > 0) {
      console.warn(`⚠️ Project ${projectId} has consistency issues:`, validation.warnings);
    }

    // 📋 Try to read from canonical tasks first, fallback to hierarchical storage
    let tasks;
    try {
      tasks = await getTasks(projectId);
      console.log(`✅ Using canonical tasks for project ${projectId}`);
    } catch (error) {
      console.warn(`⚠️ Canonical tasks failed for project ${projectId}, falling back to hierarchical storage:`, error);

      // Fallback to hierarchical storage
      const hierarchicalTasks = await readProjectTasks(projectId);
      if (hierarchicalTasks.length === 0) {
        return NextResponse.json({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        }, { status: 404 });
      }

      // Convert hierarchical tasks to canonical format for response
      tasks = hierarchicalTasks.map(task => ({
        id: task.taskId,
        title: task.title,
        status: mapHierarchicalStatus(task.status),
        milestoneId: task.milestoneId || null,
        completedAt: task.completed ? task.lastModified || new Date().toISOString() : null,
        links: {
          brief: '',
          work: task.link || ''
        },
        projectId: task.projectId,
        description: task.description,
        dueDate: task.dueDate,
        order: task.order,
        version: task.version,
        createdDate: task.createdDate,
        lastModified: task.lastModified
      }));
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        error: 'No tasks found for project',
        code: 'NO_TASKS_FOUND'
      }, { status: 404 });
    }

    // Get project info from the project data
    const project = allProjects.find(p => p.projectId === projectId);
    if (!project) {
      return NextResponse.json({
        error: 'Project metadata not found',
        code: 'PROJECT_METADATA_NOT_FOUND'
      }, { status: 404 });
    }

    // Convert canonical tasks to legacy format for backward compatibility
    const legacyTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status === 'done' ? 'Approved' :
              task.status === 'review' ? 'In review' :
              task.status === 'in_progress' ? 'Ongoing' : 'Ongoing',
      completed: task.status === 'done',
      order: task.order || 0,
      link: task.links?.work || '',
      dueDate: task.dueDate || '',
      rejected: false, // Will be determined by status
      feedbackCount: 0, // Legacy field
      pushedBack: false, // Legacy field
      version: task.version || 1,
      description: task.description || '',
      submittedDate: task.status === 'review' || task.status === 'done' ? task.lastModified : null,
      approvedDate: task.completedAt,
      rejectedDate: null, // Legacy field
      milestoneId: task.milestoneId
    }));

    return NextResponse.json({
      projectId: project.projectId,
      title: project.title,
      organizationId: project.organizationId || 0,
      typeTags: project.typeTags || [],
      tasks: legacyTasks,
      canonicalTasksUsed: true // Flag to indicate we're using the new system
    });
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      retryable: true
    }, { status: 500 });
  }
}
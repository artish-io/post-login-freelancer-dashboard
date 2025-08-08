import { NextResponse } from 'next/server';
import { getProjectById, updateProject, readAllProjects } from '@/app/api/payments/repos/projects-repo';
import { listTasksByProject } from '@/app/api/payments/repos/tasks-repo';
import { normalizeTaskStatus } from '@/app/api/payments/domain/types';

/**
 * API endpoint to automatically update project status when all tasks are approved
 * This ensures data consistency between hierarchical project tasks and projects
 */
export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // Read project from repo
    const project = await getProjectById(Number(projectId));
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Read project tasks from repo
    const projectTasks = await listTasksByProject(projectId);
    if (!projectTasks || projectTasks.length === 0) {
      return NextResponse.json({ error: 'Project tasks not found' }, { status: 404 });
    }

    // Check if all tasks are approved
    const allTasksApproved = projectTasks.every((task: any) =>
      normalizeTaskStatus(task.status) === 'approved' || task.completed === true
    );
    const hasApprovedTasks = projectTasks.some((task: any) =>
      normalizeTaskStatus(task.status) === 'approved' || task.completed === true
    );

    let newStatus = project.status;
    let statusChanged = false;

    if (allTasksApproved && project.status !== 'completed') {
      newStatus = 'completed';
      statusChanged = true;
    } else if (hasApprovedTasks && project.status !== 'ongoing') {
      newStatus = 'ongoing';
      statusChanged = true;
    }

    if (statusChanged) {
      // Update project status in hierarchical structure
      await updateProject(projectId, { status: newStatus });

      console.log(`✅ Auto-completed: Project ${projectId} status updated from "${project.status}" to "${newStatus}"`);

      return NextResponse.json({
        success: true,
        projectId,
        oldStatus: project.status,
        newStatus,
        allTasksApproved,
        totalTasks: projectTasks.length,
        approvedTasks: projectTasks.filter((t: any) =>
          normalizeTaskStatus(t.status) === 'approved' || t.completed === true
        ).length
      });
    }

    return NextResponse.json({
      success: true,
      projectId,
      status: project.status,
      message: 'No status change needed',
      allTasksApproved,
      totalTasks: projectTasks.length,
      approvedTasks: projectTasks.filter((t: any) =>
        normalizeTaskStatus(t.status) === 'approved' || t.completed === true
      ).length
    });

  } catch (error) {
    console.error('Auto-completion error:', error);
    return NextResponse.json({ error: 'Failed to auto-complete project' }, { status: 500 });
  }
}

/**
 * GET endpoint to check which projects need auto-completion
 */
export async function GET() {
  try {
    // Read data from repos
    const projects = await readAllProjects();

    const inconsistencies: any[] = [];

    // Loop through each project and get its tasks
    for (const project of projects) {
      const projectTasks = await listTasksByProject(project.projectId);

      if (projectTasks.length > 0) {
        const approvedTasks = projectTasks.filter((t: any) =>
          normalizeTaskStatus(t.status) === 'approved' || t.completed === true
        ).length;
        const totalTasks = projectTasks.length;
        const allTasksApproved = approvedTasks === totalTasks;

        if (allTasksApproved && project.status !== 'completed') {
          inconsistencies.push({
            projectId: project.projectId,
            title: project.title,
            currentStatus: project.status,
            recommendedStatus: 'completed',
            approvedTasks,
            totalTasks,
            issue: 'All tasks approved but project not completed'
          });
        } else if (approvedTasks > 0 && project.status !== 'ongoing' && project.status !== 'completed') {
          inconsistencies.push({
            projectId: project.projectId,
            title: project.title,
            currentStatus: project.status,
            recommendedStatus: 'ongoing',
            approvedTasks,
            totalTasks,
            issue: 'Has approved tasks but project not in ongoing status'
          });
        }
      }
    }

    return NextResponse.json({
      inconsistencies,
      totalProjects: projects.length,
      projectsNeedingUpdate: inconsistencies.length
    });

  } catch (error) {
    console.error('Auto-completion check error:', error);
    return NextResponse.json({ error: 'Failed to check auto-completion' }, { status: 500 });
  }
}

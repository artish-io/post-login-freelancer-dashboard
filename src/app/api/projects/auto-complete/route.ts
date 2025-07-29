import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { readProject, updateProject, readAllProjects } from '@/lib/projects-utils';
import { readAllTasks, convertHierarchicalToLegacy } from '@/lib/project-tasks/hierarchical-storage';

/**
 * API endpoint to automatically update project status when all tasks are approved
 * This ensures data consistency between project-tasks.json and projects.json
 */
export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // Read project from hierarchical structure
    const project = await readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Read project tasks from hierarchical structure
    const hierarchicalTasks = await readAllTasks();
    const projectTasks = convertHierarchicalToLegacy(hierarchicalTasks);

    const taskProject = projectTasks.find((pt: any) => pt.projectId === projectId);
    if (!taskProject) {
      return NextResponse.json({ error: 'Project tasks not found' }, { status: 404 });
    }

    // Check if all tasks are approved
    const allTasksApproved = taskProject.tasks.every((task: any) => task.status === 'Approved');
    const hasApprovedTasks = taskProject.tasks.some((task: any) => task.status === 'Approved');

    let newStatus = project.status;
    let statusChanged = false;

    if (allTasksApproved && project.status !== 'Completed') {
      newStatus = 'Completed';
      statusChanged = true;
    } else if (hasApprovedTasks && project.status === 'Ongoing') {
      newStatus = 'Active';
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
        totalTasks: taskProject.tasks.length,
        approvedTasks: taskProject.tasks.filter((t: any) => t.status === 'Approved').length
      });
    }

    return NextResponse.json({
      success: true,
      projectId,
      status: project.status,
      message: 'No status change needed',
      allTasksApproved,
      totalTasks: taskProject.tasks.length,
      approvedTasks: taskProject.tasks.filter((t: any) => t.status === 'Approved').length
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
    // Read data from hierarchical structures
    const hierarchicalTasks = await readAllTasks();
    const projectTasks = convertHierarchicalToLegacy(hierarchicalTasks);

    // Read all projects from hierarchical structure
    const projects = await readAllProjects();

    const inconsistencies: any[] = [];

    projectTasks.forEach((taskProject: any) => {
      const project = projects.find((p: any) => p.projectId === taskProject.projectId);
      
      if (project) {
        const approvedTasks = taskProject.tasks.filter((t: any) => t.status === 'Approved').length;
        const totalTasks = taskProject.tasks.length;
        const allTasksApproved = approvedTasks === totalTasks;

        if (allTasksApproved && project.status !== 'Completed') {
          inconsistencies.push({
            projectId: project.projectId,
            title: project.title,
            currentStatus: project.status,
            recommendedStatus: 'Completed',
            approvedTasks,
            totalTasks,
            issue: 'All tasks approved but project not completed'
          });
        } else if (approvedTasks > 0 && project.status === 'Ongoing') {
          inconsistencies.push({
            projectId: project.projectId,
            title: project.title,
            currentStatus: project.status,
            recommendedStatus: 'Active',
            approvedTasks,
            totalTasks,
            issue: 'Has approved tasks but project still ongoing'
          });
        }
      }
    });

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

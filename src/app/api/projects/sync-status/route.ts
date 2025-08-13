import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    // Load project from hierarchical structure
    const project = await UnifiedStorageService.readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Load project tasks from hierarchical structure
    const tasks = await UnifiedStorageService.listTasks(projectId);

    // Calculate task statistics
    const totalTasks = tasks.length;
    const approvedTasks = tasks.filter((task: any) => task.status === 'approved').length;
    const completedTasks = tasks.filter((task: any) => task.completed).length;
    const inReviewTasks = tasks.filter((task: any) => task.status === 'In review').length;
    const ongoingTasks = tasks.filter((task: any) => task.status === 'incomplete').length;

    // Determine new status based on task completion
    let newStatus = project.status;
    let shouldUpdate = false;

    if (approvedTasks === totalTasks && totalTasks > 0) {
      // All tasks are approved - project is completed
      newStatus = 'Completed';
      shouldUpdate = project.status !== 'Completed';
    } else if (approvedTasks > 0 || inReviewTasks > 0 || ongoingTasks > 0) {
      // Has active tasks - project is ongoing
      newStatus = 'Ongoing';
      shouldUpdate = project.status !== 'Ongoing';
    } else if (totalTasks === 0 || (completedTasks === 0 && approvedTasks === 0)) {
      // No tasks or no progress - project is paused
      newStatus = 'Paused';
      shouldUpdate = project.status !== 'Paused';
    }

    // Update totalTasks to match actual task count
    const actualTotalTasks = tasks.length;
    const taskCountNeedsUpdate = project.totalTasks !== actualTotalTasks;

    if (shouldUpdate || taskCountNeedsUpdate) {
      // Update the project in hierarchical structure
      // Update project with new status and task count
      const updatedProject = {
        ...project,
        status: newStatus as any,
        totalTasks: actualTotalTasks,
        updatedAt: new Date().toISOString()
      };
      await UnifiedStorageService.writeProject(updatedProject);

      return NextResponse.json({
        success: true,
        projectId,
        changes: {
          statusChanged: shouldUpdate,
          oldStatus: project.status,
          newStatus,
          taskCountChanged: taskCountNeedsUpdate,
          oldTotalTasks: project.totalTasks,
          newTotalTasks: actualTotalTasks
        },
        taskStats: {
          totalTasks,
          approvedTasks,
          completedTasks,
          inReviewTasks,
          ongoingTasks,
          progress: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        projectId,
        message: 'No changes needed',
        taskStats: {
          totalTasks,
          approvedTasks,
          completedTasks,
          inReviewTasks,
          ongoingTasks,
          progress: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
        }
      });
    }

  } catch (error) {
    console.error('Error syncing project status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to sync all projects
export async function GET() {
  try {
    // Load all projects from hierarchical structure
    const projects = await UnifiedStorageService.listProjects();

    const updates: any[] = [];

    // Process each project
    for (const project of projects) {
      const tasks = await UnifiedStorageService.listTasks(project.projectId);
      const totalTasks = tasks.length;
      const approvedTasks = tasks.filter((task: any) => task.status === 'Approved').length;
      const completedTasks = tasks.filter((task: any) => task.completed).length;
      const inReviewTasks = tasks.filter((task: any) => task.status === 'In review').length;
      const ongoingTasks = tasks.filter((task: any) => task.status === 'Ongoing').length;

      let newStatus = project.status;
      let shouldUpdate = false;

      if (approvedTasks === totalTasks && totalTasks > 0) {
        newStatus = 'Completed';
        shouldUpdate = project.status !== 'Completed';
      } else if (approvedTasks > 0 || inReviewTasks > 0 || ongoingTasks > 0) {
        newStatus = 'Ongoing';
        shouldUpdate = project.status !== 'Ongoing';
      } else if (totalTasks === 0 || (completedTasks === 0 && approvedTasks === 0)) {
        newStatus = 'Paused';
        shouldUpdate = project.status !== 'Paused';
      }

      const taskCountNeedsUpdate = project.totalTasks !== totalTasks;

      if (shouldUpdate || taskCountNeedsUpdate) {
        const oldStatus = project.status;
        const oldTotalTasks = project.totalTasks;

        // Update project using unified storage
        await UnifiedStorageService.writeProject({
          ...project,
          status: newStatus,
          totalTasks: totalTasks,
          updatedAt: new Date().toISOString()
        });

        updates.push({
          projectId: project.projectId,
          title: project.title,
          statusChanged: shouldUpdate,
          oldStatus: shouldUpdate ? oldStatus : project.status,
          newStatus,
          taskCountChanged: taskCountNeedsUpdate,
          oldTotalTasks: taskCountNeedsUpdate ? oldTotalTasks : project.totalTasks,
          newTotalTasks: totalTasks,
          progress: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synchronized ${updates.length} projects`,
      updates
    });

  } catch (error) {
    console.error('Error syncing all projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

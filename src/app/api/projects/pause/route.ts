import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { updateProject, readProject } from '@/lib/projects-utils';
import { NotificationStorage } from '@/lib/notifications/notification-storage';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';
import fs from 'fs';
import path from 'path';

// Commissioner-initiated pause
export async function POST(request: NextRequest) {
  try {
    const { projectId, commissionerId, projectTitle } = await request.json();

    if (!projectId || !commissionerId || !projectTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get project details to find freelancer
    const project = await readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update project status to paused
    await updateProject(projectId, { status: 'paused' });

    // Create notification event for freelancer
    const event = {
      id: `project_pause_${projectId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'project_paused',
      notificationType: NOTIFICATION_TYPES.PROJECT_PAUSED,
      actorId: commissionerId,
      targetId: project.freelancerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        message: `${project.commissionerName || 'Commissioner'} has paused ${projectTitle}. But not to worry, you will receive an update when they unpause it for work to continue!`
      },
      context: {
        projectId
      }
    };

    // Store the event
    NotificationStorage.addEvent(event);

    return NextResponse.json({
      success: true,
      message: 'Project paused successfully',
      projectId,
      status: 'paused'
    });

  } catch (error) {
    console.error('Error pausing project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Freelancer pause request
export async function PUT(request: NextRequest) {
  try {
    const { projectId, freelancerId, projectTitle, reason } = await request.json();

    if (!projectId || !freelancerId || !projectTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get project details to find commissioner
    const project = await readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get remaining milestone count
    // Use hierarchical storage for project tasks
    const { readAllTasks, convertHierarchicalToLegacy } = await import('@/lib/project-tasks/hierarchical-storage');
    const hierarchicalTasks = await readAllTasks();
    const projectTasksData = convertHierarchicalToLegacy(hierarchicalTasks);
    const projectTasks = projectTasksData.find((pt: any) => pt.projectId === projectId);
    const remainingTasks = projectTasks?.tasks?.filter((task: any) => !task.completed).length || 0;

    // Get freelancer name
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    const freelancer = usersData.find((user: any) => user.id === freelancerId);
    const freelancerName = freelancer?.name || 'Freelancer';

    // Create pause request event for commissioner
    const event = {
      id: `project_pause_request_${projectId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'project_pause_requested',
      notificationType: NOTIFICATION_TYPES.PROJECT_PAUSE_REQUESTED,
      actorId: freelancerId,
      targetId: project.commissionerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        pauseReason: reason || 'Freelancer requested project pause',
        freelancerName,
        remainingTasks,
        requestStatus: 'pending'
      },
      context: {
        projectId,
        freelancerId,
        requestId: `pause_req_${projectId}_${Date.now()}`
      }
    };

    // Store the event
    NotificationStorage.addEvent(event);

    return NextResponse.json({
      success: true,
      message: 'Pause request sent successfully',
      projectId,
      requestId: event.context.requestId,
      remainingTasks
    });

  } catch (error) {
    console.error('Error requesting project pause:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

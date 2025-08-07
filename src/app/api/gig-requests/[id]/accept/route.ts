import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readGig, updateGig, readAllGigs } from '@/lib/gigs/hierarchical-storage';
import { saveProject, readAllProjects, deleteProject } from '@/lib/projects-utils';
import { writeTask, readAllTasks, convertHierarchicalToLegacy } from '@/lib/project-tasks/hierarchical-storage';
import { eventLogger, NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';
import { readFile, writeFile } from 'fs/promises';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;
    const body = await request.json();

    // Handle both regular request IDs and targeted gig IDs
    const isTargetedRequest = requestId.startsWith('targeted_');
    let gigRequest: any = null;
    let gigId: number | null = null;

    if (isTargetedRequest) {
      // Handle targeted gig requests
      const actualGigId = parseInt(requestId.replace('targeted_', ''));
      if (isNaN(actualGigId)) {
        return NextResponse.json(
          { error: 'Invalid targeted gig ID' },
          { status: 400 }
        );
      }

      // Get the targeted gig
      const gig = await readGig(actualGigId);
      if (!gig || !gig.isTargetedRequest) {
        return NextResponse.json(
          { error: 'Targeted gig not found' },
          { status: 404 }
        );
      }

      gigId = actualGigId;
      gigRequest = {
        id: requestId,
        gigId: actualGigId,
        freelancerId: gig.targetFreelancerId,
        commissionerId: gig.commissionerId,
        organizationId: gig.organizationId,
        title: gig.title,
        status: 'accepted'
      };
    } else {
      // Handle regular gig requests
      const numericRequestId = parseInt(requestId);
      if (isNaN(numericRequestId)) {
        return NextResponse.json(
          { error: 'Invalid request ID' },
          { status: 400 }
        );
      }

      // Read gig requests data from hierarchical storage
      const { readAllGigRequests } = await import('../../../../../lib/gigs/gig-request-storage');
      const requestsData = await readAllGigRequests();

      // Find the specific request
      const requestIndex = requestsData.findIndex((r: any) => r.id === numericRequestId);

      if (requestIndex === -1) {
        return NextResponse.json(
          { error: 'Gig request not found' },
          { status: 404 }
        );
      }

      gigRequest = requestsData[requestIndex];
      gigId = gigRequest.gigId;
    }

    // Check if project already exists for this gig to prevent duplicates
    const existingProjectsPath = path.join(process.cwd(), 'data', 'projects');
    const projectsData = await import('@/lib/projects-utils').then(m => m.readAllProjects());
    const existingProject = projectsData.find((p: any) => p.gigId === gigId);

    if (existingProject) {
      return NextResponse.json(
        { error: 'Project already exists for this gig' },
        { status: 409 }
      );
    }

    // Read additional data for project creation
    const [organizationsData, usersData] = await Promise.all([
      readFile(path.join(process.cwd(), 'data/organizations.json'), 'utf-8').then(data => JSON.parse(data)),
      readFile(path.join(process.cwd(), 'data/users.json'), 'utf-8').then(data => JSON.parse(data))
    ]);

    // Find organization and manager
    const organization = organizationsData.find((org: any) => org.id === gigRequest.organizationId);
    const manager = usersData.find((user: any) => user.id === organization?.contactPersonId);

    if (!organization || !manager) {
      return NextResponse.json(
        { error: 'Organization or manager not found' },
        { status: 404 }
      );
    }

    // Validation guards
    if (!gigRequest.title && !gigData.title) {
      return NextResponse.json(
        { error: 'Gig request missing required title' },
        { status: 400 }
      );
    }

    if (!gigRequest.freelancerId || !gigRequest.commissionerId) {
      return NextResponse.json(
        { error: 'Gig request missing required freelancer or commissioner ID' },
        { status: 400 }
      );
    }

    // Get gig details for project creation (if exists)
    const gig = await readGig(gigId!);

    // For standalone gig requests without corresponding gigs, create minimal gig data
    const gigData = gig || {
      title: gigRequest.title,
      description: gigRequest.notes || `Project for ${gigRequest.title}`,
      tags: gigRequest.skills || [],
      deliveryTimeWeeks: 4, // Default delivery time
      status: 'Available'
    };

    // Generate new project ID
    const maxProjectId = Math.max(...projectsData.map((p: any) => p.projectId), 0);
    const newProjectId = maxProjectId + 1;

    // Determine task count based on gig milestones
    const milestoneCount = gigData.milestones && Array.isArray(gigData.milestones) ? gigData.milestones.length : 1;

    // Create new project
    const newProject = {
      projectId: newProjectId,
      title: gigRequest.title || gigData.title,
      description: gigData.description,
      organizationId: gigRequest.organizationId,
      typeTags: gigData.tags || [],
      manager: {
        name: manager.name,
        title: manager.title,
        avatar: manager.avatar,
        email: manager.email
      },
      commissionerId: gigRequest.commissionerId,
      freelancerId: gigRequest.freelancerId,
      status: 'ongoing',
      dueDate: gigData.endDate || new Date(Date.now() + (gigData.deliveryTimeWeeks || 4) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalTasks: milestoneCount,
      gigId: gigId, // Link to original gig (may be null for standalone requests)
      createdAt: new Date().toISOString()
    };

    // Save project
    await saveProject(newProject);

    // Generate tasks from gig milestones or create default task
    const hierarchicalTasks = await readAllTasks();
    const projectTasksData = convertHierarchicalToLegacy(hierarchicalTasks);
    let tasksToCreate = [];

    if (gigData.milestones && Array.isArray(gigData.milestones) && gigData.milestones.length > 0) {
      // Create tasks from milestones
      const maxTaskId = Math.max(...projectTasksData.flatMap((p: any) => p.tasks?.map((t: any) => t.id) || []), 0);

      tasksToCreate = gigData.milestones.map((milestone: any, index: number) => ({
        taskId: maxTaskId + index + 1,
        projectId: newProjectId,
        projectTitle: newProject.title,
        organizationId: newProject.organizationId,
        projectTypeTags: newProject.typeTags,
        title: milestone.title,
        status: 'Ongoing',
        completed: false,
        order: index + 1,
        link: '',
        dueDate: milestone.endDate || new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        rejected: false,
        feedbackCount: 0,
        pushedBack: false,
        version: 1,
        description: milestone.description || `Work on ${milestone.title}`,
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }));
    } else {
      // Create default task if no milestones
      const maxTaskId = Math.max(...projectTasksData.flatMap((p: any) => p.tasks?.map((t: any) => t.id) || []), 0);

      tasksToCreate = [{
        taskId: maxTaskId + 1,
        projectId: newProjectId,
        projectTitle: newProject.title,
        organizationId: newProject.organizationId,
        projectTypeTags: newProject.typeTags,
        title: `Initial setup for ${newProject.title}`,
        status: 'Ongoing',
        completed: false,
        order: 1,
        link: '',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        rejected: false,
        feedbackCount: 0,
        pushedBack: false,
        version: 1,
        description: `Begin work on ${newProject.title} project`,
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }];
    }

    // Save tasks to hierarchical structure
    try {
      await Promise.all(tasksToCreate.map(task => writeTask(task)));

      // Validate that tasks were created successfully
      if (tasksToCreate.length === 0) {
        throw new Error('No tasks were created for the project');
      }

      console.log(`✅ Successfully created ${tasksToCreate.length} tasks for project ${newProjectId}`);
    } catch (taskError) {
      console.error('Failed to create project tasks:', taskError);
      // Clean up the project if task creation failed
      try {
        await deleteProject(newProjectId);
      } catch (cleanupError) {
        console.error('Failed to clean up project after task creation failure:', cleanupError);
      }
      return NextResponse.json(
        { error: 'Failed to create project tasks' },
        { status: 500 }
      );
    }

    // Update gig status to unavailable (only if gig exists)
    if (gig) {
      await updateGig(gigId!, { status: 'Unavailable' });
    }

    // Update request status for regular requests
    if (!isTargetedRequest) {
      // TODO: Implement hierarchical update for gig request status
      // For now, we'll skip this update since the data is now in hierarchical structure
      // This functionality should be implemented in a future update
      console.log(`Gig request ${requestId} accepted, but status update skipped (hierarchical storage)`);
    }

    // Create project activation notification for commissioner
    try {
      // Validate notification context
      if (!newProjectId || !gigRequest.freelancerId || !gigRequest.commissionerId) {
        throw new Error('Missing required notification context');
      }

      await eventLogger.logEvent({
        id: `project_activated_${newProjectId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'project_activated',
        notificationType: NOTIFICATION_TYPES.PROJECT_ACTIVATED,
        actorId: gigRequest.freelancerId, // Freelancer who accepted
        targetId: gigRequest.commissionerId, // Commissioner who gets notified
        entityType: ENTITY_TYPES.PROJECT,
        entityId: newProjectId,
        metadata: {
          projectTitle: newProject.title,
          gigTitle: gigRequest.title || gigData.title,
          taskCount: newProject.totalTasks,
          dueDate: newProject.dueDate,
          freelancerName: 'Freelancer', // Will be resolved by notification system
          organizationName: organization.name
        },
        context: {
          projectId: newProjectId,
          gigId: gigId,
          requestId: gigRequest.id
        }
      });

      console.log(`✅ Successfully sent project activation notification for project ${newProjectId}`);
    } catch (eventError) {
      console.error('Failed to log project activation event:', eventError);
      // Don't fail the main operation if event logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Gig request accepted successfully and project created',
      projectId: newProjectId,
      request: gigRequest
    });
  } catch (error) {
    console.error('Error accepting gig request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { readGig, updateGig } from '@/lib/gigs/hierarchical-storage';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { eventLogger, NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';
import { updateGigRequestStatus } from '@/lib/gigs/gig-request-storage';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;
    const body = await request.json();

    console.log(`🔍 Processing gig request acceptance: ${requestId}`);

    // Handle both regular request IDs and targeted gig IDs
    const isTargetedRequest = requestId.startsWith('targeted_');
    let gigRequest: any = null;
    let gigId: number | null = null;

    if (isTargetedRequest) {
      // Handle targeted gig requests
      const actualGigId = parseInt(requestId.replace('targeted_', ''));
      if (isNaN(actualGigId)) {
        console.log(`❌ Invalid targeted gig ID: ${requestId}`);
        return NextResponse.json(
          { error: 'Invalid targeted gig ID' },
          { status: 400 }
        );
      }

      // Get the targeted gig
      const gig = await readGig(actualGigId);
      if (!gig || !gig.isTargetedRequest) {
        console.log(`❌ Targeted gig not found: ${actualGigId}`);
        return NextResponse.json(
          { error: 'Targeted gig not found' },
          { status: 404 }
        );
      }

      gigId = actualGigId;
      // Fix: Use correct property name from gig data structure
      const targetFreelancerId = (gig as any).targetFreelancerId || body.freelancerId;

      if (!targetFreelancerId) {
        console.log(`❌ No target freelancer ID found for targeted gig ${actualGigId}`);
        return NextResponse.json(
          { error: 'Target freelancer not specified' },
          { status: 400 }
        );
      }

      gigRequest = {
        id: requestId,
        gigId: actualGigId,
        freelancerId: targetFreelancerId,
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

    // Check if project already exists for this specific request to prevent duplicates
    const { readAllProjects } = await import('@/lib/projects-utils');
    const projectsData = await readAllProjects();

    // Fix Issue 1: Improved duplicate detection logic
    let existingProject = null;

    if (gigId !== null) {
      // For requests with actual gig IDs, check by gigId + freelancerId
      existingProject = projectsData.find((p: any) =>
        p.gigId === gigId && p.freelancerId === gigRequest.freelancerId
      );
      console.log(`🔍 Checking for existing project by gigId: gigId=${gigId}, freelancerId=${gigRequest.freelancerId}`);
    } else {
      // For standalone gig requests (gigId: null), check by request-specific criteria
      // We need to check if this specific request has already been accepted
      // This is more complex and should involve checking the gig request status
      console.log(`🔍 Standalone gig request (gigId=null): checking request status instead of project existence`);

      // Check if this specific request has already been accepted
      const { readAllGigRequests } = await import('@/lib/gigs/gig-request-storage');
      const allRequests = await readAllGigRequests();
      const currentRequest = allRequests.find((r: any) => r.id === parseInt(requestId));

      if (currentRequest && currentRequest.status === 'Accepted') {
        console.log(`❌ Gig request ${requestId} has already been accepted`);
        return NextResponse.json(
          { error: 'This gig request has already been accepted' },
          { status: 409 }
        );
      }

      // For standalone requests, we don't check project existence by gigId since it's null
      // Multiple standalone requests can create separate projects
    }

    console.log(`🔍 Found existing project:`, existingProject ? {
      projectId: existingProject.projectId,
      freelancerId: existingProject.freelancerId,
      status: existingProject.status,
      gigId: (existingProject as any).gigId
    } : 'None');

    if (existingProject) {
      console.log(`❌ Project already exists for gig ${gigId} and freelancer ${gigRequest.freelancerId}`);
      return NextResponse.json(
        { error: 'Project already exists for this gig' },
        { status: 409 }
      );
    }

    // Read additional data for project creation
    const [organizationsData, usersData] = await Promise.all([
      import('@/lib/storage/unified-storage-service').then(m => m.getAllOrganizations()),
      import('@/lib/storage/unified-storage-service').then(m => m.getAllUsers())
    ]);

    // Find organization and manager
    const organization = organizationsData.find((org: any) => org.id === gigRequest.organizationId);
    const manager = usersData.find((user: any) => user.id === organization?.contactPersonId);

    if (!organization || !manager) {
      console.log(`❌ Organization or manager not found: orgId=${gigRequest.organizationId}`);
      return NextResponse.json(
        { error: 'Organization or manager not found' },
        { status: 404 }
      );
    }

    // Get gig details for project creation (if exists)
    const gig = await readGig(gigId!);
    console.log(`🔍 Fetched gig data:`, gig ? { id: gig.id, title: gig.title, status: gig.status } : 'No gig found');

    // For standalone gig requests without corresponding gigs, create minimal gig data
    const gigData = gig || {
      title: gigRequest.title,
      description: gigRequest.notes || `Project for ${gigRequest.title}`,
      tags: gigRequest.skills || [],
      deliveryTimeWeeks: 4, // Default delivery time
      status: 'Available'
    };

    // Validation guards
    if (!gigRequest.title && !gigData.title) {
      console.log(`❌ Missing title in both gig request and gig data`);
      return NextResponse.json(
        { error: 'Gig request missing required title' },
        { status: 400 }
      );
    }

    if (!gigRequest.freelancerId || !gigRequest.commissionerId) {
      console.log(`❌ Missing freelancer or commissioner ID: freelancer=${gigRequest.freelancerId}, commissioner=${gigRequest.commissionerId}`);
      return NextResponse.json(
        { error: 'Gig request missing required freelancer or commissioner ID' },
        { status: 400 }
      );
    }

    // Generate new project ID
    const maxProjectId = Math.max(...projectsData.map((p: any) => p.projectId), 0);
    const newProjectId = maxProjectId + 1;

    // Determine task count based on gig milestones (with proper type checking)
    const milestones = (gigData as any).milestones;
    const milestoneCount = milestones && Array.isArray(milestones) ? milestones.length : 1;

    // Create new project with all required fields
    const newProject = {
      projectId: newProjectId,
      id: newProjectId, // Fix Issue 2: Add 'id' field for frontend compatibility
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
      dueDate: (gigData as any).endDate || new Date(Date.now() + (gigData.deliveryTimeWeeks || 4) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalTasks: milestoneCount,
      invoicingMethod: (gigData as any).executionMethod || (gigData as any).invoicingMethod || 'completion', // CRITICAL: Use executionMethod from gig
      budget: {
        lower: (gigData as any).lowerBudget || gigRequest.budget || 0,
        upper: (gigData as any).upperBudget || gigRequest.budget || 0,
        currency: 'USD'
      },
      gigId: gigId, // Link to original gig (may be null for standalone requests)
      createdAt: new Date().toISOString()
    };

    console.log(`🔍 Creating project:`, {
      projectId: newProject.projectId,
      title: newProject.title,
      freelancerId: newProject.freelancerId,
      commissionerId: newProject.commissionerId,
      status: newProject.status,
      totalTasks: newProject.totalTasks
    });

    // Save project using unified storage
    await UnifiedStorageService.writeProject(newProject);

    // Generate tasks from gig milestones or create default task
    const allProjects = await UnifiedStorageService.listProjects();
    const allTasks = [];
    for (const project of allProjects) {
      const projectTasks = await UnifiedStorageService.listTasks(project.projectId);
      allTasks.push(...projectTasks);
    }

    let tasksToCreate: any[] = [];

    // Use the milestones variable we already created
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      // Create tasks from milestones
      const maxTaskId = Math.max(...allTasks.map((t: any) => t.taskId || 0), 0);

      tasksToCreate = milestones.map((milestone: any, index: number) => ({
        taskId: maxTaskId + index + 1,
        projectId: newProjectId,
        projectTitle: newProject.title,
        organizationId: newProject.organizationId,
        projectTypeTags: newProject.typeTags,
        freelancerId: gigRequest.freelancerId, // Fix Issue 3: Add freelancerId to tasks
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
        createdDate: newProject.createdAt, // Use project creation date for consistent storage
        lastModified: new Date().toISOString()
      }));
    } else {
      // Create default task if no milestones
      const maxTaskId = Math.max(...allTasks.map((t: any) => t.taskId || 0), 0);

      tasksToCreate = [{
        taskId: maxTaskId + 1,
        projectId: newProjectId,
        projectTitle: newProject.title,
        organizationId: newProject.organizationId,
        projectTypeTags: newProject.typeTags,
        freelancerId: gigRequest.freelancerId, // Fix Issue 3: Add freelancerId to tasks
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
        createdDate: newProject.createdAt, // Use project creation date for consistent storage
        lastModified: new Date().toISOString()
      }];
    }

    console.log(`🔍 Creating ${tasksToCreate.length} tasks for project ${newProjectId}:`,
      tasksToCreate.map(t => ({ taskId: t.taskId, title: t.title, freelancerId: t.freelancerId }))
    );

    // Save tasks to hierarchical structure
    try {
      // Use unified storage service for consistent storage
      await Promise.all(tasksToCreate.map((task: any) => UnifiedStorageService.writeTask(task)));

      // Validate that tasks were created successfully
      if (tasksToCreate.length === 0) {
        throw new Error('No tasks were created for the project');
      }

      console.log(`✅ Successfully created ${tasksToCreate.length} tasks for project ${newProjectId} using project creation date`);

      // Verify tasks were written correctly by re-reading them
      const verificationTasks = await UnifiedStorageService.listTasks(newProjectId);
      console.log(`🔍 Verification: Found ${verificationTasks.length} tasks for project ${newProjectId}`);

    } catch (taskError) {
      console.error('Failed to create project tasks:', taskError);
      // Clean up the project if task creation failed
      try {
        // Note: UnifiedStorageService doesn't have delete yet, so we'll log the error
        console.log(`⚠️ Project ${newProjectId} created but task creation failed. Manual cleanup may be needed.`);
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
      try {
        await updateGigRequestStatus(parseInt(requestId), {
          status: 'Accepted',
          acceptedAt: new Date().toISOString(),
          projectId: newProjectId,
          responses: [
            ...(gigRequest.responses || []),
            {
              type: 'accepted',
              timestamp: new Date().toISOString(),
              message: 'Offer accepted',
              projectId: newProjectId
            }
          ]
        });
        console.log(`✅ Gig request ${requestId} status updated to Accepted`);
      } catch (updateError) {
        console.error('Failed to update gig request status:', updateError);
        // Don't fail the main operation if status update fails
      }
    }

    // Create project activation notification for commissioner
    try {
      // Validate notification context
      if (!newProjectId || !gigRequest.freelancerId || !gigRequest.commissionerId) {
        throw new Error('Missing required notification context');
      }

      // Fix: Use correct event type from the EventType union
      await eventLogger.logEvent({
        id: `project_created_${newProjectId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'project_created', // Fix: Use valid EventType
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
          gigId: gigId || undefined, // Fix: Convert null to undefined
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

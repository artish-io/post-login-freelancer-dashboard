import { NextRequest, NextResponse } from 'next/server';
import { readGig, updateGig } from '@/lib/gigs/hierarchical-storage';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { eventLogger, NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';
import { updateGigRequestStatus } from '@/lib/gigs/gig-request-storage';

// File locking mechanism to prevent concurrent writes
const fileLocks = new Map<string, Promise<void>>();

/**
 * File locking mechanism to prevent race conditions
 */
async function withFileLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
  // Wait for any existing lock
  while (fileLocks.has(lockKey)) {
    await fileLocks.get(lockKey);
  }

  // Create new lock
  const lockPromise = (async () => {
    try {
      return await fn();
    } finally {
      fileLocks.delete(lockKey);
    }
  })();

  fileLocks.set(lockKey, lockPromise.then(() => {}));
  return lockPromise;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = id;

  // 🔒 Add file locking around the critical section
  return await withFileLock(`gig_request_${requestId}`, async () => {
  try {
    const requestId = id;
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

      // 🔒 Race condition check: Verify request hasn't been accepted already
      if (gigRequest.status === 'Accepted' || gigRequest.status === 'accepted') {
        console.log(`❌ Gig request ${requestId} already accepted`);
        return NextResponse.json(
          { error: 'Gig request already accepted' },
          { status: 409 }
        );
      }
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

    // 🚀 CRITICAL FIX: Determine invoicing method and create project accordingly
    const invoicingMethod = (gigData as any).executionMethod || (gigData as any).invoicingMethod || 'completion';
    const totalBudget = (gigData as any).upperBudget || gigRequest.budget || 0;

    console.log(`🔍 Creating ${invoicingMethod} project with budget: $${totalBudget}`);

    let newProject: any;

    try {

    if (invoicingMethod === 'completion') {
      // 🔒 COMPLETION-BASED: Use completion project creation with upfront payment
      try {
        const completionProjectData = {
          title: gigRequest.title || gigData.title,
          description: gigData.description || gigRequest.notes || '',
          totalBudget: totalBudget,
          totalTasks: milestoneCount,
          executionMethod: 'completion',
          invoicingMethod: 'completion',
          freelancerId: gigRequest.freelancerId,
          commissionerId: gigRequest.commissionerId,
          organizationId: gigRequest.organizationId,
          gigId: gigId, // Link to original gig
          dueDate: (gigData as any).endDate || new Date(Date.now() + (gigData.deliveryTimeWeeks || 4) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        console.log(`🔄 Calling completion project creation API...`);

        // Call completion project creation route (includes upfront payment)
        const completionResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/projects/completion/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || ''
          },
          body: JSON.stringify(completionProjectData)
        });

        if (!completionResponse.ok) {
          const errorText = await completionResponse.text();
          console.error(`❌ Completion API failed with status ${completionResponse.status}:`, errorText);
          throw new Error(`Completion project creation failed: ${errorText}`);
        }

        const completionResult = await completionResponse.json();

        if (!completionResult.success) {
          console.error('❌ Completion result failed:', completionResult);
          throw new Error('Completion project creation failed: ' + (completionResult.error || 'Unknown error'));
        }

        newProject = {
          ...completionResult.data.project,
          // Ensure compatibility with existing frontend expectations
          id: completionResult.data.project.projectId,
          organizationId: gigRequest.organizationId,
          typeTags: gigData.tags || [],
          manager: {
            name: manager.name,
            title: manager.title,
            avatar: manager.avatar,
            email: manager.email
          },
          gigId: gigId
        };

        // 🛡️ CRITICAL GUARD: Verify upfront payment was successful
        if (!newProject.upfrontPaid) {
          console.error('❌ Upfront payment verification failed');
          throw new Error('Upfront payment failed - project activation incomplete');
        }

        console.log(`✅ Completion project created successfully:`, {
          projectId: newProject.projectId,
          upfrontAmount: newProject.upfrontAmount,
          upfrontPaid: newProject.upfrontPaid
        });

      } catch (error) {
        console.error('❌ Completion project creation failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to create completion project: ${errorMessage}`);
      }

    } else {
      // 🔄 MILESTONE-BASED: Use existing milestone project creation
      newProject = {
        projectId: newProjectId,
        id: newProjectId,
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
        status: 'ongoing' as const,
        dueDate: (gigData as any).endDate || new Date(Date.now() + (gigData.deliveryTimeWeeks || 4) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalTasks: milestoneCount,
        invoicingMethod: 'milestone',
        budget: {
          lower: (gigData as any).lowerBudget || gigRequest.budget || 0,
          upper: (gigData as any).upperBudget || gigRequest.budget || 0,
          currency: 'USD'
        },
        gigId: gigId,
        createdAt: new Date().toISOString()
      };

      // Save milestone project using unified storage
      await UnifiedStorageService.writeProject(newProject);
      console.log(`✅ Milestone project created: ${newProject.projectId}`);
    }

    } catch (projectCreationError) {
      console.error('❌ Project creation failed:', projectCreationError);
      const errorMessage = projectCreationError instanceof Error ? projectCreationError.message : 'Unknown error';

      return NextResponse.json({
        success: false,
        error: 'Failed to create project',
        details: errorMessage,
        invoicingMethod: invoicingMethod
      }, { status: 400 });
    }

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

    // 🎯 ENHANCED SUCCESS RESPONSE: Include payment information for completion projects
    const responseData: any = {
      success: true,
      projectId: newProject.projectId,
      request: gigRequest,
      invoicingMethod: newProject.invoicingMethod
    };

    if (invoicingMethod === 'completion') {
      // Include upfront payment details for completion projects
      responseData.message = 'Gig request accepted and upfront payment processed successfully';
      responseData.upfrontPayment = {
        amount: newProject.upfrontAmount,
        status: newProject.upfrontPaid ? 'paid' : 'failed',
        remainingBudget: newProject.remainingBudget
      };
      responseData.completionProject = {
        upfrontPaid: newProject.upfrontPaid,
        totalBudget: newProject.totalBudget,
        upfrontAmount: newProject.upfrontAmount,
        remainingBudget: newProject.remainingBudget
      };
    } else {
      // Standard message for milestone projects
      responseData.message = 'Gig request accepted successfully and project created';
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error accepting gig request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
  }); // Close withFileLock
}

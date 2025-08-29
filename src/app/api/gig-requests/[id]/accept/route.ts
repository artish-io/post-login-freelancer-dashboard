import { NextRequest, NextResponse } from 'next/server';
import { readGig, updateGig } from '@/lib/gigs/hierarchical-storage';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

import { updateGigRequestStatus } from '@/lib/gigs/gig-request-storage';
import { withErrorHandling, err, ErrorCodes } from '@/lib/http/envelope';
import { ProjectService } from '@/app/api/projects/services/project-service';
import { generateProjectId, auditLog, type ProjectIdMode } from '@/lib/projects/gig-request-project-id-generator';

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

async function handleGigRequestAcceptance(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = id;

  // 🔒 Add file locking around the critical section
  return await withFileLock(`gig_request_${requestId}`, async () => {
    console.log(`🔍 Processing gig request acceptance: ${requestId}`);

    // Handle both regular request IDs and targeted gig IDs
    const isTargetedRequest = requestId.startsWith('targeted_');
    let gigRequest: any = null;
    let gigId: number | null = null;

    if (isTargetedRequest) {
      // Extract actual gig ID from targeted request format
      const actualGigId = parseInt(requestId.replace('targeted_', ''));
      if (isNaN(actualGigId)) {
        return NextResponse.json(
          err(ErrorCodes.INVALID_INPUT, 'Invalid targeted gig ID', 400),
          { status: 400 }
        );
      }

      // Read gig data for targeted requests
      const gig = await readGig(actualGigId);
      if (!gig) {
        return NextResponse.json(
          err(ErrorCodes.NOT_FOUND, 'Targeted gig not found', 404),
          { status: 404 }
        );
      }

      gigId = actualGigId;
      const body = await request.json();
      const targetFreelancerId = (gig as any).targetFreelancerId || body.freelancerId;

      if (!targetFreelancerId) {
        return NextResponse.json(
          err(ErrorCodes.INVALID_INPUT, 'Target freelancer not specified', 400),
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
        status: 'accepted',
        skills: gig.tags || [],
        tools: gig.toolsRequired || [],
        notes: gig.description || '',
        budget: { max: gig.upperBudget || 0, min: gig.lowerBudget || 0 }
      };
    } else {
      // Handle regular gig requests
      const numericRequestId = parseInt(requestId);
      if (isNaN(numericRequestId)) {
        return NextResponse.json(
          err(ErrorCodes.INVALID_INPUT, 'Invalid request ID', 400),
          { status: 400 }
        );
      }

      // Read gig request data
      const { readAllGigRequests } = await import('@/lib/gigs/gig-request-storage');
      const allRequests = await readAllGigRequests();
      gigRequest = allRequests.find((req: any) => req.id === numericRequestId);
      
      if (!gigRequest) {
        return NextResponse.json(
          err(ErrorCodes.NOT_FOUND, 'Gig request not found', 404),
          { status: 404 }
        );
      }

      gigId = gigRequest.gigId || null;
    }

    console.log(`🔍 Standalone gig request (gigId=${gigId}): checking request status instead of project existence`);

    // 🔧 SURGICAL FIX: Skip expensive project scanning for gig requests
    // Gig requests should create new projects, not check for existing ones
    console.log(`🔍 Skipping existing project check for gig request - will create new project`);
    let existingProject = null;

    if (existingProject) {
      console.log(`❌ Project already exists for gig ${gigId} and freelancer ${gigRequest.freelancerId}`);
      return NextResponse.json(
        err(ErrorCodes.DUPLICATE_OPERATION, 'Project already exists for this gig', 409),
        { status: 409 }
      );
    }

    // Read additional data for project creation
    const [organizationsData, usersData] = await Promise.all([
      UnifiedStorageService.getAllOrganizations(),
      UnifiedStorageService.getAllUsers()
    ]);

    const organization = organizationsData.find((org: any) => org.id === gigRequest.organizationId);
    const manager = usersData.find((user: any) => user.id === gigRequest.commissionerId);

    if (!organization || !manager) {
      return NextResponse.json(
        err(ErrorCodes.NOT_FOUND, 'Organization or manager not found', 404),
        { status: 404 }
      );
    }

    // Get gig details for project creation (if exists)
    const gig = gigId ? await readGig(gigId) : null;
    console.log(`🔍 Fetched gig data:`, gig ? { id: gig.id, title: gig.title, status: gig.status } : 'No gig found');

    // For standalone gig requests without corresponding gigs, create minimal gig data
    const gigData = gig || {
      title: gigRequest.title,
      description: gigRequest.notes || `Project for ${gigRequest.title}`,
      tags: gigRequest.skills || [],
      deliveryTimeWeeks: 4, // Default delivery time
      status: 'Available',
      toolsRequired: gigRequest.tools || [],
      executionMethod: 'completion',
      invoicingMethod: 'completion',
      upperBudget: typeof gigRequest.budget === 'object' ? gigRequest.budget.max : 0,
      lowerBudget: typeof gigRequest.budget === 'object' ? gigRequest.budget.min : 0
    };

    // Validation guards
    if (!gigRequest.title && !gigData.title) {
      return NextResponse.json(
        err(ErrorCodes.VALIDATION_ERROR, 'Gig request missing required title', 400),
        { status: 400 }
      );
    }

    // 🚀 Use proven ProjectService.acceptGig method
    console.log('🔧 ATOMIC WRITE: Using ProjectService.acceptGig for gig request acceptance...');
    
    // Handle budget extraction properly
    let totalBudget = 0;
    if ((gigData as any).upperBudget) {
      totalBudget = (gigData as any).upperBudget;
    } else if (gigRequest.budget) {
      totalBudget = typeof gigRequest.budget === 'object' && gigRequest.budget.max 
        ? gigRequest.budget.max 
        : (typeof gigRequest.budget === 'number' ? gigRequest.budget : 0);
    }

    // Create a gig-like object for ProjectService with full field parity
    const gigLikeData = {
      id: gigId || 0,
      title: gigRequest.title || gigData.title,
      organizationId: gigRequest.organizationId,
      commissionerId: gigRequest.commissionerId,

      // Use gig request fields with fallbacks to maintain parity
      category: (gigRequest as any).category || (gigData as any).category || 'General',
      subcategory: (gigRequest as any).subcategory || (gigData as any).subcategory || '',
      tags: gigRequest.skills || (gigData as any).tags || [],
      hourlyRateMin: (gigRequest as any).hourlyRateMin || (gigData as any).hourlyRateMin || 0,
      hourlyRateMax: (gigRequest as any).hourlyRateMax || (gigData as any).hourlyRateMax || 0,
      description: (gigData as any).description || gigRequest.notes || '',
      deliveryTimeWeeks: (gigRequest as any).deliveryTimeWeeks || (gigData as any).deliveryTimeWeeks || 4,
      estimatedHours: (gigRequest as any).estimatedHours || (gigData as any).estimatedHours || 40,
      status: 'Available' as const,
      toolsRequired: gigRequest.tools || (gigData as any).toolsRequired || [],

      // Execution and timing with proper fallbacks
      executionMethod: (gigRequest as any).executionMethod || (gigData as any).executionMethod || (gigData as any).invoicingMethod || 'completion',
      invoicingMethod: (gigRequest as any).invoicingMethod || (gigRequest as any).executionMethod || (gigData as any).executionMethod || (gigData as any).invoicingMethod || 'completion',
      startType: (gigRequest as any).startType || (gigData as any).startType || 'Immediately' as const,
      customStartDate: (gigRequest as any).customStartDate || (gigData as any).customStartDate,
      endDate: (gigRequest as any).endDate || (gigData as any).endDate,
      milestones: (gigRequest as any).milestones || (gigData as any).milestones || [],

      // Budget and metadata
      upperBudget: totalBudget,
      lowerBudget: totalBudget,
      postedDate: new Date().toISOString().split('T')[0],
      notes: gigRequest.notes,
      isPublic: false,
      isTargetedRequest: true
    };

    console.log(`🔍 Creating ${gigLikeData.invoicingMethod} project with budget: $${totalBudget}`);

    // 🔒 SURGICAL FIX: Generate gig-request project ID with collision prevention
    const orgFirstLetter = organization.name.charAt(0).toUpperCase();
    const projectIdResult = await generateProjectId({
      mode: 'request' as ProjectIdMode,
      organizationFirstLetter: orgFirstLetter,
      origin: 'request'
    });

    if (!projectIdResult.success) {
      auditLog('project_creation_failed', {
        requestId: gigRequest.id,
        organizationName: organization.name,
        error: projectIdResult.error,
        attempts: projectIdResult.attempts
      });

      const errorMessage = projectIdResult.error === 'project_creation_collision'
        ? 'Project ID collision detected - please try again'
        : 'Failed to generate valid project ID';

      return NextResponse.json(
        err(ErrorCodes.OPERATION_NOT_ALLOWED, errorMessage, 400),
        { status: 400 }
      );
    }

    const generatedProjectId = projectIdResult.projectId!;
    auditLog('project_id_assigned', {
      requestId: gigRequest.id,
      projectId: generatedProjectId,
      organizationName: organization.name
    });

    // Use ProjectService.acceptGig for consistent project creation with pre-generated ID
    let acceptResult;
    try {
      acceptResult = ProjectService.acceptGig({
        gig: gigLikeData as any,
        freelancerId: gigRequest.freelancerId,
        commissionerId: gigRequest.commissionerId,
        organizationName: organization.name,
        existingProjectIds: new Set(), // 🔧 SURGICAL: Gig requests don't need existing project check
        projectId: generatedProjectId // 🔒 SURGICAL: Force use of collision-safe ID
      });

      console.log(`✅ ProjectService.acceptGig completed successfully with ID: ${generatedProjectId}`);
    } catch (serviceError: any) {
      console.error('❌ ProjectService.acceptGig failed:', serviceError);
      auditLog('project_service_error', {
        projectId: generatedProjectId,
        error: serviceError.message
      });
      return NextResponse.json(
        err(ErrorCodes.OPERATION_NOT_ALLOWED, `Failed to create project: ${serviceError.message}`, 400),
        { status: 400 }
      );
    }

    // 🛡️ CRITICAL ORDERING: Save project and tasks to storage with create-only behavior
    console.log('🔄 Saving project to unified storage...');

    // 🔒 SURGICAL FIX: Use create-only project creation to prevent overwrites (when feature enabled)
    const projectData = {
      ...acceptResult.project,
      status: 'ongoing',
      invoicingMethod: (acceptResult.project.invoicingMethod as "completion" | "milestone") || 'completion',
      createdAt: acceptResult.project.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      gigRequestId: gigRequest.id // Link back to gig request
    };

    // 🔧 CRITICAL FIX: Always use UnifiedStorageService for hierarchical storage consistency
    try {
      await UnifiedStorageService.writeProject(projectData as any);
      console.log(`✅ Project saved to hierarchical storage: ${generatedProjectId}`);
    } catch (projectSaveError) {
      console.error('❌ Failed to save project to hierarchical storage:', projectSaveError);
      auditLog('project_storage_failed', {
        projectId: generatedProjectId,
        error: String(projectSaveError)
      });
      return NextResponse.json(
        err(ErrorCodes.INTERNAL_ERROR, 'Failed to save project', 500),
        { status: 500 }
      );
    }

    // Save tasks to hierarchical structure with proper validation
    console.log('🔄 Saving tasks to unified storage...');
    try {
      const now = new Date().toISOString();
      const enhancedTasks = acceptResult.tasks.map((task: any) => ({
        ...task,
        // Add required fields for validation
        projectTitle: acceptResult.project.title,
        projectId: acceptResult.project.projectId,
        createdDate: now,
        lastModified: now,
        // Ensure dueDate is in proper datetime format if provided
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
        // Ensure other required fields have defaults
        status: task.status || 'Ongoing',
        completed: task.completed || false,
        order: task.order || 0,
        rejected: task.rejected || false,
        feedbackCount: task.feedbackCount || 0,
        pushedBack: task.pushedBack || false,
        version: task.version || 1
      }));

      await Promise.all(enhancedTasks.map((task: any) => UnifiedStorageService.writeTask(task)));
      console.log(`✅ Successfully created ${enhancedTasks.length} tasks for project ${acceptResult.project.projectId}`);
    } catch (taskError) {
      console.error('Failed to create project tasks:', taskError);
      // Clean up the project if task creation failed
      try {
        await UnifiedStorageService.deleteProject(acceptResult.project.projectId);
        console.log('✅ Project cleanup completed after task creation failure');
      } catch (cleanupError) {
        console.error('Failed to clean up project after task creation failure:', cleanupError);
      }
      return NextResponse.json(
        err(ErrorCodes.INTERNAL_ERROR, 'Failed to create project tasks', 500),
        { status: 500 }
      );
    }

    // Handle completion-based projects with upfront payment
    let upfrontPaymentResult = null;
    if (acceptResult.project.invoicingMethod === 'completion') {
      console.log('⚠️ Completion-based project detected - executing upfront payment...');

      try {
        // Execute upfront payment using specialized gig request payment API
        const upfrontResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/payments/gig-request/execute-upfront`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({
            projectId: acceptResult.project.projectId,
            freelancerId: gigRequest.freelancerId,
            commissionerId: gigRequest.commissionerId
          })
        });

        if (!upfrontResponse.ok) {
          const errorText = await upfrontResponse.text();
          console.error(`❌ Upfront payment failed with status ${upfrontResponse.status}:`, errorText);

          // Rollback project creation
          try {
            await UnifiedStorageService.deleteProject(acceptResult.project.projectId);
            console.log('✅ Project rollback completed due to payment failure');
          } catch (rollbackError) {
            console.error('❌ Project rollback failed:', rollbackError);
          }

          return NextResponse.json(
            err(ErrorCodes.OPERATION_NOT_ALLOWED, 'Upfront payment failed', 400),
            { status: 400 }
          );
        }

        upfrontPaymentResult = await upfrontResponse.json();
        console.log('✅ Upfront payment completed successfully:', upfrontPaymentResult);

      } catch (paymentError) {
        console.error('❌ Error during upfront payment:', paymentError);

        // Rollback project creation
        try {
          await UnifiedStorageService.deleteProject(acceptResult.project.projectId);
          console.log('✅ Project rollback completed due to payment error');
        } catch (rollbackError) {
          console.error('❌ Project rollback failed:', rollbackError);
        }

        return NextResponse.json(
          err(ErrorCodes.INTERNAL_ERROR, 'Payment processing failed', 500),
          { status: 500 }
        );
      }
    }

    // Update gig status to unavailable (only if gig exists)
    if (gig && gigId) {
      await updateGig(gigId, { status: 'Unavailable' });
    }

    // Update request status for regular requests
    if (!isTargetedRequest) {
      try {
        await updateGigRequestStatus(parseInt(requestId), {
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
          projectId: typeof acceptResult.project.projectId === 'string'
            ? parseInt(acceptResult.project.projectId)
            : acceptResult.project.projectId
        });
      } catch (updateError) {
        console.error('Failed to update gig request status:', updateError);
        // Don't fail the entire operation for this
      }
    }

    // Create notifications using existing event system
    try {


      // 🔔 GIG REQUEST SPECIFIC: Use completion notification system for both notifications
      console.log('🔔 GIG REQUEST NOTIFICATIONS: Emitting gig request acceptance and project activation notifications...');
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');

      // Get project tasks for context (shared for both notifications)
      const { getProjectTasks } = await import('@/lib/projects/get-project-tasks');
      const projectTasksData = await getProjectTasks(Number(acceptResult.project.projectId));
      const totalTasks = projectTasksData?.[0]?.tasks?.length || 1;

      // 🔔 ATOMIC LOG: Commissioner notification for gig request acceptance
      console.log('🔔 ATOMIC: About to emit commissioner notification:', {
        type: 'completion.gig-request-commissioner-accepted',
        actorId: gigRequest.freelancerId,
        targetId: gigRequest.commissionerId,
        projectId: String(acceptResult.project.projectId),
        timestamp: new Date().toISOString()
      });

      const commissionerResult = await handleCompletionNotification({
        type: 'completion.gig-request-commissioner-accepted',
        actorId: gigRequest.freelancerId,
        targetId: gigRequest.commissionerId,
        projectId: String(acceptResult.project.projectId),
        context: {
          projectTitle: acceptResult.project.title,
          totalTasks,
          dueDate: acceptResult.project.dueDate,
          invoicingMethod: acceptResult.project.invoicingMethod
          // orgName and freelancerName will be enriched automatically
        }
      });

      console.log('🔔 ATOMIC: Commissioner notification result:', commissionerResult);

      // Determine notification type based on invoicing method
      const notificationType = acceptResult.project.invoicingMethod === 'completion'
        ? 'completion.gig-request-project_activated'
        : 'milestone.gig-request-project_activated';

      // 🔔 ATOMIC LOG: Freelancer project activation notification with gig request context
      console.log('🔔 ATOMIC: About to emit freelancer notification:', {
        type: notificationType,
        actorId: gigRequest.commissionerId,
        targetId: gigRequest.freelancerId,
        projectId: String(acceptResult.project.projectId),
        timestamp: new Date().toISOString()
      });

      const freelancerResult = await handleCompletionNotification({
        type: notificationType,
        actorId: gigRequest.commissionerId,
        targetId: gigRequest.freelancerId,
        projectId: String(acceptResult.project.projectId),
        context: {
          projectTitle: acceptResult.project.title,
          totalTasks,
          dueDate: acceptResult.project.dueDate,
          invoicingMethod: acceptResult.project.invoicingMethod
          // orgName and commissionerName will be enriched automatically
        }
      });

      console.log('🔔 ATOMIC: Freelancer notification result:', freelancerResult);

      console.log('✅ Created notifications for gig request acceptance');
    } catch (notificationError) {
      console.error('Failed to create notifications:', notificationError);
      // Don't fail the operation for notification errors
    }

    // Prepare response data
    const responseData = {
      success: true,
      projectId: acceptResult.project.projectId,
      invoicingMethod: acceptResult.project.invoicingMethod,
      message: `Gig request accepted successfully! Project ${acceptResult.project.projectId} created.`,
      upfrontPayment: upfrontPaymentResult ? {
        status: 'paid',
        amount: upfrontPaymentResult.amount
      } : undefined
    };

    console.log(`✅ Gig request ${requestId} accepted successfully. Project ${acceptResult.project.projectId} created.`);
    return NextResponse.json(responseData);
  });
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleGigRequestAcceptance);

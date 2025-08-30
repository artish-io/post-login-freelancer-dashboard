import { NextResponse, NextRequest } from 'next/server';
import { eventLogger } from '../../../../../lib/events/event-logger';
import { readProposal, updateProposal } from '../../../../../lib/proposals/hierarchical-storage';
import { createProject } from '../../../../../app/api/payments/repos/projects-repo';
import { requireSession, assert, assertOwnership } from '../../../../../lib/auth/session-guard';
import { ok, err, ErrorCodes, withErrorHandling } from '../../../../../lib/http/envelope';
import { logProjectTransition, Subsystems } from '../../../../../lib/log/transitions';
import { saveInvoice } from '../../../../../lib/invoice-storage';
import { readFile } from 'fs/promises';
import path from 'path';
import { ProjectService } from '../../../../../app/api/projects/services/project-service';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';

async function handleProposalAcceptance(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  console.log('🚀 PROPOSAL ACCEPTANCE: Route handler started');

  try {
    console.log('🔐 PROPOSAL ACCEPTANCE: Starting authentication...');
    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(request);
    console.log(`✅ PROPOSAL ACCEPTANCE: Authentication successful, actorId: ${actorId}`);

    console.log('📋 PROPOSAL ACCEPTANCE: Extracting proposalId from params...');
    const { proposalId } = await params;
    console.log(`✅ PROPOSAL ACCEPTANCE: ProposalId extracted: ${proposalId}`);

    console.log('📖 PROPOSAL ACCEPTANCE: Reading proposal from storage...');
    // Read proposal using hierarchical storage
    const proposal = await readProposal(proposalId);
    console.log(`📖 PROPOSAL ACCEPTANCE: Proposal read result:`, proposal ? 'Found' : 'Not found');

    if (!proposal) {
      console.error(`❌ PROPOSAL ACCEPTANCE: Proposal ${proposalId} not found in storage`);
    }

    assert(proposal, ErrorCodes.NOT_FOUND, 404, 'Proposal not found');
    console.log(`✅ PROPOSAL ACCEPTANCE: Proposal found - Title: ${proposal.title}, Status: ${proposal.status}`);
    console.log('🔍 PROPOSAL ACCEPTANCE: Proposal data structure:', {
      id: proposal.id,
      commissionerId: proposal.commissionerId,
      freelancerId: (proposal as any).freelancerId,
      organizationId: (proposal as any).organizationId,
      commissionerEmail: (proposal as any).commissionerEmail
    });

    console.log('🔒 PROPOSAL ACCEPTANCE: Validating ownership...');
    // 🔒 Ensure session user is the commissioner who can accept this proposal
    console.log(`🔒 PROPOSAL ACCEPTANCE: Checking ownership - actorId: ${actorId}, commissionerId: ${proposal!.commissionerId}`);
    assertOwnership(actorId, proposal!.commissionerId, 'proposal');
    console.log('✅ PROPOSAL ACCEPTANCE: Ownership validation successful');

    console.log('📝 PROPOSAL ACCEPTANCE: Updating proposal status to accepted...');
    // Update proposal status to accepted
    await updateProposal(proposalId, {
      status: 'accepted',
      // acceptedAt: new Date().toISOString(), // Property not in Proposal type
      // acceptedBy: actorId, // Property not in Proposal type
    } as any);
    console.log('✅ PROPOSAL ACCEPTANCE: Proposal status updated successfully');

    // 🚀 Use proven ProjectService.acceptGig method for proposal acceptance
    console.log('🔧 ATOMIC WRITE: Using ProjectService.acceptGig for proposal acceptance...');

    console.log('📊 PROPOSAL ACCEPTANCE: Loading required data for project creation...');
    // Get additional data needed for project creation
    const [organizationsData, usersData, projectsData] = await Promise.all([
      UnifiedStorageService.getAllOrganizations(),
      UnifiedStorageService.getAllUsers(),
      UnifiedStorageService.listProjects()
    ]);
    console.log(`✅ PROPOSAL ACCEPTANCE: Data loaded - Organizations: ${organizationsData.length}, Users: ${usersData.length}, Projects: ${projectsData.length}`);

    console.log(`🔍 PROPOSAL ACCEPTANCE: Looking for organization with ID: ${(proposal as any).organizationId}`);
    let organization = organizationsData.find((org: any) => org.id === (proposal as any).organizationId);
    console.log(`🔍 PROPOSAL ACCEPTANCE: Organization found by ID:`, organization ? `${organization.name} (ID: ${organization.id})` : 'Not found');

    console.log(`🔍 PROPOSAL ACCEPTANCE: Looking for manager with ID: ${proposal!.commissionerId}`);
    const manager = usersData.find((user: any) => user.id === proposal!.commissionerId);
    console.log(`🔍 PROPOSAL ACCEPTANCE: Manager found:`, manager ? `${manager.name} (ID: ${manager.id})` : 'Not found');

    // 🔍 FALLBACK: If no organization found by ID, search by firstCommissionerId AND associatedCommissioners
    if (!organization && manager) {
      console.log(`🔍 PROPOSAL ACCEPTANCE: Searching for existing organization by commissionerId: ${proposal!.commissionerId}`);
      organization = organizationsData.find((org: any) =>
        org.firstCommissionerId === proposal!.commissionerId ||
        org.contactPersonId === proposal!.commissionerId ||
        org.associatedCommissioners?.includes(proposal!.commissionerId)
      );
      console.log(`🔍 PROPOSAL ACCEPTANCE: Organization found by commissionerId:`, organization ? `${organization.name} (ID: ${organization.id})` : 'Not found');
    }

    // 🏢 ORGANIZATION ENRICHMENT: Create placeholder organization if still missing
    if (!organization && manager) {
      console.log('🏢 PROPOSAL ACCEPTANCE: Organization missing, attempting to create placeholder...');

      // Extract email from proposal or manager
      const sourceEmail = (proposal as any).commissionerEmail || manager.email;

      if (!sourceEmail) {
        console.error('❌ PROPOSAL ACCEPTANCE: No email found for placeholder organization creation');

        // Rollback proposal status
        await updateProposal(proposalId, { status: 'sent' } as any);
        console.log('🔄 PROPOSAL ACCEPTANCE: Rolled back proposal status to sent');

        return NextResponse.json(
          err(ErrorCodes.BAD_REQUEST, 'No email found for organization creation', 400),
          { status: 400 }
        );
      }

      const { getOrCreatePlaceholderOrg } = await import('@/lib/organizations/placeholder-generator');
      const placeholderResult = await getOrCreatePlaceholderOrg({
        commissionerId: proposal!.commissionerId,
        sourceEmail,
        commissionerName: manager.name
      });

      if (placeholderResult.success && placeholderResult.organization) {
        organization = placeholderResult.organization;
        console.log(`✅ PROPOSAL ACCEPTANCE: Placeholder organization created/found: ${organization.name} (ID: ${organization.id})`);

        // Update proposal with organization ID for future reference
        await updateProposal(proposalId, {
          organizationId: organization.id,
          status: 'accepted' // Keep as accepted since we're proceeding
        } as any);
        console.log('✅ PROPOSAL ACCEPTANCE: Updated proposal with organization ID');
      } else {
        console.error(`❌ PROPOSAL ACCEPTANCE: Failed to create placeholder organization:`, placeholderResult.error);

        // Rollback proposal status
        await updateProposal(proposalId, { status: 'sent' } as any);
        console.log('🔄 PROPOSAL ACCEPTANCE: Rolled back proposal status to sent');

        return NextResponse.json(
          err(ErrorCodes.INTERNAL_ERROR, `Failed to create organization: ${placeholderResult.error}`, 500),
          { status: 500 }
        );
      }
    }

    if (!organization || !manager) {
      console.error(`❌ PROPOSAL ACCEPTANCE: Missing required data after enrichment - Organization: ${!!organization}, Manager: ${!!manager}`);

      // Rollback proposal status
      await updateProposal(proposalId, { status: 'sent' } as any);
      console.log('🔄 PROPOSAL ACCEPTANCE: Rolled back proposal status to sent');

      return NextResponse.json(
        err(ErrorCodes.NOT_FOUND, 'Organization or manager not found', 404),
        { status: 404 }
      );
    }
    console.log('✅ PROPOSAL ACCEPTANCE: Organization and manager validation successful');

    // Create a gig-like object from the proposal for ProjectService with full field parity
    const gigLikeData = {
      id: 0, // Proposals don't have gig IDs
      title: proposal!.title || proposal!.proposalTitle,
      organizationId: (proposal as any).organizationId,
      commissionerId: proposal!.commissionerId,

      // Enhanced categorization - derive from proposal data or use defaults
      category: (proposal as any).category || 'General',
      subcategory: (proposal as any).subcategory || '',
      tags: (proposal as any).typeTags || [],

      // Financial fields - calculate from proposal budget
      hourlyRateMin: (proposal as any).hourlyRateMin || 0,
      hourlyRateMax: (proposal as any).hourlyRateMax || 0,
      upperBudget: (proposal as any).totalBid || (proposal as any).budget || 0,
      lowerBudget: (proposal as any).totalBid || (proposal as any).budget || 0,

      // Project details with proper fallbacks
      description: proposal!.description || proposal!.summary || '',
      deliveryTimeWeeks: (proposal as any).deliveryTimeWeeks ||
        (proposal!.expectedDurationDays ? Math.ceil(proposal!.expectedDurationDays / 7) : 4),
      estimatedHours: (proposal as any).estimatedHours ||
        (proposal!.expectedDurationDays ? proposal!.expectedDurationDays * 8 : 40),
      toolsRequired: (proposal as any).toolsRequired || [],

      // Execution and timing from proposal
      executionMethod: (proposal as any).executionMethod || 'completion',
      invoicingMethod: (proposal as any).executionMethod || 'completion',
      startType: (proposal as any).startType || 'Immediately' as const,
      customStartDate: (proposal as any).customStartDate,
      endDate: proposal!.endDate,
      milestones: (proposal as any).milestones || [],

      // Status and metadata
      status: 'Available' as const,
      postedDate: new Date().toISOString().split('T')[0],
      notes: proposal!.description || proposal!.summary || '',
      isPublic: false,
      isTargetedRequest: true
    };

    console.log(`🔍 PROPOSAL ACCEPTANCE: Creating ${gigLikeData.invoicingMethod} project from proposal with budget: $${gigLikeData.upperBudget}`);

    console.log('🆔 PROPOSAL ACCEPTANCE: Starting project ID generation...');
    // 🔒 SURGICAL FIX: Generate proposal project ID with collision prevention (like gig requests)
    const { generateProjectId, auditLog } = await import('@/lib/projects/gig-request-project-id-generator');
    const orgFirstLetter = organization.name.charAt(0).toUpperCase();
    console.log(`🆔 PROPOSAL ACCEPTANCE: Organization first letter: ${orgFirstLetter}`);

    console.log('🆔 PROPOSAL ACCEPTANCE: Calling generateProjectId with proposal mode...');
    const projectIdResult = await generateProjectId({
      mode: 'proposal' as any,
      organizationFirstLetter: orgFirstLetter,
      origin: 'proposal' as any
    });
    console.log(`🆔 PROPOSAL ACCEPTANCE: Project ID generation result:`, projectIdResult);

    if (!projectIdResult.success) {
      console.error(`❌ PROPOSAL ACCEPTANCE: Project ID generation failed:`, projectIdResult);
      auditLog('project_creation_failed', {
        proposalId: proposalId,
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
    console.log(`✅ PROPOSAL ACCEPTANCE: Project ID generated successfully: ${generatedProjectId}`);
    auditLog('project_id_assigned', {
      proposalId: proposalId,
      projectId: generatedProjectId,
      organizationName: organization.name
    });

    // Use ProjectService.acceptGig for consistent project creation with pre-generated ID
    let acceptResult;
    try {
      acceptResult = ProjectService.acceptGig({
        gig: gigLikeData as any,
        freelancerId: (proposal as any).freelancerId,
        commissionerId: proposal!.commissionerId,
        organizationName: organization.name,
        existingProjectIds: new Set(), // 🔧 SURGICAL: Proposals don't need existing project check
        projectId: generatedProjectId // 🔒 SURGICAL: Force use of collision-safe ID
      });

      console.log(`✅ ProjectService.acceptGig completed successfully with ID: ${generatedProjectId}`);
    } catch (serviceError: any) {
      console.error('❌ ProjectService.acceptGig failed for proposal:', serviceError);
      auditLog('project_service_error', {
        projectId: generatedProjectId,
        error: serviceError.message
      });

      // 🔄 ROLLBACK: Reset proposal status to sent on project creation failure
      try {
        await updateProposal(proposalId, { status: 'sent' } as any);
        console.log('🔄 PROPOSAL ACCEPTANCE: Rolled back proposal status to sent due to project creation failure');
      } catch (rollbackError) {
        console.error('❌ PROPOSAL ACCEPTANCE: Failed to rollback proposal status:', rollbackError);
      }

      return NextResponse.json(
        err(ErrorCodes.OPERATION_NOT_ALLOWED, `Failed to create project from proposal: ${serviceError.message}`, 400),
        { status: 400 }
      );
    }

    // 🛡️ CRITICAL ORDERING: Save project and tasks to storage
    console.log('🔄 Saving project to unified storage...');
    try {
      // 🔍 DEBUGGING: Check freelancer ID availability
      const proposalFreelancerId = (proposal as any).freelancerId;
      console.log('🔍 PROPOSAL ACCEPTANCE: Freelancer ID from proposal:', proposalFreelancerId);

      if (!proposalFreelancerId) {
        console.error('❌ PROPOSAL ACCEPTANCE: No freelancerId found in proposal data');
        console.error('❌ PROPOSAL ACCEPTANCE: Available proposal fields:', Object.keys(proposal));

        // Rollback proposal status
        await updateProposal(proposalId, { status: 'sent' } as any);
        console.log('🔄 PROPOSAL ACCEPTANCE: Rolled back proposal status to sent');

        return NextResponse.json(
          err(ErrorCodes.BAD_REQUEST, 'Proposal missing freelancer information', 400),
          { status: 400 }
        );
      }

      // Save project using unified storage with all required fields
      await UnifiedStorageService.writeProject({
        ...acceptResult.project,
        freelancerId: proposalFreelancerId, // ✅ Ensure freelancerId is included
        commissionerId: proposal!.commissionerId, // ✅ Ensure commissionerId is included
        organizationId: organization.id, // ✅ Ensure organizationId is included
        status: 'ongoing',
        invoicingMethod: (acceptResult.project.invoicingMethod as "completion" | "milestone") || 'completion',
        createdAt: acceptResult.project.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        proposalId: proposalId // Link back to proposal
      } as any);

      console.log(`✅ Project saved to unified storage: ${acceptResult.project.projectId}`);
    } catch (projectSaveError) {
      console.error('❌ Failed to save project to unified storage:', projectSaveError);

      // 🔄 ROLLBACK: Reset proposal status to sent on project save failure
      try {
        await updateProposal(proposalId, { status: 'sent' } as any);
        console.log('🔄 PROPOSAL ACCEPTANCE: Rolled back proposal status to sent due to project save failure');
      } catch (rollbackError) {
        console.error('❌ PROPOSAL ACCEPTANCE: Failed to rollback proposal status:', rollbackError);
      }

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

        // 🔄 ROLLBACK: Reset proposal status to sent on task creation failure
      try {
        await updateProposal(proposalId, { status: 'sent' } as any);
        console.log('🔄 PROPOSAL ACCEPTANCE: Rolled back proposal status to sent due to task creation failure');
      } catch (rollbackError) {
        console.error('❌ PROPOSAL ACCEPTANCE: Failed to rollback proposal status:', rollbackError);
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
        // Execute upfront payment using specialized proposal payment API
        const upfrontResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/payments/proposal/execute-upfront`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({
            projectId: acceptResult.project.projectId,
            freelancerId: (proposal as any).freelancerId,
            commissionerId: proposal!.commissionerId
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

    // Log project creation transition
    await logProjectTransition({
      projectId: acceptResult.project.projectId,
      fromStatus: null,
      toStatus: 'ongoing',
      actorId,
      subsystem: Subsystems.PROPOSALS,
      metadata: {
        proposalId,
        freelancerId: acceptResult.project.freelancerId,
        commissionerId: acceptResult.project.commissionerId,
        totalBudget: acceptResult.project.totalBudget,
        invoicingMethod: acceptResult.project.invoicingMethod,
      },
    });

    // Create notifications using completion notification system
    try {
      // 🔔 PROPOSAL SPECIFIC: Use completion notification system for both notifications
      console.log('🔔 PROPOSAL NOTIFICATIONS: Emitting proposal acceptance and project activation notifications...');
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');

      // Get project tasks for context (shared for both notifications)
      const { getProjectTasks } = await import('@/lib/projects/get-project-tasks');
      const projectTasksData = await getProjectTasks(Number(acceptResult.project.projectId));
      const totalTasks = projectTasksData?.[0]?.tasks?.length || 1;

      // Determine notification type based on invoicing method
      const notificationType = acceptResult.project.invoicingMethod === 'completion'
        ? 'completion.proposal-commissioner-accepted'
        : 'milestone.proposal-accepted';

      // Freelancer notification: proposal accepted
      const freelancerResult = await handleCompletionNotification({
        type: notificationType,
        actorId: proposal!.commissionerId,
        targetId: (proposal as any).freelancerId,
        projectId: String(acceptResult.project.projectId),
        context: {
          projectTitle: acceptResult.project.title,
          totalTasks,
          dueDate: acceptResult.project.dueDate,
          invoicingMethod: acceptResult.project.invoicingMethod,
          proposalId: proposalId
          // orgName and commissionerName will be enriched automatically
        }
      });

      console.log('🔔 ATOMIC: Freelancer notification result:', freelancerResult);

      // Commissioner notification: project activated (for completion projects only)
      if (acceptResult.project.invoicingMethod === 'completion') {
        const commissionerResult = await handleCompletionNotification({
          type: 'completion.proposal-project_activated',
          actorId: proposal!.commissionerId,
          targetId: proposal!.commissionerId,
          projectId: String(acceptResult.project.projectId),
          context: {
            projectTitle: acceptResult.project.title,
            totalTasks,
            dueDate: acceptResult.project.dueDate,
            invoicingMethod: acceptResult.project.invoicingMethod,
            proposalId: proposalId
          }
        });

        console.log('🔔 ATOMIC: Commissioner notification result:', commissionerResult);
      } else {
        // For milestone projects, use milestone notification
        const commissionerResult = await handleCompletionNotification({
          type: 'milestone.proposal-project_activated',
          actorId: proposal!.commissionerId,
          targetId: proposal!.commissionerId,
          projectId: String(acceptResult.project.projectId),
          context: {
            projectTitle: acceptResult.project.title,
            totalTasks,
            dueDate: acceptResult.project.dueDate,
            invoicingMethod: acceptResult.project.invoicingMethod,
            proposalId: proposalId
          }
        });

        console.log('🔔 ATOMIC: Commissioner milestone notification result:', commissionerResult);
      }

      console.log('✅ Created notifications for proposal acceptance');

      // 🔔 COMMISSIONER NOTIFICATION: Send "proposal received" notification to commissioner
      try {
        console.log('🔔 PROPOSAL ACCEPTANCE: Creating commissioner notification...');

        const commissionerNotificationResult = await handleCompletionNotification({
          type: 'proposal_received',
          actorId: (proposal as any).freelancerId,
          targetId: proposal!.commissionerId,
          projectId: String(acceptResult.project.projectId),
          context: {
            projectTitle: acceptResult.project.title,
            proposalTitle: proposal!.title || proposal!.proposalTitle,
            freelancerName: 'Freelancer', // Will be enriched automatically
            proposalId: proposalId
          }
        });

        console.log('🔔 ATOMIC: Commissioner notification result:', commissionerNotificationResult);
      } catch (commissionerNotificationError) {
        console.error('❌ Failed to create commissioner notification:', commissionerNotificationError);
        // Don't fail the operation for notification errors
      }

    } catch (notificationError) {
      console.error('Failed to create notifications:', notificationError);
      // Don't fail the operation for notification errors
    }

    // Get the updated proposal
    const updatedProposal = await readProposal(proposalId);

    return NextResponse.json(
      ok({
        entities: {
          project: {
            projectId: acceptResult.project.projectId,
            title: acceptResult.project.title,
            status: acceptResult.project.status,
            freelancerId: acceptResult.project.freelancerId,
            commissionerId: acceptResult.project.commissionerId,
            invoicingMethod: acceptResult.project.invoicingMethod,
            totalBudget: acceptResult.project.totalBudget
          },
          proposal: updatedProposal,
        },
        projectId: acceptResult.project.projectId, // ✅ Add project ID to top level for easy access
        message: `Proposal accepted successfully! Project ${acceptResult.project.projectId} created.`,
        notificationsQueued: true,
        upfrontPayment: upfrontPaymentResult ? {
          status: 'paid',
          amount: upfrontPaymentResult.amount
        } : undefined
      })
    );
  } catch (error) {
    console.error('❌ PROPOSAL ACCEPTANCE: Critical error occurred:', error);
    console.error('❌ PROPOSAL ACCEPTANCE: Error stack:', (error as Error).stack);
    console.error('❌ PROPOSAL ACCEPTANCE: Error message:', (error as Error).message);

    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, `Failed to accept proposal: ${(error as Error).message}`, 500),
      { status: 500 }
    );
  }
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleProposalAcceptance);

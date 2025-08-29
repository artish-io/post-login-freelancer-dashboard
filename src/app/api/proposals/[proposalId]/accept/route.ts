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
  try {
    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(request);

    const { proposalId } = await params;

    // Read proposal using hierarchical storage
    const proposal = await readProposal(proposalId);
    assert(proposal, ErrorCodes.NOT_FOUND, 404, 'Proposal not found');

    // 🔒 Ensure session user is the commissioner who can accept this proposal
    assertOwnership(actorId, proposal!.commissionerId, 'proposal');

    // Update proposal status to accepted
    await updateProposal(proposalId, {
      status: 'accepted',
      // acceptedAt: new Date().toISOString(), // Property not in Proposal type
      // acceptedBy: actorId, // Property not in Proposal type
    } as any);

    // 🚀 Use proven ProjectService.acceptGig method for proposal acceptance
    console.log('🔧 ATOMIC WRITE: Using ProjectService.acceptGig for proposal acceptance...');

    // Get additional data needed for project creation
    const [organizationsData, usersData, projectsData] = await Promise.all([
      UnifiedStorageService.getAllOrganizations(),
      UnifiedStorageService.getAllUsers(),
      UnifiedStorageService.listProjects()
    ]);

    const organization = organizationsData.find((org: any) => org.id === (proposal as any).organizationId);
    const manager = usersData.find((user: any) => user.id === proposal!.commissionerId);

    if (!organization || !manager) {
      return NextResponse.json(
        err(ErrorCodes.NOT_FOUND, 'Organization or manager not found', 404),
        { status: 404 }
      );
    }

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

    console.log(`🔍 Creating ${gigLikeData.invoicingMethod} project from proposal with budget: $${gigLikeData.upperBudget}`);

    // Use ProjectService.acceptGig for consistent project creation
    let acceptResult;
    try {
      acceptResult = ProjectService.acceptGig({
        gig: gigLikeData as any,
        freelancerId: (proposal as any).freelancerId,
        commissionerId: proposal!.commissionerId,
        organizationName: organization.name,
        projectId: proposal!.projectId, // Use the pre-generated project ID from proposal
        existingProjectIds: new Set(projectsData.map((p: any) => p.projectId.toString()))
      });

      console.log('✅ ProjectService.acceptGig completed successfully for proposal');
    } catch (serviceError: any) {
      console.error('❌ ProjectService.acceptGig failed for proposal:', serviceError);
      return NextResponse.json(
        err(ErrorCodes.OPERATION_NOT_ALLOWED, `Failed to create project from proposal: ${serviceError.message}`, 400),
        { status: 400 }
      );
    }

    // 🛡️ CRITICAL ORDERING: Save project and tasks to storage
    console.log('🔄 Saving project to unified storage...');
    try {
      // Save project using unified storage
      await UnifiedStorageService.writeProject({
        ...acceptResult.project,
        status: 'ongoing',
        invoicingMethod: (acceptResult.project.invoicingMethod as "completion" | "milestone") || 'completion',
        createdAt: acceptResult.project.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        proposalId: proposalId // Link back to proposal
      } as any);

      console.log(`✅ Project saved to unified storage: ${acceptResult.project.projectId}`);
    } catch (projectSaveError) {
      console.error('❌ Failed to save project to unified storage:', projectSaveError);
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
        // Execute upfront payment using existing proven API
        const upfrontResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/payments/completion/execute-upfront`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({ projectId: acceptResult.project.projectId })
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

    // Create notifications using existing event system
    try {
      // Use the NotificationStorage directly for proposal acceptance
      const { NotificationStorage } = await import('@/lib/notifications/notification-storage');

      // Notify freelancer that proposal was accepted
      const proposalAcceptedEvent = {
        id: `proposal_accepted_${proposalId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'proposal_accepted',
        notificationType: NOTIFICATION_TYPES.PROPOSAL_ACCEPTED,
        actorId: proposal!.commissionerId,
        targetId: (proposal as any).freelancerId,
        entityType: ENTITY_TYPES.PROPOSAL,
        entityId: proposalId,
        metadata: {
          proposalId: proposalId,
          projectId: acceptResult.project.projectId,
          projectTitle: acceptResult.project.title,
          proposalTitle: proposal!.title || proposal!.proposalTitle
        },
        context: {
          organizationId: (proposal as any).organizationId,
          projectId: acceptResult.project.projectId
        }
      };

      NotificationStorage.addEvent(proposalAcceptedEvent as any);

      // Project activation notification
      const projectActivatedEvent = {
        id: `project_activated_${acceptResult.project.projectId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'project_activated',
        notificationType: NOTIFICATION_TYPES.PROJECT_ACTIVATED,
        actorId: proposal!.commissionerId,
        targetId: (proposal as any).freelancerId,
        entityType: ENTITY_TYPES.PROJECT,
        entityId: acceptResult.project.projectId.toString(),
        metadata: {
          projectId: acceptResult.project.projectId,
          projectTitle: acceptResult.project.title,
          invoicingMethod: acceptResult.project.invoicingMethod,
          fromProposal: true,
          originalProposalId: proposalId
        },
        context: {
          organizationId: (proposal as any).organizationId,
          proposalId: proposalId
        }
      };

      NotificationStorage.addEvent(projectActivatedEvent as any);
      console.log('✅ Created notifications for proposal acceptance');
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
        message: `Proposal accepted successfully! Project ${acceptResult.project.projectId} created.`,
        notificationsQueued: true,
        upfrontPayment: upfrontPaymentResult ? {
          status: 'paid',
          amount: upfrontPaymentResult.amount
        } : undefined
      })
    );
  } catch (error) {
    console.error('Error accepting proposal:', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, 'Failed to accept proposal', 500),
      { status: 500 }
    );
  }
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleProposalAcceptance);

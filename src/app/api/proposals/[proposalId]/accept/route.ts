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

    // Create a new project from the accepted proposal using the repository
    const projectId = proposal!.projectId || Date.now();
    const newProject = {
      projectId: projectId,
      title: proposal!.title,
      description: proposal!.summary,
      freelancerId: (proposal as any).freelancerId || 0,
      commissionerId: proposal!.commissionerId || 0,
      status: 'ongoing' as const,
      invoicingMethod: (proposal! as any).executionMethod || 'completion',
      budget: {
        lower: (proposal! as any).totalBid || 0,
        upper: (proposal! as any).totalBid || 0,
        currency: 'USD'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save project using repository
    await createProject(newProject);

    // Log project creation
    logProjectTransition(
      projectId,
      'created',
      'ongoing',
      actorId,
      Subsystems.PROPOSALS_ACCEPT,
      {
        reason: `Project created from proposal ${proposalId}`
      } as any
    );

    // If completion-based payment, create upfront invoice
    if (proposal!.executionMethod === 'completion' && proposal!.upfrontAmount && proposal!.upfrontAmount > 0) {
      const upfrontInvoice = {
        invoiceNumber: `UPF${Date.now()}`,
        freelancerId: (proposal as any).freelancerId || 0,
        projectId: newProject.projectId,
        commissionerId: proposal!.commissionerId || 0,
        projectTitle: proposal!.title,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0], // Due immediately
        totalAmount: proposal!.upfrontAmount,
        status: 'paid' as const, // Auto-paid on acceptance
        invoiceType: 'auto_completion' as const,
        milestones: [
          {
            description: '12% Upfront Payment',
            title: '12% Upfront Payment',
            rate: proposal!.upfrontAmount,
            taskId: 'upfront'
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save invoice using the proper storage system
      await saveInvoice(upfrontInvoice as any);
    }

    // Log proposal acceptance event
    try {
      await eventLogger.logEvent({
        id: `proposal_accepted_${proposalId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'proposal_accepted',
        notificationType: 81, // NOTIFICATION_TYPES.PROPOSAL_ACCEPTED
        actorId: proposal!.commissionerId || 0,
        targetId: (proposal as any).freelancerId || 0,
        entityType: 7, // ENTITY_TYPES.PROPOSAL
        entityId: proposalId,
        metadata: {
          proposalTitle: proposal!.title || 'Untitled Proposal',
          budget: proposal!.totalBid || 'Not specified',
          executionMethod: proposal!.executionMethod || 'Not specified',
          projectCreated: true,
          newProjectId: newProject.projectId,
          upfrontAmount: proposal!.upfrontAmount || 0
        },
        context: {
          proposalId: proposalId,
          projectId: typeof newProject.projectId === 'string' ? parseInt(newProject.projectId.replace(/\D/g, '')) || 0 : newProject.projectId
        }
      });

      // Log project creation event
      await eventLogger.logEvent({
        id: `project_created_${newProject.projectId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'project_created',
        notificationType: 20, // NOTIFICATION_TYPES.PROJECT_CREATED
        actorId: proposal!.commissionerId || 0,
        targetId: (proposal as any).freelancerId || 0,
        entityType: 2, // ENTITY_TYPES.PROJECT
        entityId: newProject.projectId,
        metadata: {
          projectTitle: newProject.title,
          budget: newProject.budget?.lower || 'Not specified',
          executionMethod: newProject.invoicingMethod,
          createdFromProposal: proposalId
        },
        context: {
          projectId: typeof newProject.projectId === 'string' ? parseInt(newProject.projectId.replace(/\D/g, '')) || 0 : newProject.projectId,
          proposalId: proposalId
        }
      });

    } catch (eventError) {
      console.error('Failed to log proposal acceptance events:', eventError);
      // Don't fail the main operation if event logging fails
    }

    // Get the updated proposal
    const updatedProposal = await readProposal(proposalId);

    return NextResponse.json(
      ok({
        entities: {
          project: {
            projectId: newProject.projectId,
            title: newProject.title,
            status: newProject.status,
            freelancerId: newProject.freelancerId,
            commissionerId: newProject.commissionerId,
          },
          proposal: updatedProposal,
        },
        message: 'Proposal accepted successfully and project created',
        notificationsQueued: true,
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

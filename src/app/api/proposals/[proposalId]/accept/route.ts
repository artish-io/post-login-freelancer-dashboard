import { NextResponse } from 'next/server';
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
  request: Request,
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
      acceptedAt: new Date().toISOString(),
      acceptedBy: actorId,
    });

    // Create a new project from the accepted proposal using the repository
    const projectId = proposal!.projectId || Date.now();
    const newProject = {
      projectId: projectId,
      title: proposal!.title,
      description: proposal!.summary,
      freelancerId: proposal!.freelancerId,
      commissionerId: proposal!.commissionerId,
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
      undefined,
      'ongoing',
      actorId,
      Subsystems.PROPOSALS_ACCEPT,
      {
        proposalId: proposalId,
        freelancerId: proposal!.freelancerId,
        commissionerId: proposal!.commissionerId,
      }
    );

    // If completion-based payment, create upfront invoice
    if (proposal!.executionMethod === 'completion' && proposal!.upfrontAmount && proposal!.upfrontAmount > 0) {
      const upfrontInvoice = {
        invoiceNumber: `UPF${Date.now()}`,
        freelancerId: proposal!.freelancerId,
        projectId: newProject.projectId,
        commissionerId: proposal!.commissionerId,
        projectTitle: proposal!.title,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0], // Due immediately
        totalAmount: proposal!.upfrontAmount,
        status: 'paid' as const, // Auto-paid on acceptance
        invoiceType: 'auto_completion' as const,
        milestones: [
          {
            description: 'Upfront payment (12% of total project)',
            rate: proposal!.upfrontAmount,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save invoice using the proper storage system
      await saveInvoice(upfrontInvoice);
    }

    // Log proposal acceptance event
    try {
      await eventLogger.logEvent({
        id: `proposal_accepted_${proposalId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'proposal_accepted',
        notificationType: 81, // NOTIFICATION_TYPES.PROPOSAL_ACCEPTED
        actorId: proposal.commissionerId,
        targetId: proposal.freelancerId,
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
          projectId: newProject.projectId
        }
      });

      // Log project creation event
      await eventLogger.logEvent({
        id: `project_created_${newProject.id}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'project_created',
        notificationType: 20, // NOTIFICATION_TYPES.PROJECT_CREATED
        actorId: proposal.commissionerId,
        targetId: proposal.freelancerId,
        entityType: 2, // ENTITY_TYPES.PROJECT
        entityId: newProject.id,
        metadata: {
          projectTitle: newProject.title,
          budget: newProject.budget?.lower || 'Not specified',
          executionMethod: newProject.invoicingMethod,
          createdFromProposal: proposalId
        },
        context: {
          projectId: newProject.projectId,
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

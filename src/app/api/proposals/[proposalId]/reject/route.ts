import { NextResponse } from 'next/server';
import { eventLogger } from '../../../../../lib/events/event-logger';
import { readProposal, updateProposal } from '../../../../../lib/proposals/hierarchical-storage';
import { requireSession, assert, assertOwnership } from '../../../../../lib/auth/session-guard';
import { ok, err, ErrorCodes, withErrorHandling } from '../../../../../lib/http/envelope';
import { readFile } from 'fs/promises';
import path from 'path';

async function handleProposalRejection(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(request);

    const { proposalId } = await params;
    const body = await request.json();
    const { reason } = body;

    // Read proposal using hierarchical storage
    const proposal = await readProposal(proposalId);
    assert(proposal, ErrorCodes.NOT_FOUND, 404, 'Proposal not found');

    // 🔒 Ensure session user is the commissioner who can reject this proposal
    assertOwnership(actorId, proposal!.commissionerId, 'proposal');

    // Get organization name for notification
    let organizationName = 'Organization';
    try {
      const usersPath = path.join(process.cwd(), 'data', 'users.json');
      const usersData = await readFile(usersPath, 'utf-8');
      const users = JSON.parse(usersData);
      const commissioner = users.find((u: any) => u.id === proposal!.commissionerId);
      if (commissioner?.organizationName) {
        organizationName = commissioner.organizationName;
      } else if (commissioner?.name) {
        organizationName = commissioner.name;
      }
    } catch (error) {
      console.error('Error fetching organization name:', error);
    }

    // Update proposal status to rejected
    await updateProposal(proposalId, {
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason || 'No reason provided',
      rejectedBy: actorId
    });

    // Log proposal rejection event
    try {
      await eventLogger.logEvent({
        id: `proposal_rejected_${proposalId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'proposal_rejected',
        notificationType: 82, // NOTIFICATION_TYPES.PROPOSAL_REJECTED
        actorId: proposal!.commissionerId,
        targetId: proposal!.freelancerId,
        entityType: 7, // ENTITY_TYPES.PROPOSAL
        entityId: proposalId,
        metadata: {
          proposalTitle: proposal!.proposalTitle || proposal!.title || 'Untitled Proposal',
          rejectionReason: reason || 'No reason provided',
          originalBudget: proposal!.budget || proposal!.totalBid || 'Not specified',
          organizationName: organizationName
        },
        context: {
          proposalId: proposalId
        }
      });
    } catch (eventError) {
      console.error('Failed to log proposal rejection event:', eventError);
      // Don't fail the main operation if event logging fails
    }

    // Get the updated proposal
    const updatedProposal = await readProposal(proposalId);

    return NextResponse.json(
      ok({
        proposal: updatedProposal,
        message: 'Proposal rejected successfully',
        notificationsQueued: true,
      })
    );
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, 'Failed to reject proposal', 500),
      { status: 500 }
    );
  }
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleProposalRejection);

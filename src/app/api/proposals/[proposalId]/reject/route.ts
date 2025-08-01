import { NextResponse } from 'next/server';
import { eventLogger } from '../../../../../lib/events/event-logger';
import { readProposal, updateProposal } from '../../../../../lib/proposals/hierarchical-storage';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;
    const body = await request.json();
    const { commissionerId, reason } = body;

    // Read proposal using hierarchical storage
    const proposal = await readProposal(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Update proposal status to rejected
    await updateProposal(proposalId, {
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason || 'No reason provided',
      rejectedBy: commissionerId
    });

    // Log proposal rejection event
    try {
      await eventLogger.logEvent({
        id: `proposal_rejected_${proposalId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'proposal_rejected',
        notificationType: 82, // NOTIFICATION_TYPES.PROPOSAL_REJECTED
        actorId: commissionerId || proposal.commissionerId,
        targetId: proposal.freelancerId,
        entityType: 7, // ENTITY_TYPES.PROPOSAL
        entityId: proposalId,
        metadata: {
          proposalTitle: proposal.proposalTitle || proposal.title || 'Untitled Proposal',
          rejectionReason: reason || 'No reason provided',
          originalBudget: proposal.budget || 'Not specified'
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

    return NextResponse.json({
      message: 'Proposal rejected successfully',
      proposal: updatedProposal,
      eventLogged: true
    });
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { eventLogger } from '../../../../../lib/events/event-logger';

const proposalsFilePath = path.join(process.cwd(), 'data', 'proposals', 'proposals.json');

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;
    const body = await request.json();
    const { commissionerId, reason } = body;

    // Read proposals data
    const proposalsData = fs.readFileSync(proposalsFilePath, 'utf-8');
    const proposals = JSON.parse(proposalsData);

    // Find the proposal
    const proposalIndex = proposals.findIndex((p: any) => p.id === proposalId);
    if (proposalIndex === -1) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal = proposals[proposalIndex];

    // Update proposal status to rejected
    proposals[proposalIndex] = {
      ...proposal,
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason || 'No reason provided',
      rejectedBy: commissionerId
    };

    // Save updated data
    fs.writeFileSync(proposalsFilePath, JSON.stringify(proposals, null, 2));

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

    return NextResponse.json({
      message: 'Proposal rejected successfully',
      proposal: proposals[proposalIndex],
      eventLogged: true
    });
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

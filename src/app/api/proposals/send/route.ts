import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { eventLogger } from '../../../lib/events/event-logger';

const sentProposalsPath = path.join(process.cwd(), 'data', 'proposals', 'proposals.json');
const draftsPath = path.join(process.cwd(), 'data', 'proposals', 'proposal-drafts.json');
const usersPath = path.join(process.cwd(), 'data', 'users.json');

/**
 * Send Proposal API Endpoint
 *
 * NOTIFICATION INTEGRATION:
 * - Logs proposal_sent event for notification system
 * - Notifies target commissioner about new proposal
 * - Tracks proposal status changes
 *
 * FUTURE ENHANCEMENTS:
 * - Email notifications for proposal recipients
 * - Proposal analytics and tracking
 * - Integration with project creation workflow
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      freelancerId,
      commissionerId,
      proposalTitle,
      description,
      budget,
      timeline
    } = body;

    if (!freelancerId || !commissionerId || !proposalTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newProposal = {
      ...body,
      id: `proposal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'sent',
      hiddenFor: [], // no one has hidden it yet
      sentAt: new Date().toISOString()
    };

    // Load and update proposals
    const sentData = await readFile(sentProposalsPath, 'utf-8');
    const sentProposals = JSON.parse(sentData);
    sentProposals.push(newProposal);
    await writeFile(sentProposalsPath, JSON.stringify(sentProposals, null, 2), 'utf-8');

    // Remove from drafts if exists
    try {
      const draftsData = await readFile(draftsPath, 'utf-8');
      const drafts = JSON.parse(draftsData);
      const updatedDrafts = drafts.filter((d: any) => d.id !== body.id);
      await writeFile(draftsPath, JSON.stringify(updatedDrafts, null, 2), 'utf-8');
    } catch (draftError) {
      // Draft file might not exist, continue
      console.log('No draft to remove or draft file not found');
    }

    // Log proposal sent event
    try {
      await eventLogger.logEvent({
        id: `proposal_sent_${newProposal.id}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'proposal_sent',
        actorId: freelancerId,
        targetId: commissionerId,
        entityType: 'proposal',
        entityId: newProposal.id,
        metadata: {
          proposalTitle: proposalTitle,
          budget: budget || 'Not specified',
          timeline: timeline || 'Not specified',
          description: description?.substring(0, 100) || 'No description'
        },
        context: {
          proposalId: newProposal.id
        }
      });
    } catch (eventError) {
      console.error('Failed to log proposal sent event:', eventError);
      // Don't fail the main operation if event logging fails
    }

    return NextResponse.json({
      message: 'Proposal sent successfully',
      id: newProposal.id,
      status: 'sent',
      sentAt: newProposal.sentAt
    }, { status: 200 });
  } catch (error) {
    console.error('Failed to send proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sentData = await readFile(sentProposalsPath, 'utf-8');
    const sentProposals = JSON.parse(sentData);
    return NextResponse.json(sentProposals, { status: 200 });
  } catch (error) {
    console.error('Failed to retrieve sent proposals:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, userId } = await request.json();

    if (!id || !userId) {
      return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 });
    }

    const fileData = await readFile(sentProposalsPath, 'utf-8');
    const proposals = JSON.parse(fileData);

    const updatedProposals = proposals.map((proposal: any) => {
      if (proposal.id === id) {
        const hiddenFor = proposal.hiddenFor || [];
        if (!hiddenFor.includes(userId)) {
          hiddenFor.push(userId);
        }
        return { ...proposal, hiddenFor };
      }
      return proposal;
    });

    await writeFile(sentProposalsPath, JSON.stringify(updatedProposals, null, 2), 'utf-8');
    return NextResponse.json({ message: 'Proposal hidden for user', id }, { status: 200 });
  } catch (error) {
    console.error('Failed to hide proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
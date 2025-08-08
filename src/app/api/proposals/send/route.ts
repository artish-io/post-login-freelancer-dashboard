import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { eventLogger } from '../../../../lib/events/event-logger';
import {
  saveProposal,
  readAllProposals,
  readProposal,
  updateProposal,
  generateUniqueProposalId,
  type Proposal
} from '../../../../lib/proposals/hierarchical-storage';
import {
  generateEnrichedProposalMetadata,
  saveEnrichedProposalMetadata
} from '../../../../lib/proposals/enriched-metadata';

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
    console.log('📨 Received proposal data:', body);

    // Handle both old and new data structures
    const {
      freelancerId,
      commissionerId,
      proposalTitle,
      title,
      summary,
      contact,
      totalBid,
      description,
      budget,
      timeline
    } = body;

    // Extract data from the new structure
    const actualTitle = proposalTitle || title;
    const actualDescription = description || summary;
    const actualBudget = budget || totalBid;

    // Extract commissioner ID from contact if available
    let actualCommissionerId = commissionerId;
    if (!actualCommissionerId && contact) {
      actualCommissionerId = contact.id;
    }

    if (!actualTitle) {
      return NextResponse.json({ error: 'Missing required fields: title is required' }, { status: 400 });
    }

    if (!actualCommissionerId) {
      return NextResponse.json({ error: 'Missing required fields: commissioner/contact is required' }, { status: 400 });
    }

    // Generate unique proposal ID
    const proposalId = await generateUniqueProposalId();

    const newProposal: Proposal = {
      ...body,
      id: proposalId,
      proposalTitle: actualTitle,
      description: actualDescription,
      budget: actualBudget,
      commissionerId: actualCommissionerId,
      createdAt: new Date().toISOString(),
      status: 'sent',
      hiddenFor: [], // no one has hidden it yet
      sentAt: new Date().toISOString()
    };

    // Save proposal using hierarchical storage
    await saveProposal(newProposal);

    // Generate and save enriched metadata for email notifications
    try {
      const enrichedMetadata = await generateEnrichedProposalMetadata(newProposal);
      await saveEnrichedProposalMetadata(newProposal.id, enrichedMetadata);
    } catch (metadataError) {
      console.error('Failed to generate enriched metadata:', metadataError);
      // Don't fail the main operation if metadata generation fails
    }

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
        notificationType: 80, // NOTIFICATION_TYPES.PROPOSAL_SENT
        actorId: freelancerId,
        targetId: commissionerId,
        entityType: 7, // ENTITY_TYPES.PROPOSAL
        entityId: newProposal.id,
        metadata: {
          proposalTitle: actualTitle,
          budget: actualBudget || 'Not specified',
          timeline: timeline || 'Not specified',
          description: actualDescription?.substring(0, 100) || 'No description'
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
    const allProposals = await readAllProposals();
    return NextResponse.json(allProposals, { status: 200 });
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

    // Read the existing proposal
    const proposal = await readProposal(id);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Update the hiddenFor array
    const hiddenFor = proposal.hiddenFor || [];
    if (!hiddenFor.includes(userId)) {
      hiddenFor.push(userId);
    }

    // Update the proposal
    await updateProposal(id, { hiddenFor });
    return NextResponse.json({ message: 'Proposal hidden for user', id }, { status: 200 });
  } catch (error) {
    console.error('Failed to hide proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { eventLogger } from '../../../../lib/events/event-logger';
import { getUserById, UnifiedStorageService } from '@/lib/storage/unified-storage-service';
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
import { generateOrganizationProjectId, generateProjectId } from '@/lib/utils/id-generation';

const draftsPath = path.join(process.cwd(), 'data', 'proposals', 'proposal-drafts.json');

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
    // 🔒 Auth - get session and validate
    const { requireSession } = await import('@/lib/auth/session-guard');
    const { userId: sessionUserId } = await requireSession(request);
    console.log(`✅ PROPOSAL SEND: Authentication successful, freelancerId: ${sessionUserId}`);

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

    // Use session user ID as freelancer ID (override any provided freelancerId)
    const actualFreelancerId = sessionUserId;

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

    // Generate project ID using proven patterns
    let projectId: string;
    try {
      // Try to get organization info for project ID generation
      const organizationsData = await UnifiedStorageService.getAllOrganizations();
      const organization = organizationsData.find((org: any) => org.id === body.organizationId);

      if (organization?.name) {
        // Use proposal-specific project ID generation (C-P001, C-P002, etc.)
        const { generateProjectId: generateProposalProjectId } = await import('@/lib/projects/gig-request-project-id-generator');
        const orgFirstLetter = organization.name.charAt(0).toUpperCase();
        const projectIdResult = await generateProposalProjectId({
          mode: 'proposal' as any,
          organizationFirstLetter: orgFirstLetter,
          origin: 'proposal' as any
        });

        if (projectIdResult.success) {
          projectId = projectIdResult.projectId!;
          console.log(`✅ Generated proposal project ID: ${projectId} for organization: ${organization.name}`);
        } else {
          console.warn('Failed to generate proposal project ID, using fallback');
          // Fallback to organization-based generation
          const existingProjects = await UnifiedStorageService.listProjects();
          const existingProposals = await readAllProposals();
          const existingProjectIds = new Set([
            ...existingProjects.map(p => p.projectId.toString()),
            ...existingProposals.map(p => p.projectId).filter(Boolean)
          ]);

          projectId = generateOrganizationProjectId(organization.name, existingProjectIds);
        }
      } else {
        // Fallback to UNQ format for proposals without organization data
        const existingProjects = await UnifiedStorageService.listProjects();
        const existingProposals = await readAllProposals();
        const existingProjectIds = new Set([
          ...existingProjects.map(p => p.projectId.toString()),
          ...existingProposals.map(p => p.projectId).filter(Boolean)
        ]);

        // Generate UNQ-001 format for unique proposals
        let maxCounter = 0;
        const unqPattern = /^UNQ-(\d+)$/;

        for (const existingId of existingProjectIds) {
          const match = existingId.toString().match(unqPattern);
          if (match) {
            const counter = parseInt(match[1], 10);
            if (counter > maxCounter) {
              maxCounter = counter;
            }
          }
        }

        const nextCounter = maxCounter + 1;
        const paddedCounter = nextCounter.toString().padStart(3, '0');
        projectId = `UNQ-${paddedCounter}`;
      }
    } catch (error) {
      console.warn('Failed to generate organization-based project ID, using fallback:', error);
      // Final fallback to numeric ID
      projectId = generateProjectId().toString();
    }

    const newProposal: Proposal = {
      ...body,
      id: proposalId,
      proposalTitle: actualTitle,
      description: actualDescription,
      budget: actualBudget,
      freelancerId: actualFreelancerId, // ✅ Set freelancer ID from session
      commissionerId: actualCommissionerId,
      projectId: projectId, // Add generated project ID
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
        actorId: actualFreelancerId,
        targetId: actualCommissionerId,
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
import { NextResponse, NextRequest } from 'next/server';
import { eventLogger } from '../../../../../lib/events/event-logger';
import { readProposal, updateProposal } from '../../../../../lib/proposals/hierarchical-storage';
import { requireSession, assert, assertOwnership } from '../../../../../lib/auth/session-guard';
import { ok, err, ErrorCodes, withErrorHandling } from '../../../../../lib/http/envelope';
import { readFile } from 'fs/promises';
import path from 'path';

async function handleProposalRejection(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(request);

    const { proposalId } = await params;

    // Parse JSON body safely
    let body = {};
    let reason = '';
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
        reason = body.reason || '';
      }
    } catch (error) {
      console.warn('Failed to parse request body, using defaults:', error);
    }

    // Read proposal using hierarchical storage
    const proposal = await readProposal(proposalId);
    assert(proposal, ErrorCodes.NOT_FOUND, 404, 'Proposal not found');

    // 🔒 Ensure session user is the commissioner who can reject this proposal
    assertOwnership(actorId, proposal!.commissionerId, 'proposal');

    // Get organization name for notification using hierarchical storage
    let organizationName = 'Organization';
    try {
      const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
      const [organizationsData, usersData] = await Promise.all([
        UnifiedStorageService.getAllOrganizations(),
        UnifiedStorageService.getAllUsers()
      ]);

      // Find the commissioner
      const commissioner = usersData.find((u: any) => u.id === proposal!.commissionerId);

      // Find the organization using comprehensive search
      const organization = organizationsData.find((org: any) =>
        org.firstCommissionerId === proposal!.commissionerId ||
        org.contactPersonId === proposal!.commissionerId ||
        org.associatedCommissioners?.includes(proposal!.commissionerId) ||
        org.id === (proposal as any).organizationId
      );

      if (organization?.name) {
        organizationName = organization.name;
      } else if (commissioner?.name) {
        organizationName = commissioner.name;
      }

      console.log(`🔍 PROPOSAL REJECTION: Organization lookup - Commissioner: ${proposal!.commissionerId}, Organization: ${organizationName}`);
    } catch (error) {
      console.error('Error fetching organization name:', error);
    }

    // Update proposal status to rejected
    await updateProposal(proposalId, {
      status: 'rejected',
      // rejectedAt: new Date().toISOString(), // Property not in Proposal type
      // rejectionReason: reason || 'No reason provided', // Property not in Proposal type
      // rejectedBy: actorId // Property not in Proposal type
    } as any);

    // Log proposal rejection event
    try {
      console.log(`🔔 PROPOSAL REJECTION: Creating notification event for proposal ${proposalId}`);
      console.log(`🔔 PROPOSAL REJECTION: Actor: ${proposal!.commissionerId}, Target: ${(proposal as any).freelancerId}, Organization: ${organizationName}`);

      await eventLogger.logEvent({
        id: `proposal_rejected_${proposalId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'proposal_rejected',
        notificationType: 82, // NOTIFICATION_TYPES.PROPOSAL_REJECTED
        actorId: proposal!.commissionerId || 0,
        targetId: (proposal as any).freelancerId || 0,
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

      console.log(`✅ PROPOSAL REJECTION: Successfully created notification event for proposal ${proposalId}`);
    } catch (eventError) {
      console.error('❌ PROPOSAL REJECTION: Failed to log proposal rejection event:', eventError);
      // Don't fail the main operation if event logging fails
    }

    // Proposal updated successfully

    return NextResponse.json(
      ok({
        message: 'Proposal rejected successfully',
        notificationsQueued: true,
      } as any)
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

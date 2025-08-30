import { NextRequest, NextResponse } from 'next/server';
import { readProposal } from '../../../../lib/proposals/hierarchical-storage';
import { requireSession } from '../../../../lib/auth/session-guard';
import { err, ErrorCodes } from '../../../../lib/http/envelope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    console.log('🚀 PROPOSAL FETCH: Route handler started');

    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(request);
    console.log(`✅ PROPOSAL FETCH: Authentication successful, actorId: ${actorId}`);

    const { proposalId } = await params;
    console.log(`✅ PROPOSAL FETCH: ProposalId extracted: ${proposalId}`);

    // Read proposal using hierarchical storage
    const proposal = await readProposal(proposalId);
    if (!proposal) {
      console.error(`❌ PROPOSAL FETCH: Proposal ${proposalId} not found in storage`);
      return NextResponse.json(
        err(ErrorCodes.NOT_FOUND, 'Proposal not found', 404),
        { status: 404 }
      );
    }

    console.log(`✅ PROPOSAL FETCH: Proposal found - Title: ${proposal.title}, Status: ${proposal.status}`);

    // 🔒 Validate ownership - user must be either freelancer or commissioner
    const proposalFreelancerId = (proposal as any).freelancerId;
    const proposalCommissionerId = proposal.commissionerId;

    const isFreelancer = actorId === proposalFreelancerId;
    const isCommissioner = actorId === proposalCommissionerId;

    if (!isFreelancer && !isCommissioner) {
      console.error(`❌ PROPOSAL FETCH: Access denied - User ${actorId} is not authorized to view proposal ${proposalId}`);
      return NextResponse.json(
        err(ErrorCodes.FORBIDDEN, 'Access denied', 403),
        { status: 403 }
      );
    }

    console.log(`✅ PROPOSAL FETCH: Ownership validation successful - User is ${isFreelancer ? 'freelancer' : 'commissioner'}`);

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('❌ PROPOSAL FETCH: Critical error occurred:', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, `Failed to fetch proposal: ${(error as Error).message}`, 500),
      { status: 500 }
    );
  }
}

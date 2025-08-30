import { NextRequest, NextResponse } from 'next/server';
import { readAllProposals } from '../../../lib/proposals/hierarchical-storage';
import { requireSession } from '../../../lib/auth/session-guard';
import { err, ErrorCodes } from '../../../lib/http/envelope';

/**
 * GET /api/proposals
 * 
 * Fetch all proposals for the authenticated user
 * Returns proposals where user is either freelancer or commissioner
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🚀 PROPOSALS LIST: Route handler started');
    
    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(request);
    console.log(`✅ PROPOSALS LIST: Authentication successful, actorId: ${actorId}`);

    console.log('📖 PROPOSALS LIST: Reading all proposals from storage...');
    // Read all proposals
    const allProposals = await readAllProposals();
    console.log(`📖 PROPOSALS LIST: Found ${allProposals.length} total proposals`);

    // Filter proposals where user is either freelancer or commissioner
    const userProposals = allProposals.filter(proposal => {
      const proposalFreelancerId = (proposal as any).freelancerId;
      const proposalCommissionerId = proposal.commissionerId;
      
      return actorId === proposalFreelancerId || actorId === proposalCommissionerId;
    });

    console.log(`✅ PROPOSALS LIST: Filtered to ${userProposals.length} proposals for user ${actorId}`);

    // Sort by creation date (newest first)
    const sortedProposals = userProposals.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.sentAt || 0);
      const dateB = new Date(b.createdAt || b.sentAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    console.log('✅ PROPOSALS LIST: Returning sorted proposals');
    return NextResponse.json(sortedProposals);

  } catch (error) {
    console.error('❌ PROPOSALS LIST: Critical error occurred:', error);
    console.error('❌ PROPOSALS LIST: Error stack:', (error as Error).stack);
    console.error('❌ PROPOSALS LIST: Error message:', (error as Error).message);
    
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, `Failed to fetch proposals: ${(error as Error).message}`, 500),
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { readProposal } from '../../../../lib/proposals/hierarchical-storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;

    // Read proposal using hierarchical storage
    const proposal = await readProposal(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

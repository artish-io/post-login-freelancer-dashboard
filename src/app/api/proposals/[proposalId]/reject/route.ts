import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const proposalsFilePath = path.join(process.cwd(), 'data', 'proposals', 'proposals.json');

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;

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
    };

    // Save updated data
    fs.writeFileSync(proposalsFilePath, JSON.stringify(proposals, null, 2));

    return NextResponse.json({
      message: 'Proposal rejected successfully',
      proposal: proposals[proposalIndex],
    });
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

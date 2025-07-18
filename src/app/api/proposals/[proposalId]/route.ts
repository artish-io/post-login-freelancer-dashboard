import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const proposalsFilePath = path.join(process.cwd(), 'data', 'proposals', 'proposals.json');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;

    // Read proposals data
    const proposalsData = fs.readFileSync(proposalsFilePath, 'utf-8');
    const proposals = JSON.parse(proposalsData);

    // Find the proposal
    const proposal = proposals.find((p: any) => p.id === proposalId);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

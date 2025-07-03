import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const sentProposalsPath = path.join(process.cwd(), 'data', 'proposals', 'proposals.json');
const draftsPath = path.join(process.cwd(), 'data', 'proposals', 'proposal-drafts.json');

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newProposal = {
      ...body,
      id: `proposal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'sent',
      hiddenFor: [], // no one has hidden it yet
    };

    const sentData = await readFile(sentProposalsPath, 'utf-8');
    const sentProposals = JSON.parse(sentData);
    sentProposals.push(newProposal);
    await writeFile(sentProposalsPath, JSON.stringify(sentProposals, null, 2), 'utf-8');

    // Remove from drafts if exists
    const draftsData = await readFile(draftsPath, 'utf-8');
    const drafts = JSON.parse(draftsData);
    const updatedDrafts = drafts.filter((d: any) => d.id !== body.id);
    await writeFile(draftsPath, JSON.stringify(updatedDrafts, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Proposal sent', id: newProposal.id }, { status: 200 });
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
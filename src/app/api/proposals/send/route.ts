// src/app/api/proposals/send/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const filePath = path.join(process.cwd(), 'data', 'proposals', 'proposals.json');

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Add a unique ID and timestamp to the new proposal
    const newProposal = {
      ...body,
      id: `prop-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // Read existing proposals
    const fileData = await readFile(filePath, 'utf-8');
    const proposals = JSON.parse(fileData);

    // Append new proposal
    proposals.push(newProposal);

    // Write updated array back to file
    await writeFile(filePath, JSON.stringify(proposals, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Proposal submitted', id: newProposal.id }, { status: 200 });
  } catch (error) {
    console.error('Failed to save proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
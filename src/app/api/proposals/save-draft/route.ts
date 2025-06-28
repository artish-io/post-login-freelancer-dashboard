// src/app/api/proposals/save-draft/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const filePath = path.join(process.cwd(), 'data', 'proposals', 'proposal-drafts.json');

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newDraft = {
      ...body,
      id: `draft-${Date.now()}`,
      savedAt: new Date().toISOString(),
      status: 'draft',
    };

    const fileData = await readFile(filePath, 'utf-8');
    const drafts = JSON.parse(fileData);

    drafts.push(newDraft);

    await writeFile(filePath, JSON.stringify(drafts, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Draft saved', id: newDraft.id }, { status: 200 });
  } catch (error) {
    console.error('Failed to save proposal draft:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const fileData = await readFile(filePath, 'utf-8');
    const drafts = JSON.parse(fileData);

    return NextResponse.json(drafts, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch proposal drafts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
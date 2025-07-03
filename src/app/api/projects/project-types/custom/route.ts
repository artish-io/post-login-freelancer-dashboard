import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const FILE_PATH = path.join(
  process.cwd(),
  'data',
  'proposals',
  'project-type-custom-tags.json'
);

type CustomTag = {
  tag: string;
  suggestedBy: string;
  timestamp: string;
};

export async function GET() {
  try {
    const data = await readFile(FILE_PATH, 'utf-8');
    const tags = JSON.parse(data);
    return NextResponse.json(tags);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read custom tags' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tag, suggestedBy } = body;

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Invalid tag' }, { status: 400 });
    }

    const newEntry: CustomTag = {
      tag: tag.trim(),
      suggestedBy: suggestedBy?.trim() || 'anonymous',
      timestamp: new Date().toISOString(),
    };

    // Load existing
    const raw = await readFile(FILE_PATH, 'utf-8');
    const existing: CustomTag[] = JSON.parse(raw);

    // Check for duplicate
    const duplicate = existing.some((t) => t.tag.toLowerCase() === newEntry.tag.toLowerCase());
    if (duplicate) {
      return NextResponse.json({ message: 'Tag already exists' }, { status: 200 });
    }

    const updated = [...existing, newEntry];
    await writeFile(FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');

    return NextResponse.json({ success: true, tag: newEntry });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save custom tag' }, { status: 500 });
  }
}
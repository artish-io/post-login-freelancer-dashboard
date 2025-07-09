import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const PROJECTS_PATH = path.join(process.cwd(), 'data/projects.json');

export async function GET() {
  try {
    const data = await readFile(PROJECTS_PATH, 'utf-8');
    const parsed = JSON.parse(data);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error loading projects:', error);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}

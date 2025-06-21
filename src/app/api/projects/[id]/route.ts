import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'projects.json');
    const file = await readFile(filePath, 'utf-8');
    const projects = JSON.parse(file);

    const project = projects.find(
      (p: any) => String(p.projectId) === params.id
    );

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error reading project data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
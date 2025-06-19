// src/app/api/dashboard/invoice-meta/projects/route.ts

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const freelancerId = Number(searchParams.get('freelancerId'));

  if (!freelancerId) {
    return NextResponse.json({ error: 'Missing freelancerId' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'projects.json');
    const fileData = await readFile(filePath, 'utf-8');
    const allProjects = JSON.parse(fileData);

    const filtered = allProjects
      .filter((p: any) => p.freelancerId === freelancerId)
      .map((p: any) => ({
        projectId: p.projectId,
        title: p.title
      }));

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('[invoice-meta/projects] Failed:', error);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}
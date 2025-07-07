import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const tasksFilePath = path.join(process.cwd(), 'data', 'project-tasks.json');

export async function GET() {
  try {
    const file = await readFile(tasksFilePath, 'utf-8');
    const projects = JSON.parse(file);

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error reading project tasks:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

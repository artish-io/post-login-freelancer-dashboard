import { NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

export async function GET() {
  try {
    const projects = await UnifiedStorageService.listProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

export async function GET() {
  try {
    const projects = await UnifiedStorageService.listProjects();

    return NextResponse.json(projects, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error reading projects from hierarchical structure:', error);
    return NextResponse.json(
      { error: 'Failed to load projects' },
      { status: 500 }
    );
  }
}

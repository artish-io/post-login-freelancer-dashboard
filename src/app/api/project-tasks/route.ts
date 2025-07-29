import { NextResponse } from 'next/server';
import { readAllTasks, convertHierarchicalToLegacy } from '../../../lib/project-tasks/hierarchical-storage';

export async function GET() {
  try {
    // Read all tasks from hierarchical structure
    const hierarchicalTasks = await readAllTasks();

    // Convert back to legacy format for backward compatibility
    const legacyProjects = convertHierarchicalToLegacy(hierarchicalTasks);

    return NextResponse.json(legacyProjects, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error reading project tasks from hierarchical storage:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

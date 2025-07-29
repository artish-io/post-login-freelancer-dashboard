
import { readProjectNotes, TaskNoteBlock } from '@/lib/project-notes-utils';

export async function getProjectNotes(projectId: number): Promise<TaskNoteBlock[]> {
  try {
    return await readProjectNotes(projectId);
  } catch (error) {
    console.error('Error reading project notes:', error);
    return [];
  }
}
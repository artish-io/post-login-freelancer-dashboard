

import path from 'path';
import { readFile } from 'fs/promises';

interface Note {
  date: string;
  feedback: string;
}

interface TaskNoteBlock {
  projectId: number;
  taskId: number;
  taskTitle: string;
  notes: Note[];
}

export async function getProjectNotes(projectId: number): Promise<TaskNoteBlock[]> {
  const NOTES_PATH = path.join(process.cwd(), 'data', 'project-notes.json');

  try {
    const raw = await readFile(NOTES_PATH, 'utf-8');
    const allNotes: TaskNoteBlock[] = JSON.parse(raw);

    return allNotes.filter((noteBlock) => noteBlock.projectId === projectId);
  } catch (error) {
    console.error('Failed to read project notes:', error);
    return [];
  }
}
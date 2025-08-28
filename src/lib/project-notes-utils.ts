// src/lib/project-notes-utils.ts
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

export interface Note {
  date: string;
  feedback: string;
}

export interface TaskNoteBlock {
  projectId: string | number;
  taskId: number;
  taskTitle: string;
  notes: Note[];
}

export interface NoteLocation {
  year: string;
  month: string;
  day: string;
  projectId: string;
  taskId: string;
}

/**
 * Parse date and return date components
 */
export function parseNoteDate(dateString: string): { year: string; month: string; day: string } {
  // Parse the date string directly to avoid timezone issues
  const [year, month, day] = dateString.split('-');
  return {
    year: year,
    month: month,
    day: day
  };
}

/**
 * Generate note file path based on date, project ID, and task ID
 */
export function getNoteFilePath(date: string, projectId: string | number, taskId: number): string {
  const { year, month, day } = parseNoteDate(date);
  return path.join(
    process.cwd(),
    'data',
    'project-notes',
    year,
    month,
    day,
    projectId.toString(),
    taskId.toString(),
    'project-notes.json'
  );
}

/**
 * Generate notes index file path
 */
export function getNotesIndexPath(): string {
  return path.join(process.cwd(), 'data', 'project-notes', 'metadata', 'notes-index.json');
}

/**
 * Ensure directory exists
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

/**
 * Update notes index with note location
 */
export async function updateNotesIndex(projectId: number, taskId: number, date: string): Promise<void> {
  const indexPath = getNotesIndexPath();
  const indexDir = path.dirname(indexPath);
  
  await ensureDirectoryExists(indexDir);
  
  let index: Record<string, string[]> = {};
  
  try {
    if (fs.existsSync(indexPath)) {
      const data = await fsPromises.readFile(indexPath, 'utf-8');
      index = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading notes index:', error);
  }
  
  const key = `${projectId}-${taskId}`;
  if (!index[key]) {
    index[key] = [];
  }
  
  if (!index[key].includes(date)) {
    index[key].push(date);
    index[key].sort(); // Keep dates sorted
  }
  
  await fsPromises.writeFile(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Save a note to hierarchical structure
 */
export async function saveNote(
  projectId: number, 
  taskId: number, 
  taskTitle: string, 
  note: Note
): Promise<void> {
  const filePath = getNoteFilePath(note.date, projectId, taskId);
  const dirPath = path.dirname(filePath);
  
  await ensureDirectoryExists(dirPath);
  
  // Read existing notes for this task on this date (if any)
  let existingData: TaskNoteBlock | null = null;
  
  try {
    if (fs.existsSync(filePath)) {
      const data = await fsPromises.readFile(filePath, 'utf-8');
      existingData = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading existing notes:', error);
  }
  
  if (existingData) {
    // Add to existing notes
    existingData.notes.push(note);
    // Sort notes by date
    existingData.notes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } else {
    // Create new note block
    existingData = {
      projectId,
      taskId,
      taskTitle,
      notes: [note]
    };
  }
  
  await fsPromises.writeFile(filePath, JSON.stringify(existingData, null, 2));
  
  // Update notes index
  await updateNotesIndex(projectId, taskId, note.date);
}

/**
 * Read all notes for a specific task
 */
export async function readTaskNotes(projectId: string | number, taskId: number): Promise<Note[]> {
  const indexPath = getNotesIndexPath();
  const key = `${projectId}-${taskId}`;
  
  try {
    if (!fs.existsSync(indexPath)) {
      return [];
    }
    
    const indexData = await fsPromises.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    const dates = index[key] || [];
    
    const allNotes: Note[] = [];
    
    for (const date of dates) {
      const filePath = getNoteFilePath(date, projectId, taskId);
      
      if (fs.existsSync(filePath)) {
        try {
          const data = await fsPromises.readFile(filePath, 'utf-8');
          const noteBlock = JSON.parse(data);
          allNotes.push(...noteBlock.notes);
        } catch (error) {
          console.error(`Error reading notes from ${filePath}:`, error);
        }
      }
    }
    
    // Sort notes by date
    return allNotes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error(`Error reading task notes for ${projectId}-${taskId}:`, error);
    return [];
  }
}

/**
 * Read all notes for a project
 */
export async function readProjectNotes(projectId: string | number): Promise<TaskNoteBlock[]> {
  const indexPath = getNotesIndexPath();
  
  try {
    if (!fs.existsSync(indexPath)) {
      return [];
    }
    
    const indexData = await fsPromises.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    
    const taskNoteBlocks: TaskNoteBlock[] = [];
    
    // Find all task IDs for this project
    for (const [key, dates] of Object.entries(index)) {
      // Handle both string and numeric project IDs
      const parts = key.split('-');
      let projId: string | number;
      let taskId: number;

      // For string project IDs like "C-001-123", the project ID includes the first dash
      if (isNaN(Number(parts[0]))) {
        // String project ID case: "C-001-123" -> projId="C-001", taskId=123
        projId = parts.slice(0, -1).join('-');
        taskId = Number(parts[parts.length - 1]);
      } else {
        // Numeric project ID case: "123-456" -> projId=123, taskId=456
        projId = Number(parts[0]);
        taskId = Number(parts[1]);
      }

      if (projId.toString() === projectId.toString()) {
        const notes = await readTaskNotes(projectId, taskId);
        
        if (notes.length > 0) {
          // Get task title from the first note file
          const firstDate = (dates as string[])[0];
          const filePath = getNoteFilePath(firstDate, projectId, taskId);
          
          let taskTitle = `Task ${taskId}`;
          try {
            if (fs.existsSync(filePath)) {
              const data = await fsPromises.readFile(filePath, 'utf-8');
              const noteBlock = JSON.parse(data);
              taskTitle = noteBlock.taskTitle || taskTitle;
            }
          } catch (error) {
            console.error('Error reading task title:', error);
          }
          
          taskNoteBlocks.push({
            projectId: projectId,
            taskId,
            taskTitle,
            notes
          });
        }
      }
    }
    
    return taskNoteBlocks;
  } catch (error) {
    console.error(`Error reading project notes for ${projectId}:`, error);
    return [];
  }
}

/**
 * Read notes for multiple projects
 */
export async function readMultipleProjectNotes(projectIds: number[]): Promise<TaskNoteBlock[]> {
  const allNotes: TaskNoteBlock[] = [];
  
  for (const projectId of projectIds) {
    const projectNotes = await readProjectNotes(projectId);
    allNotes.push(...projectNotes);
  }
  
  return allNotes;
}

/**
 * Count unread notes for a user across projects
 */
export async function countUnreadNotes(
  projectIds: number[], 
  readNotes: Set<string>
): Promise<{ count: number; taskIds: number[] }> {
  const taskIdsWithUnreadNotes: number[] = [];
  
  for (const projectId of projectIds) {
    const projectNotes = await readProjectNotes(projectId);
    
    for (const taskBlock of projectNotes) {
      const hasUnreadNotes = taskBlock.notes.some((note: Note) => {
        const noteKey = `${taskBlock.projectId}-${taskBlock.taskId}-${note.date}`;
        return !readNotes.has(noteKey);
      });
      
      if (hasUnreadNotes) {
        taskIdsWithUnreadNotes.push(taskBlock.taskId);
      }
    }
  }
  
  return {
    count: taskIdsWithUnreadNotes.length,
    taskIds: taskIdsWithUnreadNotes
  };
}

/**
 * Get all notes across all projects (for admin/debugging)
 */
export async function readAllNotes(): Promise<TaskNoteBlock[]> {
  const indexPath = getNotesIndexPath();
  
  try {
    if (!fs.existsSync(indexPath)) {
      return [];
    }
    
    const indexData = await fsPromises.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    
    const allNotes: TaskNoteBlock[] = [];
    
    for (const [key] of Object.entries(index)) {
      const [projectId, taskId] = key.split('-').map(Number);
      const notes = await readTaskNotes(projectId, taskId);
      
      if (notes.length > 0) {
        // Get task title from the first note file
        const dates = index[key] as string[];
        const firstDate = dates[0];
        const filePath = getNoteFilePath(firstDate, projectId, taskId);
        
        let taskTitle = `Task ${taskId}`;
        try {
          if (fs.existsSync(filePath)) {
            const data = await fsPromises.readFile(filePath, 'utf-8');
            const noteBlock = JSON.parse(data);
            taskTitle = noteBlock.taskTitle || taskTitle;
          }
        } catch (error) {
          console.error('Error reading task title:', error);
        }
        
        allNotes.push({
          projectId,
          taskId,
          taskTitle,
          notes
        });
      }
    }
    
    return allNotes;
  } catch (error) {
    console.error('Error reading all notes:', error);
    return [];
  }
}

// Migration functions removed - no longer needed since migration is complete


import { readProject } from '@/lib/projects-utils';

export async function getProjectById(projectId: number) {
  try {
    return await readProject(projectId);
  } catch (error) {
    console.error('Error reading project:', error);
    return null;
  }
}
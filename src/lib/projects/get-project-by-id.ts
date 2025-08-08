
import { getProjectById as getProjectByIdRepo } from '@/app/api/payments/repos/projects-repo';

export async function getProjectById(projectId: number) {
  try {
    return await getProjectByIdRepo(projectId);
  } catch (error) {
    console.error('Error reading project:', error);
    return null;
  }
}
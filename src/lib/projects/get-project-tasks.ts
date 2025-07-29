
import { readProjectTasks, convertHierarchicalToLegacy } from '../project-tasks/hierarchical-storage';

export async function getProjectTasks(projectId: number) {
  try {
    // Read tasks from hierarchical storage
    const hierarchicalTasks = await readProjectTasks(projectId);

    // Convert to legacy format for backward compatibility
    const legacyProjects = convertHierarchicalToLegacy(hierarchicalTasks);

    return legacyProjects;
  } catch (error) {
    console.error('Error reading project tasks from hierarchical storage:', error);
    return [];
  }
}
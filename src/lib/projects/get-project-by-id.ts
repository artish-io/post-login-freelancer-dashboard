

import path from 'path';
import { readFile } from 'fs/promises';

export async function getProjectById(projectId: number) {
  const filePath = path.join(process.cwd(), 'data', 'projects.json');
  const fileContent = await readFile(filePath, 'utf-8');
  const projects = JSON.parse(fileContent);

  return projects.find((project: any) => project.id === projectId) || null;
}
#!/usr/bin/env tsx

/**
 * Generate projects.json from hierarchical storage
 * 
 * This script reads all project files from the hierarchical storage
 * and creates a consolidated projects.json file for compatibility
 * with the milestone invoicing test suite.
 */

import { promises as fs } from 'fs';
import path from 'path';

interface Project {
  projectId: number;
  title: string;
  description: string;
  organizationId?: number;
  typeTags?: string[];
  commissionerId: number;
  freelancerId: number;
  status: string;
  dueDate?: string;
  totalTasks?: number;
  invoicingMethod?: string;
  createdAt: string;
  budget?: {
    lower: number;
    upper: number;
    currency: string;
  };
}

async function generateProjectsJson() {
  console.log('📋 Generating projects.json from hierarchical storage...');
  
  try {
    const projects: Project[] = [];
    
    // Read the projects index to get all project IDs and paths
    const projectsIndexPath = path.join(process.cwd(), 'data/projects-index.json');
    const indexData = await fs.readFile(projectsIndexPath, 'utf-8');
    const projectsIndex = JSON.parse(indexData);
    
    console.log(`Found ${Object.keys(projectsIndex).length} projects in index`);
    
    // Read each project file
    for (const [projectId, indexEntry] of Object.entries(projectsIndex)) {
      try {
        const projectPath = path.join(process.cwd(), 'data/projects', (indexEntry as any).path, 'project.json');
        const projectData = await fs.readFile(projectPath, 'utf-8');
        const project = JSON.parse(projectData) as Project;
        
        // Ensure projectId is a number
        project.projectId = parseInt(projectId);
        
        projects.push(project);
        console.log(`✅ Loaded project ${projectId}: ${project.title}`);
        
      } catch (error) {
        console.warn(`⚠️ Failed to load project ${projectId}:`, error);
      }
    }
    
    // Sort projects by ID
    projects.sort((a, b) => a.projectId - b.projectId);
    
    // Write the consolidated projects.json file
    const outputPath = path.join(process.cwd(), 'data/projects.json');
    await fs.writeFile(outputPath, JSON.stringify(projects, null, 2));
    
    console.log(`\n✅ Generated data/projects.json with ${projects.length} projects`);
    console.log(`📊 Project breakdown:`);
    
    // Generate some statistics
    const statusCounts = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const invoicingMethodCounts = projects.reduce((acc, project) => {
      const method = project.invoicingMethod || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`   Status distribution:`, statusCounts);
    console.log(`   Invoicing methods:`, invoicingMethodCounts);
    
    // Check for milestone projects specifically
    const milestoneProjects = projects.filter(p => p.invoicingMethod === 'milestone');
    console.log(`   Milestone projects: ${milestoneProjects.length}`);
    
    if (milestoneProjects.length > 0) {
      console.log(`   Milestone project IDs: ${milestoneProjects.map(p => p.projectId).join(', ')}`);
    }
    
    return projects.length;
    
  } catch (error) {
    console.error('❌ Failed to generate projects.json:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  generateProjectsJson()
    .then(count => {
      console.log(`\n🎉 Successfully generated projects.json with ${count} projects`);
      process.exit(0);
    })
    .catch(error => {
      console.error('🚨 Script failed:', error);
      process.exit(1);
    });
}

export { generateProjectsJson };

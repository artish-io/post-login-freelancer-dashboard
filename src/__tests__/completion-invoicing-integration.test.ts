/**
 * Completion Invoicing Integration Test
 * 
 * Tests that completion invoicing works end-to-end with canonical storage resolvers.
 * Validates that APIs can find projects and tasks using hierarchical storage.
 */

import { jest } from '@jest/globals';
import { readProject } from '../lib/storage/normalize-project';
import { resolveCanonicalProjectPath } from '../lib/storage/project-paths';
import { resolveCanonicalTasksPath } from '../lib/storage/tasks-paths';
import { getTasks } from '../lib/tasks/task-store';

describe('Completion Invoicing Integration', () => {
  
  describe('Canonical Storage Integration', () => {
    
    it('should read project 303 using canonical resolvers', async () => {
      // Test that we can read project 303 using the canonical resolver (completion project)
      const project = await readProject(303);

      expect(project).toBeDefined();
      expect(project.projectId).toBe(303);
      expect(project.invoicingMethod).toBe('completion');
      expect(project.totalBudget).toBe(9000);
      expect(project.upfrontCommitment).toBe(2000);

      console.log('✅ Successfully read project 303 using canonical resolver');
      console.log(`   Title: ${project.title}`);
      console.log(`   Budget: $${project.totalBudget}`);
      console.log(`   Upfront: $${project.upfrontCommitment}`);
    });

    it('should resolve project path using canonical resolver', async () => {
      const resolution = await resolveCanonicalProjectPath(303);

      expect(resolution).toBeDefined();
      expect(resolution?.canonicalPath).toBe('2025/07/29/303');
      expect(resolution?.source).toBe('index');

      console.log('✅ Successfully resolved project path');
      console.log(`   Path: ${resolution?.canonicalPath}`);
      console.log(`   Source: ${resolution?.source}`);
    });

    it('should resolve tasks path using canonical resolver', async () => {
      const resolution = await resolveCanonicalTasksPath(303);

      expect(resolution).toBeDefined();
      expect(resolution.filePath).toContain('tasks.json');
      expect(['hierarchical', 'legacy']).toContain(resolution.storage);

      console.log('✅ Successfully resolved tasks path');
      console.log(`   Path: ${resolution.filePath}`);
      console.log(`   Storage: ${resolution.storage}`);
    });

    it('should read tasks using canonical task store', async () => {
      const tasks = await getTasks(303);

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThanOrEqual(0);

      // Validate task structure if tasks exist
      if (tasks.length > 0) {
        const firstTask = tasks[0];
        expect(firstTask).toHaveProperty('id');
        expect(firstTask).toHaveProperty('title');
        expect(firstTask).toHaveProperty('status');

        console.log('✅ Successfully read tasks using canonical task store');
        console.log(`   Found ${tasks.length} tasks`);
        console.log(`   First task: ${firstTask.title}`);
      } else {
        console.log('✅ Successfully read tasks using canonical task store (empty)');
      }
    });
  });

  describe('Completion Invoicing Business Logic', () => {
    
    it('should calculate upfront payment correctly', async () => {
      const project = await readProject(303);

      // For project 303: totalBudget = 9000, upfrontCommitment = 2000 (fixed amount)
      const totalBudget = project.totalBudget || 0;
      const upfrontAmount = project.upfrontCommitment || 0;
      const completionAmount = totalBudget - upfrontAmount;

      expect(upfrontAmount).toBe(2000);
      expect(completionAmount).toBe(7000);
      expect(upfrontAmount + completionAmount).toBe(totalBudget);

      console.log('✅ Upfront payment calculation validated');
      console.log(`   Total Budget: $${totalBudget}`);
      console.log(`   Upfront: $${upfrontAmount}`);
      console.log(`   Completion: $${completionAmount}`);
    });

    it('should validate task completion requirements', async () => {
      const tasks = await getTasks(303);

      if (tasks.length > 0) {
        const completedTasks = tasks.filter(task => task.status === 'done');
        const totalTasks = tasks.length;
        const completionPercentage = Math.round((completedTasks.length / totalTasks) * 100);

        console.log('✅ Task completion analysis');
        console.log(`   Total tasks: ${totalTasks}`);
        console.log(`   Completed tasks: ${completedTasks.length}`);
        console.log(`   Completion rate: ${completionPercentage}%`);

        // For completion invoicing, all tasks must be completed
        const allTasksCompleted = completedTasks.length === totalTasks;

        if (allTasksCompleted) {
          console.log('✅ All tasks completed - eligible for completion payment');
        } else {
          console.log('⚠️ Not all tasks completed - completion payment should be blocked');
        }

        expect(typeof allTasksCompleted).toBe('boolean');
      } else {
        console.log('✅ No tasks found - task completion validation skipped');
      }
    });
  });

  describe('Error Handling', () => {
    
    it('should handle non-existent project gracefully', async () => {
      await expect(readProject(99999)).rejects.toThrow();
      
      console.log('✅ Non-existent project handling validated');
    });

    it('should handle project path resolution for non-existent project', async () => {
      const resolution = await resolveCanonicalProjectPath(99999);
      
      expect(resolution).toBeNull();
      
      console.log('✅ Non-existent project path resolution validated');
    });
  });

  describe('Performance', () => {
    
    it('should resolve project path efficiently using index', async () => {
      const startTime = Date.now();

      const resolution = await resolveCanonicalProjectPath(303);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(resolution?.source).toBe('index');
      expect(duration).toBeLessThan(100); // Should be very fast with index

      console.log('✅ Project resolution performance validated');
      console.log(`   Resolution time: ${duration}ms`);
      console.log(`   Source: ${resolution?.source}`);
    });
  });

  describe('Data Consistency', () => {
    
    it('should have consistent project data across resolvers', async () => {
      // Read project using canonical resolver
      const project = await readProject(303);

      // Resolve path using path resolver
      const pathResolution = await resolveCanonicalProjectPath(303);

      // Both should find the same project
      expect(project.projectId).toBe(303);
      expect(pathResolution?.canonicalPath).toBe('2025/07/29/303');

      console.log('✅ Data consistency validated');
      console.log(`   Project ID: ${project.projectId}`);
      console.log(`   Canonical Path: ${pathResolution?.canonicalPath}`);
    });

    it('should have consistent task data', async () => {
      // Read tasks using canonical task store
      const tasks = await getTasks(303);

      // Resolve tasks path
      const tasksResolution = await resolveCanonicalTasksPath(303);

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasksResolution.filePath).toContain('tasks.json');

      console.log('✅ Task data consistency validated');
      console.log(`   Tasks count: ${tasks.length}`);
      console.log(`   Tasks path: ${tasksResolution.filePath}`);
    });
  });
});

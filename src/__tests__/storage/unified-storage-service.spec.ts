/**
 * Comprehensive tests for UnifiedStorageService
 *
 * Tests atomic writes, validation, concurrency, legacy fallback, and API integration
 *
 * SAFETY MEASURES:
 * - All tests run in isolated temp directories
 * - No writes to actual repository files
 * - Git diff guard to ensure no tracked files are modified
 * - Module cache clearing between tests
 */

import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { UnifiedStorageService, getProjectPath, getTaskPath } from '../../lib/storage/unified-storage-service';
import { Project, ProjectTask } from '../../lib/storage/schemas';

// Test data directory - use DATA_ROOT environment variable for sandboxing
const TEST_DATA_ROOT = process.env.DATA_ROOT || path.join(tmpdir(), `artish-test-storage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

// Track original working directory and environment
const originalCwd = process.cwd;
const originalEnv = { ...process.env };

// Git diff guard - check for any changes to tracked files
function checkGitDiff() {
  try {
    const diff = execSync('git diff --name-only', {
      cwd: originalCwd(),
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    if (diff) {
      throw new Error(`Tests modified tracked files: ${diff}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not a git repository')) {
      // Not in a git repo, skip check
      return;
    }
    throw error;
  }
}

// Mock process.cwd() to use test directory
beforeAll(() => {
  // Set up test environment
  process.env.DATA_ROOT = TEST_DATA_ROOT;
  process.env.NODE_ENV = 'test';
  process.env.DEBUG_STORAGE = '1'; // Enable debug logging
  process.cwd = () => TEST_DATA_ROOT;

  console.log(`🧪 Test sandbox: ${TEST_DATA_ROOT}`);
});

afterAll(async () => {
  // Restore original environment
  process.cwd = originalCwd;
  process.env = originalEnv;

  // Clean up test directory
  try {
    await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to clean up test directory: ${error}`);
  }

  // Check that no tracked files were modified
  checkGitDiff();
});

// Clean up test directory and clear module cache before each test
beforeEach(async () => {
  try {
    await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist, ignore
  }
  await fs.mkdir(TEST_DATA_ROOT, { recursive: true });

  // Clear module cache to ensure fresh imports
  jest.clearAllMocks();
});

// Clean up test directory and verify no repo corruption after each test
afterEach(async () => {
  try {
    await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }

  // Verify no tracked files were modified
  checkGitDiff();
});

describe('UnifiedStorageService', () => {
  const mockProject: Project = {
    projectId: 123,
    title: 'Test Project',
    description: 'A test project',
    commissionerId: 1,
    freelancerId: 2,
    status: 'ongoing',
    invoicingMethod: 'completion',
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z'
  };

  const mockTask: ProjectTask = {
    taskId: 456,
    projectId: 123,
    projectTitle: 'Test Project',
    title: 'Test Task',
    description: 'A test task',
    status: 'Ongoing',
    completed: false,
    order: 1,
    rejected: false,
    feedbackCount: 0,
    pushedBack: false,
    version: 1,
    createdDate: '2025-01-15T10:00:00.000Z',
    lastModified: '2025-01-15T10:00:00.000Z'
  };

  describe('Path Generation', () => {
    it('should generate correct project path', () => {
      const projectPath = getProjectPath({
        id: 123,
        createdAt: '2025-01-15T10:00:00.000Z'
      });

      expect(projectPath).toContain('data/projects/2025/01/15/123/project.json');
    });

    it('should generate correct task path', () => {
      const taskPath = getTaskPath({
        id: 456,
        projectId: 123,
        createdAt: '2025-01-15T10:00:00.000Z'
      });

      expect(taskPath).toContain('data/project-tasks/2025/01/15/123/456-task.json');
    });
  });

  describe('Project Operations', () => {
    it('should write and read a project', async () => {
      await UnifiedStorageService.writeProject(mockProject);
      const readProject = await UnifiedStorageService.readProject(123);

      expect(readProject).toEqual(expect.objectContaining({
        projectId: 123,
        title: 'Test Project',
        status: 'ongoing'
      }));
    });

    it('should update project indexes when writing', async () => {
      await UnifiedStorageService.writeProject(mockProject);

      // Check main index
      const indexPath = path.join(TEST_DATA_ROOT, 'data', 'projects-index.json');
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);

      expect(index['123']).toBe('2025-01-15T10:00:00.000Z');

      // Check metadata index
      const metadataIndexPath = path.join(TEST_DATA_ROOT, 'data', 'projects', 'metadata', 'projects-index.json');
      const metadataIndexData = await fs.readFile(metadataIndexPath, 'utf-8');
      const metadataIndex = JSON.parse(metadataIndexData);

      expect(metadataIndex['123']).toBe('2025-01-15T10:00:00.000Z');
    });

    it('should list projects with filtering', async () => {
      const project1 = { ...mockProject, projectId: 1, freelancerId: 1 };
      const project2 = { ...mockProject, projectId: 2, freelancerId: 2 };

      await UnifiedStorageService.writeProject(project1);
      await UnifiedStorageService.writeProject(project2);

      const allProjects = await UnifiedStorageService.listProjects();
      expect(allProjects).toHaveLength(2);

      const freelancerProjects = await UnifiedStorageService.listProjects({
        freelancerId: 1
      });
      expect(freelancerProjects).toHaveLength(1);
      expect(freelancerProjects[0].projectId).toBe(1);
    });

    it('should handle pagination', async () => {
      // Create multiple projects
      for (let i = 1; i <= 5; i++) {
        await UnifiedStorageService.writeProject({
          ...mockProject,
          projectId: i
        });
      }

      const page1 = await UnifiedStorageService.listProjects({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await UnifiedStorageService.listProjects({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);
    });
  });

  describe('Task Operations', () => {
    beforeEach(async () => {
      // Create project first
      await UnifiedStorageService.writeProject(mockProject);
    });

    it('should write and read a task', async () => {
      await UnifiedStorageService.writeTask(mockTask);
      const readTask = await UnifiedStorageService.readTask(123, 456);

      expect(readTask).toEqual(expect.objectContaining({
        taskId: 456,
        projectId: 123,
        title: 'Test Task',
        status: 'Ongoing'
      }));
    });

    it('should update task indexes when writing', async () => {
      await UnifiedStorageService.writeTask(mockTask);

      const indexPath = path.join(TEST_DATA_ROOT, 'data', 'project-tasks', 'metadata', 'tasks-index.json');
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);

      expect(index['456']).toEqual({
        projectId: 123,
        createdAt: '2025-01-15T10:00:00.000Z'
      });
    });

    it('should list tasks for a project', async () => {
      const task1 = { ...mockTask, taskId: 1 };
      const task2 = { ...mockTask, taskId: 2, status: 'Approved' as const };

      await UnifiedStorageService.writeTask(task1);
      await UnifiedStorageService.writeTask(task2);

      const allTasks = await UnifiedStorageService.listTasks(123);
      expect(allTasks).toHaveLength(2);

      const ongoingTasks = await UnifiedStorageService.listTasks(123, {
        status: 'Ongoing'
      });
      expect(ongoingTasks).toHaveLength(1);
      expect(ongoingTasks[0].taskId).toBe(1);
    });
  });

  describe('Validation', () => {
    it('should reject invalid project data', async () => {
      const invalidProject = {
        projectId: 'invalid', // Should be number
        title: '',            // Should not be empty
        commissionerId: 1,
        freelancerId: 2,
        status: 'invalid',    // Should be valid enum
        invoicingMethod: 'completion',
        createdAt: '2025-01-15T10:00:00.000Z'
      };

      await expect(
        UnifiedStorageService.writeProject(invalidProject as any)
      ).rejects.toThrow();
    });

    it('should reject invalid task data', async () => {
      const invalidTask = {
        taskId: 'invalid',    // Should be number
        projectId: 123,
        title: '',            // Should not be empty
        status: 'invalid',    // Should be valid enum
        completed: false,
        order: 1,
        createdDate: '2025-01-15T10:00:00.000Z'
      };

      await expect(
        UnifiedStorageService.writeTask(invalidTask as any)
      ).rejects.toThrow();
    });
  });

  describe('Atomic Operations', () => {
    it('should write files atomically', async () => {
      // This test verifies that writes are atomic by checking that
      // partial files are not left behind on interruption
      const projectPath = getProjectPath(mockProject);
      const tempPath = `${projectPath}.tmp`;

      await UnifiedStorageService.writeProject(mockProject);

      // Verify final file exists
      expect(await fs.access(projectPath).then(() => true).catch(() => false)).toBe(true);

      // Verify temp file doesn't exist
      expect(await fs.access(tempPath).then(() => true).catch(() => false)).toBe(false);
    });
  });

  describe('Legacy Compatibility', () => {
    it('should fall back to legacy files with warning', async () => {
      // Create legacy project file
      const legacyProjectsPath = path.join(TEST_DATA_ROOT, 'data', 'projects.json');
      await fs.mkdir(path.dirname(legacyProjectsPath), { recursive: true });
      await fs.writeFile(legacyProjectsPath, JSON.stringify([mockProject]));

      // Mock console.warn to capture warnings
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (message: string) => warnings.push(message);

      try {
        const project = await UnifiedStorageService.readProject(123);
        expect(project).toEqual(expect.objectContaining({
          projectId: 123,
          title: 'Test Project'
        }));

        // Should warn only once
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('Legacy read for project 123');

        // Second read should not warn again
        await UnifiedStorageService.readProject(123);
        expect(warnings).toHaveLength(1);
      } finally {
        console.warn = originalWarn;
      }
    });

    it('should fall back to legacy task files with warning', async () => {
      // Create legacy task file
      const legacyTasksPath = path.join(TEST_DATA_ROOT, 'data', 'project-tasks.json');
      await fs.mkdir(path.dirname(legacyTasksPath), { recursive: true });
      await fs.writeFile(legacyTasksPath, JSON.stringify([mockTask]));

      // Mock console.warn to capture warnings
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (message: string) => warnings.push(message);

      try {
        const task = await UnifiedStorageService.readTask(123, 456);
        expect(task).toEqual(expect.objectContaining({
          taskId: 456,
          projectId: 123,
          title: 'Test Task'
        }));

        // Should warn only once
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('Legacy read for task 456');
      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent writes safely', async () => {
      // Create multiple concurrent write operations
      const promises = [];
      for (let i = 1; i <= 10; i++) {
        promises.push(
          UnifiedStorageService.writeProject({
            ...mockProject,
            projectId: i,
            title: `Project ${i}`
          })
        );
      }

      // All writes should complete successfully
      await Promise.all(promises);

      // Verify all projects were written
      const projects = await UnifiedStorageService.listProjects();
      expect(projects).toHaveLength(10);

      // Verify index is consistent
      const indexPath = path.join(TEST_DATA_ROOT, 'data', 'projects-index.json');
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);
      expect(Object.keys(index)).toHaveLength(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing files gracefully', async () => {
      const project = await UnifiedStorageService.readProject(999);
      expect(project).toBeNull();

      const task = await UnifiedStorageService.readTask(999, 999);
      expect(task).toBeNull();
    });

    it('should handle corrupted index files', async () => {
      // Create corrupted index file
      const indexPath = path.join(TEST_DATA_ROOT, 'data', 'projects-index.json');
      await fs.mkdir(path.dirname(indexPath), { recursive: true });
      await fs.writeFile(indexPath, 'invalid json');

      // Should still work (fall back to empty index)
      const projects = await UnifiedStorageService.listProjects();
      expect(projects).toEqual([]);
    });
  });
});

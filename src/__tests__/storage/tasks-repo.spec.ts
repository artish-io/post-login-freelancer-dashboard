/**
 * Tests for tasks-repo adapter
 *
 * Verifies that the repository adapter correctly delegates to UnifiedStorageService
 * while maintaining backward compatibility
 *
 * SAFETY MEASURES:
 * - All tests run in isolated temp directories
 * - No writes to actual repository files
 * - Git diff guard to ensure no tracked files are modified
 */

import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { readAllTasks, listTasksByProject, getTaskById, saveTask } from '../../app/api/payments/repos/tasks-repo';
import { UnifiedStorageService } from '../../lib/storage/unified-storage-service';

// Test data directory - use DATA_ROOT environment variable for sandboxing
const TEST_DATA_ROOT = process.env.DATA_ROOT || path.join(tmpdir(), `artish-test-tasks-repo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

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
      return;
    }
    throw error;
  }
}

// Mock process.cwd() to use test directory
beforeAll(() => {
  process.env.DATA_ROOT = TEST_DATA_ROOT;
  process.env.NODE_ENV = 'test';
  process.cwd = () => TEST_DATA_ROOT;
});

afterAll(async () => {
  process.cwd = originalCwd;
  process.env = originalEnv;

  try {
    await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to clean up test directory: ${error}`);
  }

  checkGitDiff();
});

// Clean up test directory before each test
beforeEach(async () => {
  try {
    await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist, ignore
  }
  await fs.mkdir(TEST_DATA_ROOT, { recursive: true });
  jest.clearAllMocks();
});

// Clean up test directory after each test
afterEach(async () => {
  try {
    await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
  checkGitDiff();
});

describe('Tasks Repository Adapter', () => {
  const mockProject = {
    projectId: 123,
    title: 'Test Project',
    commissionerId: 1,
    freelancerId: 2,
    status: 'ongoing' as const,
    invoicingMethod: 'completion' as const,
    createdAt: '2025-01-15T10:00:00.000Z'
  };

  const mockTask = {
    taskId: 456,
    projectId: 123,
    projectTitle: 'Test Project',
    title: 'Test Task',
    description: 'A test task',
    status: 'Ongoing' as const,
    completed: false,
    order: 1,
    rejected: false,
    feedbackCount: 0,
    pushedBack: false,
    version: 1,
    createdDate: '2025-01-15T10:00:00.000Z',
    lastModified: '2025-01-15T10:00:00.000Z'
  };

  // Mock console.warn to capture deprecation warnings
  let warnings: string[] = [];
  const originalWarn = console.warn;

  beforeEach(async () => {
    warnings = [];
    console.warn = (message: string) => warnings.push(message);

    // Create project first
    await UnifiedStorageService.writeProject(mockProject);
  });

  afterEach(() => {
    console.warn = originalWarn;
  });

  describe('readAllTasks', () => {
    it('should delegate to UnifiedStorageService.listTasks', async () => {
      // Create tasks using UnifiedStorageService
      await UnifiedStorageService.writeTask(mockTask);
      await UnifiedStorageService.writeTask({
        ...mockTask,
        taskId: 457,
        title: 'Another Task'
      });

      const tasks = await readAllTasks();

      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toEqual(expect.objectContaining({
        taskId: 456,
        projectId: 123,
        title: 'Test Task',
        status: 'Ongoing'
      }));

      // Should emit deprecation warning
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('deprecated readAllTasks');
    });

    it('should convert UnifiedStorageService format to legacy format', async () => {
      await UnifiedStorageService.writeTask(mockTask);

      const tasks = await readAllTasks();
      const task = tasks[0];

      // Should have all legacy fields
      expect(task).toEqual(expect.objectContaining({
        id: 456,
        taskId: 456,
        projectId: 123,
        title: 'Test Task',
        status: 'Ongoing',
        completed: false,
        order: 1,
        createdAt: '2025-01-15T10:00:00.000Z',
        updatedAt: '2025-01-15T10:00:00.000Z'
      }));
    });
  });

  describe('listTasksByProject', () => {
    it('should delegate to UnifiedStorageService.listTasks', async () => {
      await UnifiedStorageService.writeTask(mockTask);
      await UnifiedStorageService.writeTask({
        ...mockTask,
        taskId: 457,
        title: 'Another Task'
      });

      const tasks = await listTasksByProject(123);

      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toEqual(expect.objectContaining({
        taskId: 456,
        projectId: 123,
        title: 'Test Task'
      }));

      // Should emit deprecation warning
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('deprecated listTasksByProject');
    });

    it('should return empty array for project with no tasks', async () => {
      const tasks = await listTasksByProject(999);
      expect(tasks).toEqual([]);
    });
  });

  describe('getTaskById', () => {
    it('should delegate to UnifiedStorageService.readTask', async () => {
      await UnifiedStorageService.writeTask(mockTask);

      const task = await getTaskById(456);

      expect(task).toEqual(expect.objectContaining({
        taskId: 456,
        projectId: 123,
        title: 'Test Task',
        status: 'Ongoing'
      }));

      // Should emit deprecation warning
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('deprecated getTaskById');
    });

    it('should return null for non-existent task', async () => {
      const task = await getTaskById(999);
      expect(task).toBeNull();
    });

    it('should search across all projects', async () => {
      // Create another project and task
      const project2 = { ...mockProject, projectId: 124 };
      await UnifiedStorageService.writeProject(project2);
      
      const task2 = { ...mockTask, taskId: 457, projectId: 124 };
      await UnifiedStorageService.writeTask(task2);

      const foundTask = await getTaskById(457);
      expect(foundTask).toEqual(expect.objectContaining({
        taskId: 457,
        projectId: 124
      }));
    });
  });

  describe('saveTask', () => {
    it('should delegate to UnifiedStorageService.writeTask', async () => {
      const newTask = {
        id: 456,
        taskId: 456,
        projectId: 123,
        projectTitle: 'Test Project',
        title: 'New Task',
        status: 'Ongoing' as const,
        completed: false,
        order: 1,
        rejected: false,
        feedbackCount: 0,
        pushedBack: false,
        version: 1,
        createdDate: '2025-01-15T10:00:00.000Z',
        lastModified: '2025-01-15T10:00:00.000Z',
        createdAt: '2025-01-15T10:00:00.000Z',
        updatedAt: '2025-01-15T10:00:00.000Z'
      };

      const result = await saveTask(newTask);

      expect(result).toEqual(expect.objectContaining({
        taskId: 456,
        title: 'New Task',
        status: 'Ongoing'
      }));

      // Should have updated timestamp
      expect(result.lastModified).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // Should emit deprecation warning
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('deprecated saveTask');

      // Verify it was actually written
      const readTask = await UnifiedStorageService.readTask(123, 456);
      expect(readTask).toBeTruthy();
      expect(readTask?.title).toBe('New Task');
    });

    it('should handle missing optional fields', async () => {
      const minimalTask = {
        id: 456,
        taskId: 456,
        projectId: 123,
        title: 'Minimal Task',
        status: 'Ongoing' as const,
        completed: false,
        order: 1,
        createdAt: '2025-01-15T10:00:00.000Z',
        updatedAt: '2025-01-15T10:00:00.000Z'
      };

      const result = await saveTask(minimalTask);

      expect(result).toEqual(expect.objectContaining({
        taskId: 456,
        title: 'Minimal Task'
      }));

      // Should have defaults for missing fields
      expect(result.rejected).toBe(false);
      expect(result.feedbackCount).toBe(0);
      expect(result.pushedBack).toBe(false);
      expect(result.version).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle UnifiedStorageService errors gracefully', async () => {
      // Try to read from corrupted storage
      const indexPath = path.join(TEST_DATA_ROOT, 'data', 'project-tasks', 'metadata', 'tasks-index.json');
      await fs.mkdir(path.dirname(indexPath), { recursive: true });
      await fs.writeFile(indexPath, 'invalid json');

      // Should not throw, should return empty array
      const tasks = await readAllTasks();
      expect(tasks).toEqual([]);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain function signatures', () => {
      // Verify function signatures haven't changed
      expect(typeof readAllTasks).toBe('function');
      expect(typeof listTasksByProject).toBe('function');
      expect(typeof getTaskById).toBe('function');
      expect(typeof saveTask).toBe('function');
    });

    it('should return data in legacy format', async () => {
      await UnifiedStorageService.writeTask(mockTask);

      const task = await getTaskById(456);

      // Should have all expected legacy fields
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('taskId');
      expect(task).toHaveProperty('projectId');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('completed');
      expect(task).toHaveProperty('order');
      expect(task).toHaveProperty('createdAt');
      expect(task).toHaveProperty('updatedAt');
    });
  });
});

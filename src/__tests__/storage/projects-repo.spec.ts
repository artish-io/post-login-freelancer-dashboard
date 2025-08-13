/**
 * Tests for projects-repo adapter
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
import { readAllProjects, getProjectById, createProject, updateProject } from '../../app/api/payments/repos/projects-repo';
import { UnifiedStorageService } from '../../lib/storage/unified-storage-service';

// Test data directory - use DATA_ROOT environment variable for sandboxing
const TEST_DATA_ROOT = process.env.DATA_ROOT || path.join(tmpdir(), `artish-test-repo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

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

describe('Projects Repository Adapter', () => {
  const mockProject = {
    projectId: 123,
    title: 'Test Project',
    description: 'A test project',
    organizationId: 1,
    typeTags: ['web', 'design'],
    commissionerId: 1,
    freelancerId: 2,
    status: 'ongoing' as const,
    dueDate: '2025-02-01T00:00:00.000Z',
    totalTasks: 5,
    invoicingMethod: 'completion' as const,
    totalBudget: 1000,
    upfrontCommitment: 200,
    paidToDate: 0,
    currency: 'USD',
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z'
  };

  // Mock console.warn to capture deprecation warnings
  let warnings: string[] = [];
  const originalWarn = console.warn;

  beforeEach(() => {
    warnings = [];
    console.warn = (message: string) => warnings.push(message);
  });

  afterEach(() => {
    console.warn = originalWarn;
  });

  describe('readAllProjects', () => {
    it('should delegate to UnifiedStorageService.listProjects', async () => {
      // Create a project using UnifiedStorageService
      await UnifiedStorageService.writeProject({
        projectId: mockProject.projectId,
        title: mockProject.title,
        description: mockProject.description,
        commissionerId: mockProject.commissionerId,
        freelancerId: mockProject.freelancerId,
        status: mockProject.status,
        invoicingMethod: mockProject.invoicingMethod,
        createdAt: mockProject.createdAt,
        updatedAt: mockProject.updatedAt
      });

      const projects = await readAllProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual(expect.objectContaining({
        projectId: 123,
        title: 'Test Project',
        status: 'ongoing'
      }));

      // Should emit deprecation warning
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('deprecated readAllProjects');
    });

    it('should convert UnifiedStorageService format to legacy format', async () => {
      await UnifiedStorageService.writeProject({
        projectId: 123,
        title: 'Test Project',
        commissionerId: 1,
        freelancerId: 2,
        status: 'ongoing',
        invoicingMethod: 'completion',
        createdAt: '2025-01-15T10:00:00.000Z'
      });

      const projects = await readAllProjects();
      const project = projects[0];

      // Should have all legacy fields with defaults
      expect(project).toEqual(expect.objectContaining({
        projectId: 123,
        title: 'Test Project',
        typeTags: [],
        paidToDate: 0,
        currency: 'USD',
        createdAt: '2025-01-15T10:00:00.000Z'
      }));
    });
  });

  describe('getProjectById', () => {
    it('should delegate to UnifiedStorageService.readProject', async () => {
      await UnifiedStorageService.writeProject({
        projectId: 123,
        title: 'Test Project',
        commissionerId: 1,
        freelancerId: 2,
        status: 'ongoing',
        invoicingMethod: 'completion',
        createdAt: '2025-01-15T10:00:00.000Z'
      });

      const project = await getProjectById(123);

      expect(project).toEqual(expect.objectContaining({
        projectId: 123,
        title: 'Test Project',
        status: 'ongoing'
      }));

      // Should emit deprecation warning
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('deprecated getProjectById');
    });

    it('should return null for non-existent project', async () => {
      const project = await getProjectById(999);
      expect(project).toBeNull();
    });
  });

  describe('createProject', () => {
    it('should delegate to UnifiedStorageService.writeProject', async () => {
      const newProject = {
        projectId: 123,
        title: 'New Project',
        commissionerId: 1,
        freelancerId: 2,
        status: 'proposed' as const,
        invoicingMethod: 'completion' as const
      };

      const result = await createProject(newProject);

      expect(result).toEqual(expect.objectContaining({
        projectId: 123,
        title: 'New Project',
        status: 'proposed'
      }));

      // Should have timestamps
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // Should emit deprecation warning
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('deprecated createProject');

      // Verify it was actually written
      const readProject = await UnifiedStorageService.readProject(123);
      expect(readProject).toBeTruthy();
    });
  });

  describe('updateProject', () => {
    beforeEach(async () => {
      // Create initial project
      await UnifiedStorageService.writeProject({
        projectId: 123,
        title: 'Original Title',
        commissionerId: 1,
        freelancerId: 2,
        status: 'ongoing',
        invoicingMethod: 'completion',
        createdAt: '2025-01-15T10:00:00.000Z'
      });
    });

    it('should delegate to UnifiedStorageService.writeProject', async () => {
      const updates = {
        title: 'Updated Title',
        status: 'completed' as const
      };

      const result = await updateProject(123, updates);

      expect(result).toEqual(expect.objectContaining({
        projectId: 123,
        title: 'Updated Title',
        status: 'completed'
      }));

      // Should have updated timestamp
      expect(result?.updatedAt).not.toBe('2025-01-15T10:00:00.000Z');

      // Should emit deprecation warning
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('deprecated updateProject');

      // Verify it was actually updated
      const readProject = await UnifiedStorageService.readProject(123);
      expect(readProject?.title).toBe('Updated Title');
    });

    it('should return null for non-existent project', async () => {
      const result = await updateProject(999, { title: 'New Title' });
      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle UnifiedStorageService errors gracefully', async () => {
      // Try to read from corrupted storage
      const indexPath = path.join(TEST_DATA_ROOT, 'data', 'projects-index.json');
      await fs.mkdir(path.dirname(indexPath), { recursive: true });
      await fs.writeFile(indexPath, 'invalid json');

      // Should not throw, should return empty array
      const projects = await readAllProjects();
      expect(projects).toEqual([]);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain function signatures', () => {
      // Verify function signatures haven't changed
      expect(typeof readAllProjects).toBe('function');
      expect(typeof getProjectById).toBe('function');
      expect(typeof createProject).toBe('function');
      expect(typeof updateProject).toBe('function');
    });

    it('should return data in legacy format', async () => {
      await UnifiedStorageService.writeProject({
        projectId: 123,
        title: 'Test Project',
        commissionerId: 1,
        freelancerId: 2,
        status: 'ongoing',
        invoicingMethod: 'completion',
        createdAt: '2025-01-15T10:00:00.000Z'
      });

      const project = await getProjectById(123);

      // Should have all expected legacy fields
      expect(project).toHaveProperty('projectId');
      expect(project).toHaveProperty('title');
      expect(project).toHaveProperty('typeTags');
      expect(project).toHaveProperty('paidToDate');
      expect(project).toHaveProperty('currency');
      expect(project).toHaveProperty('createdAt');
      expect(project).toHaveProperty('updatedAt');
    });
  });
});

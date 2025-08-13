/**
 * API Integration Tests for UnifiedStorageService
 *
 * Tests that API routes correctly use the unified storage system
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
import { NextRequest } from 'next/server';
import { GET as getProjects } from '../../app/api/projects/route';
import { GET as getProjectById } from '../../app/api/projects/[id]/route';
import { UnifiedStorageService } from '../../lib/storage/unified-storage-service';

// Test data directory - use DATA_ROOT environment variable for sandboxing
const TEST_DATA_ROOT = process.env.DATA_ROOT || path.join(tmpdir(), `artish-test-api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

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

describe('API Integration with UnifiedStorageService', () => {
  const mockProject = {
    projectId: 123,
    title: 'Test Project',
    description: 'A test project',
    commissionerId: 1,
    freelancerId: 2,
    status: 'ongoing' as const,
    invoicingMethod: 'completion' as const,
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z'
  };

  describe('/api/projects', () => {
    it('should return projects from UnifiedStorageService', async () => {
      // Create test projects
      await UnifiedStorageService.writeProject(mockProject);
      await UnifiedStorageService.writeProject({
        ...mockProject,
        projectId: 124,
        title: 'Another Project'
      });

      const response = await getProjects();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0]).toEqual(expect.objectContaining({
        projectId: 123,
        title: 'Test Project',
        status: 'ongoing'
      }));
    });

    it('should return empty array when no projects exist', async () => {
      const response = await getProjects();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should handle storage errors gracefully', async () => {
      // Create corrupted index
      const indexPath = path.join(TEST_DATA_ROOT, 'data', 'projects-index.json');
      await fs.mkdir(path.dirname(indexPath), { recursive: true });
      await fs.writeFile(indexPath, 'invalid json');

      const response = await getProjects();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe('/api/projects/[id]', () => {
    beforeEach(async () => {
      // Create test project
      await UnifiedStorageService.writeProject(mockProject);
    });

    it('should return specific project from UnifiedStorageService', async () => {
      // Mock NextRequest with project ID
      const request = new NextRequest('http://localhost:3000/api/projects/123');
      
      // Mock the params that would be provided by Next.js
      const mockParams = { params: { id: '123' } };
      
      // We need to mock the route handler context
      const response = await getProjectById(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expect.objectContaining({
        projectId: 123,
        title: 'Test Project',
        status: 'ongoing'
      }));
    });

    it('should return 404 for non-existent project', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/999');
      const mockParams = { params: { id: '999' } };
      
      const response = await getProjectById(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Project not found' });
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across API calls', async () => {
      // Create project via UnifiedStorageService
      await UnifiedStorageService.writeProject(mockProject);

      // Read via API
      const listResponse = await getProjects();
      const projects = await listResponse.json();

      const detailRequest = new NextRequest('http://localhost:3000/api/projects/123');
      const detailResponse = await getProjectById(detailRequest, { params: { id: '123' } });
      const project = await detailResponse.json();

      // Data should be consistent
      expect(projects[0]).toEqual(project);
    });

    it('should reflect updates immediately', async () => {
      // Create initial project
      await UnifiedStorageService.writeProject(mockProject);

      // Update project
      const updatedProject = {
        ...mockProject,
        title: 'Updated Title',
        updatedAt: new Date().toISOString()
      };
      await UnifiedStorageService.writeProject(updatedProject);

      // Read via API should show updated data
      const request = new NextRequest('http://localhost:3000/api/projects/123');
      const response = await getProjectById(request, { params: { id: '123' } });
      const data = await response.json();

      expect(data.title).toBe('Updated Title');
    });
  });

  describe('Performance', () => {
    it('should handle multiple projects efficiently', async () => {
      // Create many projects
      const promises = [];
      for (let i = 1; i <= 100; i++) {
        promises.push(
          UnifiedStorageService.writeProject({
            ...mockProject,
            projectId: i,
            title: `Project ${i}`
          })
        );
      }
      await Promise.all(promises);

      const startTime = Date.now();
      const response = await getProjects();
      const endTime = Date.now();

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(100);
      
      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary file system errors', async () => {
      // Create project
      await UnifiedStorageService.writeProject(mockProject);

      // Temporarily make directory unreadable (simulate permission error)
      const projectDir = path.join(TEST_DATA_ROOT, 'data', 'projects', '2025', '01', '15', '123');
      
      try {
        await fs.chmod(projectDir, 0o000);
        
        // API should handle error gracefully
        const request = new NextRequest('http://localhost:3000/api/projects/123');
        const response = await getProjectById(request, { params: { id: '123' } });
        
        // Should return 404 instead of crashing
        expect(response.status).toBe(404);
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(projectDir, 0o755);
        } catch (error) {
          // Ignore if already cleaned up
        }
      }
    });
  });

  describe('Cache Headers', () => {
    it('should set appropriate cache headers', async () => {
      await UnifiedStorageService.writeProject(mockProject);

      const response = await getProjects();

      // Should have no-cache headers for dynamic data
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });
  });
});

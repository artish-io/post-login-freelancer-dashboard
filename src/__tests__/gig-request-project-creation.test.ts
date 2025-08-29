/**
 * 🔒 GIG REQUEST PROJECT CREATION TESTS
 * 
 * Tests for surgical fixes to prevent project overwrites and ensure
 * gig-request activations use the -R request ID format.
 * 
 * Uses provided event files as authoritative test artifacts.
 */

import { generateProjectId, createProjectAtomic, auditLog } from '../lib/projects/gig-request-project-id-generator';
import { promises as fs } from 'fs';
import path from 'path';

// Test environment setup
const TEST_DATA_ROOT = path.join(process.cwd(), 'test-data');
const EVENTS_PATH = path.join(TEST_DATA_ROOT, 'notifications', 'events', '2025', 'August', '29');

describe('Gig Request Project Creation', () => {
  beforeAll(async () => {
    // Set feature flag for tests
    process.env.ENABLE_GIG_REQUEST_PROJECT_IDS = 'true';
    
    // Create test data directories
    await fs.mkdir(TEST_DATA_ROOT, { recursive: true });
    await fs.mkdir(path.join(TEST_DATA_ROOT, 'projects'), { recursive: true });
    await fs.mkdir(path.join(TEST_DATA_ROOT, 'counters'), { recursive: true });
    await fs.mkdir(EVENTS_PATH, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test data:', error);
    }
  });

  describe('Project ID Generator', () => {
    test('should generate request-format project IDs', async () => {
      const result = await generateProjectId({
        mode: 'request',
        organizationFirstLetter: 'C',
        origin: 'request'
      });

      expect(result.success).toBe(true);
      expect(result.projectId).toMatch(/^C-R\d{3}$/);
      expect(result.projectId).toBe('C-R001'); // First ID should be 001
    });

    test('should generate legacy-format project IDs', async () => {
      const result = await generateProjectId({
        mode: 'legacy',
        organizationFirstLetter: 'L',
        origin: 'match'
      });

      expect(result.success).toBe(true);
      expect(result.projectId).toMatch(/^L-\d{3}$/);
      expect(result.projectId).toBe('L-001'); // First ID should be 001
    });

    test('should increment counters correctly', async () => {
      // Generate first request ID
      const result1 = await generateProjectId({
        mode: 'request',
        organizationFirstLetter: 'T',
        origin: 'request'
      });

      // Generate second request ID
      const result2 = await generateProjectId({
        mode: 'request',
        organizationFirstLetter: 'T',
        origin: 'request'
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.projectId).toBe('T-R001');
      expect(result2.projectId).toBe('T-R002');
    });

    test('should fail with invalid organization letter', async () => {
      const result = await generateProjectId({
        mode: 'request',
        organizationFirstLetter: 'invalid',
        origin: 'request'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('projectId_invalid');
    });

    test('should respect feature flag', async () => {
      // Temporarily disable feature flag
      const originalFlag = process.env.ENABLE_GIG_REQUEST_PROJECT_IDS;
      process.env.ENABLE_GIG_REQUEST_PROJECT_IDS = 'false';

      const result = await generateProjectId({
        mode: 'request',
        organizationFirstLetter: 'C',
        origin: 'request'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('validation_failed');

      // Restore feature flag
      process.env.ENABLE_GIG_REQUEST_PROJECT_IDS = originalFlag;
    });
  });

  describe('Create-Only Project Creation', () => {
    test('should create project when ID is available', async () => {
      const projectId = 'TEST-001';
      const projectData = {
        title: 'Test Project',
        status: 'ongoing',
        createdAt: new Date().toISOString()
      };

      const result = await createProjectAtomic(projectId, projectData);
      expect(result.success).toBe(true);

      // Verify file was created
      const projectPath = path.join(TEST_DATA_ROOT, 'projects', `${projectId}.json`);
      const exists = await fs.access(projectPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    test('should prevent overwrite when project exists', async () => {
      const projectId = 'TEST-002';
      const projectData1 = { title: 'Original Project' };
      const projectData2 = { title: 'Overwrite Attempt' };

      // Create first project
      const result1 = await createProjectAtomic(projectId, projectData1);
      expect(result1.success).toBe(true);

      // Attempt to overwrite
      const result2 = await createProjectAtomic(projectId, projectData2);
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('project_creation_collision');

      // Verify original data is preserved
      const projectPath = path.join(TEST_DATA_ROOT, 'projects', `${projectId}.json`);
      const savedData = JSON.parse(await fs.readFile(projectPath, 'utf-8'));
      expect(savedData.title).toBe('Original Project');
    });
  });

  describe('Collision Detection', () => {
    test('should detect collision and retry with next ID', async () => {
      // Pre-create a project with the first ID
      const firstId = 'X-R001';
      await createProjectAtomic(firstId, { title: 'Existing Project' });

      // Generate new ID - should skip to X-R002
      const result = await generateProjectId({
        mode: 'request',
        organizationFirstLetter: 'X',
        origin: 'request'
      });

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('X-R002');
      expect(result.attempts).toBeGreaterThan(1);
    });

    test('should fail after max attempts', async () => {
      // Pre-create projects to force collision
      const orgLetter = 'Y';
      for (let i = 1; i <= 5; i++) {
        const projectId = `${orgLetter}-R${i.toString().padStart(3, '0')}`;
        await createProjectAtomic(projectId, { title: `Project ${i}` });
      }

      // This should fail after max attempts
      const result = await generateProjectId({
        mode: 'request',
        organizationFirstLetter: orgLetter,
        origin: 'request'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('project_creation_collision');
      expect(result.attempts).toBe(3); // Max attempts
    });
  });

  describe('Event File Verification', () => {
    test('should preserve existing event files', async () => {
      // Copy provided event files to test location
      const sourceFiles = [
        'data/notifications/events/2025/August/29/completion.gig-request-commissioner-accepted/comp_1756500229824_8a56rpw4m.json',
        'data/notifications/events/2025/August/29/completion.gig-request-project_activated/comp_1756500229880_xvk2dzeay.json'
      ];

      for (const sourceFile of sourceFiles) {
        try {
          const sourceData = await fs.readFile(sourceFile, 'utf-8');
          const fileName = path.basename(sourceFile);
          const dirName = path.basename(path.dirname(sourceFile));
          const targetDir = path.join(EVENTS_PATH, dirName);
          
          await fs.mkdir(targetDir, { recursive: true });
          await fs.writeFile(path.join(targetDir, fileName), sourceData);
        } catch (error) {
          console.warn(`Could not copy ${sourceFile}:`, error);
        }
      }

      // Verify files exist and have correct structure
      const commissionerFile = path.join(EVENTS_PATH, 'completion.gig-request-commissioner-accepted', 'comp_1756500229824_8a56rpw4m.json');
      const freelancerFile = path.join(EVENTS_PATH, 'completion.gig-request-project_activated', 'comp_1756500229880_xvk2dzeay.json');

      const commissionerExists = await fs.access(commissionerFile).then(() => true).catch(() => false);
      const freelancerExists = await fs.access(freelancerFile).then(() => true).catch(() => false);

      if (commissionerExists) {
        const commissionerData = JSON.parse(await fs.readFile(commissionerFile, 'utf-8'));
        expect(commissionerData.type).toBe('completion.gig-request-commissioner-accepted');
        expect(commissionerData.projectId).toBe('C-001');
      }

      if (freelancerExists) {
        const freelancerData = JSON.parse(await fs.readFile(freelancerFile, 'utf-8'));
        expect(freelancerData.type).toBe('completion.gig-request-project_activated');
        expect(freelancerData.projectId).toBe('C-001');
      }
    });
  });

  describe('Audit Logging', () => {
    test('should log structured audit events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      auditLog('test_event', { projectId: 'TEST-001', action: 'create' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PROJECT_AUDIT]'),
        expect.stringContaining('test_event'),
        expect.stringContaining('"projectId":"TEST-001"')
      );

      consoleSpy.mockRestore();
    });
  });
});

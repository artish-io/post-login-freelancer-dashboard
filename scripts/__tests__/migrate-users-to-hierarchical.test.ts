// scripts/__tests__/migrate-users-to-hierarchical.test.ts

/**
 * Tests for User Migration Script
 *
 * Tests the migration from flat users.json to hierarchical storage with timestamp enrichment.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { dataPath } from '../../src/lib/storage/root';
import { readJson, writeJsonAtomic } from '../../src/lib/fs-json';
import { readUser } from '../../src/lib/storage/normalize-user';
import { loadUsersIndex } from '../../src/lib/storage/users-index';

// Test data directory - use DATA_ROOT environment variable for sandboxing
const TEST_DATA_ROOT = process.env.DATA_ROOT || path.join(tmpdir(), `artish-test-users-migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

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
  process.cwd = () => TEST_DATA_ROOT;

  console.log(`🧪 Test sandbox: ${TEST_DATA_ROOT}`);
});

afterAll(async () => {
  // Restore original environment
  process.env = originalEnv;
  process.cwd = originalCwd;

  // Clean up test directory
  try {
    await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
  } catch (error) {
    console.warn('Failed to clean up test directory:', error);
  }

  // Check for git changes
  checkGitDiff();
});

// Clear module cache between tests
afterEach(() => {
  jest.clearAllMocks();
});

describe('User Migration Script', () => {
  beforeEach(async () => {
    // Ensure clean test directory
    await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
    await fs.mkdir(TEST_DATA_ROOT, { recursive: true });
  });

  it('should handle empty users.json gracefully', async () => {
    // Create empty users.json
    await writeJsonAtomic(dataPath('users.json'), []);

    // Import and run migration
    const { default: migrateUsers } = await import('../migrate-users-to-hierarchical');
    const stats = await migrateUsers(false);

    expect(stats.totalUsers).toBe(0);
    expect(stats.migrated).toBe(0);
    expect(stats.skipped).toBe(0);
    expect(stats.errors).toBe(0);
  });

  it('should migrate users with dry-run flag', async () => {
    // Create test users
    const testUsers = [
      { id: 1, name: 'Test User 1', type: 'freelancer', email: 'test1@example.com' },
      { id: 2, name: 'Test User 2', type: 'commissioner', email: 'test2@example.com' }
    ];
    await writeJsonAtomic(dataPath('users.json'), testUsers);

    // Import and run migration with dry-run
    const { default: migrateUsers } = await import('../migrate-users-to-hierarchical');
    const stats = await migrateUsers(true);

    expect(stats.totalUsers).toBe(2);
    expect(stats.migrated).toBe(2);
    expect(stats.errors).toBe(0);

    // Verify no files were actually written
    const usersIndex = await loadUsersIndex();
    expect(Object.keys(usersIndex)).toHaveLength(0);
  });

  it('should migrate users and create hierarchical storage', async () => {
    // Create test users
    const testUsers = [
      { id: 1, name: 'Test User 1', type: 'freelancer', email: 'test1@example.com' },
      { id: 2, name: 'Test User 2', type: 'commissioner', email: 'test2@example.com' }
    ];
    await writeJsonAtomic(dataPath('users.json'), testUsers);

    // Import and run migration
    const { default: migrateUsers } = await import('../migrate-users-to-hierarchical');
    const stats = await migrateUsers(false);

    expect(stats.totalUsers).toBe(2);
    expect(stats.migrated).toBe(2);
    expect(stats.errors).toBe(0);

    // Verify users index was created
    const usersIndex = await loadUsersIndex();
    expect(Object.keys(usersIndex)).toHaveLength(2);
    expect(usersIndex['1']).toBeDefined();
    expect(usersIndex['2']).toBeDefined();

    // Verify users can be read from hierarchical storage
    const user1 = await readUser(1);
    expect(user1.id).toBe(1);
    expect(user1.name).toBe('Test User 1');
    expect(user1.createdAt).toBeDefined();
    expect(user1.updatedAt).toBeDefined();

    const user2 = await readUser(2);
    expect(user2.id).toBe(2);
    expect(user2.name).toBe('Test User 2');
    expect(user2.createdAt).toBeDefined();
    expect(user2.updatedAt).toBeDefined();
  });

  it('should enrich timestamps from project involvement', async () => {
    // Create test users
    const testUsers = [
      { id: 1, name: 'Test User 1', type: 'freelancer', email: 'test1@example.com' }
    ];
    await writeJsonAtomic(dataPath('users.json'), testUsers);

    // Create projects index with user involvement
    const projectCreatedAt = '2025-01-15T10:00:00.000Z';
    const projectsIndex = { '100': projectCreatedAt };
    await fs.mkdir(dataPath('projects', 'metadata'), { recursive: true });
    await writeJsonAtomic(dataPath('projects', 'metadata', 'projects-index.json'), projectsIndex);

    // Create project file with user involvement
    const projectDir = dataPath('projects', '2025', '01', '15', '100');
    await fs.mkdir(projectDir, { recursive: true });
    await writeJsonAtomic(path.join(projectDir, 'project.json'), {
      id: 100,
      freelancerId: 1,
      createdAt: projectCreatedAt
    });

    // Import and run migration
    const { default: migrateUsers } = await import('../migrate-users-to-hierarchical');
    const stats = await migrateUsers(false);

    expect(stats.migrated).toBe(1);

    // Verify user got the project's timestamp
    const user = await readUser(1);
    expect(user.createdAt).toBe(projectCreatedAt);
  });

  it('should handle users without IDs gracefully', async () => {
    // Create test users with one missing ID
    const testUsers = [
      { id: 1, name: 'Valid User', type: 'freelancer' },
      { name: 'Invalid User', type: 'freelancer' }, // Missing ID
      { id: 2, name: 'Another Valid User', type: 'commissioner' }
    ];
    await writeJsonAtomic(dataPath('users.json'), testUsers);

    // Import and run migration
    const { default: migrateUsers } = await import('../migrate-users-to-hierarchical');
    const stats = await migrateUsers(false);

    expect(stats.totalUsers).toBe(3);
    expect(stats.migrated).toBe(2);
    expect(stats.skipped).toBe(1);
    expect(stats.errors).toBe(0);
  });

  it('should be idempotent - running twice should not cause issues', async () => {
    // Create test users
    const testUsers = [
      { id: 1, name: 'Test User 1', type: 'freelancer', email: 'test1@example.com' }
    ];
    await writeJsonAtomic(dataPath('users.json'), testUsers);

    // Import and run migration twice
    const { default: migrateUsers } = await import('../migrate-users-to-hierarchical');
    
    const stats1 = await migrateUsers(false);
    expect(stats1.migrated).toBe(1);

    const stats2 = await migrateUsers(false);
    expect(stats2.migrated).toBe(1); // Should still work

    // Verify user is still accessible
    const user = await readUser(1);
    expect(user.id).toBe(1);
    expect(user.name).toBe('Test User 1');
  });
});

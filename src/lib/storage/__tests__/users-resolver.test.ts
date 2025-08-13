// src/lib/storage/__tests__/users-resolver.test.ts

/**
 * Tests for User Storage Utilities
 *
 * Tests the hierarchical user storage system including index management,
 * path resolution, and canonical read/write operations.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { dataPath } from '../root';
import { writeJsonAtomic } from '../../fs-json';
import { 
  saveUserIndexEntry, 
  getUserIndexEntry, 
  loadUsersIndex, 
  clearUsersIndexCache 
} from '../users-index';
import { 
  resolveCanonicalUserPath, 
  deriveHierarchicalUserPath, 
  getFullUserProfilePath 
} from '../user-paths';
import { 
  readUser, 
  writeUser, 
  userExists, 
  UserProfile, 
  UserStorageError 
} from '../normalize-user';

// Test data directory - use DATA_ROOT environment variable for sandboxing
const TEST_DATA_ROOT = process.env.DATA_ROOT || path.join(tmpdir(), `artish-test-users-resolver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

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

// Clear module cache and index cache between tests
afterEach(() => {
  jest.clearAllMocks();
  clearUsersIndexCache();
});

describe('User Index Management', () => {
  beforeEach(async () => {
    // Ensure clean test directory
    await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
    await fs.mkdir(TEST_DATA_ROOT, { recursive: true });
    clearUsersIndexCache();
  });

  it('should save and retrieve user index entries', async () => {
    const userId = 123;
    const canonicalPath = '2025/08/12/123';

    await saveUserIndexEntry(userId, canonicalPath);

    const entry = await getUserIndexEntry(userId);
    expect(entry).toBeDefined();
    expect(entry!.path).toBe(canonicalPath);
    expect(entry!.lastUpdated).toBeDefined();
  });

  it('should load empty index when file does not exist', async () => {
    const index = await loadUsersIndex();
    expect(index).toEqual({});
  });

  it('should handle string and number user IDs', async () => {
    await saveUserIndexEntry(123, '2025/08/12/123');
    await saveUserIndexEntry('456', '2025/08/12/456');

    const entry1 = await getUserIndexEntry(123);
    const entry2 = await getUserIndexEntry('456');

    expect(entry1!.path).toBe('2025/08/12/123');
    expect(entry2!.path).toBe('2025/08/12/456');
  });
});

describe('User Path Utilities', () => {
  beforeEach(async () => {
    await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
    await fs.mkdir(TEST_DATA_ROOT, { recursive: true });
    clearUsersIndexCache();
  });

  it('should derive hierarchical paths correctly', async () => {
    const userId = 123;
    const createdAt = '2025-08-12T10:30:00.000Z';

    const path = deriveHierarchicalUserPath(userId, createdAt);
    expect(path).toBe('2025/08/12/123');
  });

  it('should generate full profile paths correctly', async () => {
    const canonicalPath = '2025/08/12/123';
    const fullPath = getFullUserProfilePath(canonicalPath);
    
    expect(fullPath).toBe(dataPath('users', '2025', '08', '12', '123', 'profile.json'));
  });

  it('should resolve paths from index', async () => {
    const userId = 123;
    const canonicalPath = '2025/08/12/123';
    
    // Create the profile file
    const profilePath = getFullUserProfilePath(canonicalPath);
    await fs.mkdir(path.dirname(profilePath), { recursive: true });
    await writeJsonAtomic(profilePath, { id: userId, name: 'Test User' });
    
    // Add to index
    await saveUserIndexEntry(userId, canonicalPath);

    const resolution = await resolveCanonicalUserPath(userId);
    expect(resolution).toBeDefined();
    expect(resolution!.canonicalPath).toBe(canonicalPath);
    expect(resolution!.source).toBe('index');
  });

  it('should resolve paths by scanning when not in index', async () => {
    const userId = 123;
    const canonicalPath = '2025/08/12/123';
    
    // Create the profile file without adding to index
    const profilePath = getFullUserProfilePath(canonicalPath);
    await fs.mkdir(path.dirname(profilePath), { recursive: true });
    await writeJsonAtomic(profilePath, { id: userId, name: 'Test User' });

    const resolution = await resolveCanonicalUserPath(userId);
    expect(resolution).toBeDefined();
    expect(resolution!.canonicalPath).toBe(canonicalPath);
    expect(resolution!.source).toBe('scan');
  });

  it('should fallback to legacy users.json', async () => {
    const userId = 123;
    
    // Create legacy users.json
    const legacyUsers = [
      { id: userId, name: 'Legacy User', type: 'freelancer' }
    ];
    await writeJsonAtomic(dataPath('users.json'), legacyUsers);

    const resolution = await resolveCanonicalUserPath(userId);
    expect(resolution).toBeDefined();
    expect(resolution!.canonicalPath).toBe('legacy');
    expect(resolution!.source).toBe('legacy-fallback');
  });
});

describe('Canonical User Storage', () => {
  beforeEach(async () => {
    await fs.rm(TEST_DATA_ROOT, { recursive: true, force: true });
    await fs.mkdir(TEST_DATA_ROOT, { recursive: true });
    clearUsersIndexCache();
  });

  it('should write and read user profiles', async () => {
    const user: UserProfile = {
      id: 123,
      name: 'Test User',
      type: 'freelancer',
      email: 'test@example.com',
      createdAt: '2025-08-12T10:30:00.000Z'
    };

    await writeUser(user);

    const readUser1 = await readUser(123);
    expect(readUser1.id).toBe(123);
    expect(readUser1.name).toBe('Test User');
    expect(readUser1.createdAt).toBe('2025-08-12T10:30:00.000Z');
    expect(readUser1.updatedAt).toBeDefined();
  });

  it('should read from legacy storage when hierarchical not available', async () => {
    const userId = 123;
    
    // Create legacy users.json
    const legacyUsers = [
      { id: userId, name: 'Legacy User', type: 'freelancer', email: 'legacy@example.com' }
    ];
    await writeJsonAtomic(dataPath('users.json'), legacyUsers);

    const user = await readUser(userId);
    expect(user.id).toBe(userId);
    expect(user.name).toBe('Legacy User');
    expect(user.type).toBe('freelancer');
  });

  it('should throw error for non-existent users', async () => {
    await expect(readUser(999)).rejects.toThrow(UserStorageError);
    await expect(readUser(999)).rejects.toThrow('User 999 not found');
  });

  it('should validate user data before writing', async () => {
    // Missing ID
    await expect(writeUser({} as UserProfile)).rejects.toThrow(UserStorageError);
    
    // Missing createdAt
    await expect(writeUser({ id: 123 } as UserProfile)).rejects.toThrow(UserStorageError);
    
    // Invalid createdAt
    await expect(writeUser({ 
      id: 123, 
      createdAt: 'invalid-date' 
    } as UserProfile)).rejects.toThrow(UserStorageError);
  });

  it('should check user existence correctly', async () => {
    const user: UserProfile = {
      id: 123,
      name: 'Test User',
      type: 'freelancer',
      createdAt: '2025-08-12T10:30:00.000Z'
    };

    expect(await userExists(123)).toBe(false);
    
    await writeUser(user);
    
    expect(await userExists(123)).toBe(true);
    expect(await userExists(999)).toBe(false);
  });
});

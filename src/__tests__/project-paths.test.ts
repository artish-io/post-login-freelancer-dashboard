/**
 * Project Paths Resolver Tests
 * 
 * Tests the canonical project path resolution with index → scan → legacy fallback.
 */

import { jest } from '@jest/globals';
import path from 'path';
import { promises as fs } from 'fs';
import { 
  resolveCanonicalProjectPath,
  getHierarchicalProjectPath,
  getLegacyProjectPath,
  deriveHierarchicalPath,
  isHierarchicalPath,
  isLegacyPath
} from '../lib/storage/project-paths';
import { 
  loadProjectsIndex, 
  saveProjectsIndex, 
  clearIndexCache 
} from '../lib/storage/projects-index';

// Mock fs-json functions
jest.mock('../lib/fs-json', () => ({
  fileExists: jest.fn(),
  readJson: jest.fn(),
  writeJsonAtomic: jest.fn(),
  ensureDir: jest.fn()
}));

// Mock projects-index functions to avoid using real index
jest.mock('../lib/storage/projects-index', () => ({
  loadProjectsIndex: jest.fn(),
  saveProjectsIndex: jest.fn(),
  clearIndexCache: jest.fn(),
  saveIndexEntry: jest.fn(),
  removeIndexEntry: jest.fn(),
  getIndexEntry: jest.fn(),
  getIndexCacheStats: jest.fn()
}));

const mockFileExists = jest.mocked(require('../lib/fs-json').fileExists);
const mockReadJson = jest.mocked(require('../lib/fs-json').readJson);
const mockLoadProjectsIndex = jest.mocked(require('../lib/storage/projects-index').loadProjectsIndex);
const mockGetIndexEntry = jest.mocked(require('../lib/storage/projects-index').getIndexEntry);

describe('Project Paths Resolver', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    clearIndexCache();
  });

  describe('Path Format Validation', () => {
    
    it('should correctly identify hierarchical paths', () => {
      expect(isHierarchicalPath('2025/07/29/302')).toBe(true);
      expect(isHierarchicalPath('2024/12/01/1')).toBe(true);
      expect(isHierarchicalPath('2025/01/15/999')).toBe(true);
      
      expect(isHierarchicalPath('302')).toBe(false);
      expect(isHierarchicalPath('2025/7/29/302')).toBe(false); // Single digit month
      expect(isHierarchicalPath('2025/07/9/302')).toBe(false); // Single digit day
      expect(isHierarchicalPath('25/07/29/302')).toBe(false); // 2-digit year
    });

    it('should correctly identify legacy paths', () => {
      expect(isLegacyPath('302')).toBe(true);
      expect(isLegacyPath('1')).toBe(true);
      expect(isLegacyPath('999')).toBe(true);
      
      expect(isLegacyPath('2025/07/29/302')).toBe(false);
      expect(isLegacyPath('abc')).toBe(false);
      expect(isLegacyPath('302a')).toBe(false);
    });

    it('should derive correct hierarchical paths from dates', () => {
      expect(deriveHierarchicalPath(302, '2025-07-29T10:00:00.000Z')).toBe('2025/07/29/302');
      expect(deriveHierarchicalPath(1, '2024-01-01T00:00:00.000Z')).toBe('2024/01/01/1');
      expect(deriveHierarchicalPath(999, '2025-12-31T23:59:59.999Z')).toBe('2025/12/31/999');
    });
  });

  describe('Index-based Resolution', () => {
    
    it('should resolve from index when entry exists and file exists', async () => {
      // Mock index entry
      const mockIndexEntry = {
        path: '2025/07/29/302',
        lastUpdated: '2025-07-29T10:00:00.000Z'
      };

      mockGetIndexEntry
        .mockResolvedValueOnce(mockIndexEntry);

      mockFileExists
        .mockResolvedValueOnce(true); // Project file exists

      const result = await resolveCanonicalProjectPath(302);

      expect(result).toEqual({
        canonicalPath: '2025/07/29/302',
        source: 'index'
      });
    });

    it('should skip stale index entries when file is missing', async () => {
      // Mock stale index entry
      const mockIndexEntry = {
        path: '2025/07/29/302',
        lastUpdated: '2025-07-29T10:00:00.000Z'
      };

      mockGetIndexEntry
        .mockResolvedValueOnce(mockIndexEntry);

      mockFileExists
        .mockResolvedValueOnce(false) // Project file missing (stale index)
        .mockResolvedValueOnce(false); // Legacy file also missing

      // Mock fs.readdir to return empty for hierarchical scan
      jest.spyOn(fs, 'readdir').mockResolvedValue([]);

      const result = await resolveCanonicalProjectPath(302);

      expect(result).toBeNull();
    });
  });

  describe('Hierarchical Scan Resolution', () => {
    
    it('should find project through hierarchical scan when not in index', async () => {
      // Mock no index entry
      mockGetIndexEntry
        .mockResolvedValueOnce(null);

      // Mock hierarchical directory structure
      jest.spyOn(fs, 'readdir')
        .mockResolvedValueOnce(['2025']) // Years
        .mockResolvedValueOnce(['07']) // Months
        .mockResolvedValueOnce(['29']) // Days
        .mockResolvedValueOnce(['302']); // Project IDs

      jest.spyOn(fs, 'stat')
        .mockResolvedValue({ isDirectory: () => true } as any);

      mockFileExists
        .mockResolvedValueOnce(true); // Project file exists

      mockReadJson
        .mockResolvedValueOnce({ projectId: 302 }); // Project content

      const result = await resolveCanonicalProjectPath(302);

      expect(result).toEqual({
        canonicalPath: '2025/07/29/302',
        source: 'scan'
      });
    });

    it('should handle scan errors gracefully', async () => {
      mockGetIndexEntry
        .mockResolvedValueOnce(null); // No index entry

      mockFileExists
        .mockResolvedValueOnce(false); // No legacy

      // Mock scan failure
      jest.spyOn(fs, 'readdir').mockRejectedValue(new Error('Permission denied'));

      const result = await resolveCanonicalProjectPath(302);

      expect(result).toBeNull();
    });
  });

  describe('Legacy Fallback Resolution', () => {
    
    it('should fall back to legacy path when hierarchical not found', async () => {
      mockGetIndexEntry
        .mockResolvedValueOnce(null); // No index entry

      mockFileExists
        .mockResolvedValueOnce(true); // Legacy file exists

      // Mock empty hierarchical scan
      jest.spyOn(fs, 'readdir').mockResolvedValue([]);

      const result = await resolveCanonicalProjectPath(302);

      expect(result).toEqual({
        canonicalPath: '302',
        source: 'legacy-fallback'
      });
    });

    it('should return null when no storage found', async () => {
      mockGetIndexEntry
        .mockResolvedValueOnce(null); // No index entry

      mockFileExists
        .mockResolvedValueOnce(false); // No legacy

      // Mock empty hierarchical scan
      jest.spyOn(fs, 'readdir').mockResolvedValue([]);

      const result = await resolveCanonicalProjectPath(302);

      expect(result).toBeNull();
    });
  });

  describe('Individual Path Resolvers', () => {
    
    it('should get hierarchical path from index', async () => {
      const mockIndexEntry = {
        path: '2025/07/29/302',
        lastUpdated: '2025-07-29T10:00:00.000Z'
      };

      mockGetIndexEntry
        .mockResolvedValueOnce(mockIndexEntry);

      mockFileExists
        .mockResolvedValueOnce(true); // Project file exists

      const result = await getHierarchicalProjectPath(302);

      expect(result).toBe('2025/07/29/302');
    });

    it('should get legacy path when file exists', async () => {
      mockFileExists
        .mockResolvedValueOnce(true); // Legacy file exists
      
      const result = await getLegacyProjectPath(302);
      
      expect(result).toBe('302');
    });

    it('should return null when legacy path does not exist', async () => {
      mockFileExists
        .mockResolvedValueOnce(false); // Legacy file missing
      
      const result = await getLegacyProjectPath(302);
      
      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    
    it('should handle index read errors gracefully', async () => {
      mockGetIndexEntry
        .mockRejectedValueOnce(new Error('Corrupted index'));

      // Should fall back to scan
      jest.spyOn(fs, 'readdir').mockResolvedValue([]);

      mockFileExists
        .mockResolvedValueOnce(false); // No legacy

      const result = await resolveCanonicalProjectPath(302);

      expect(result).toBeNull();
    });

    it('should handle project file read errors during scan', async () => {
      mockGetIndexEntry
        .mockResolvedValueOnce(null); // No index entry

      jest.spyOn(fs, 'readdir')
        .mockResolvedValueOnce(['2025'])
        .mockResolvedValueOnce(['07'])
        .mockResolvedValueOnce(['29'])
        .mockResolvedValueOnce(['302']);

      jest.spyOn(fs, 'stat')
        .mockResolvedValue({ isDirectory: () => true } as any);

      mockFileExists
        .mockResolvedValueOnce(true) // Project file exists
        .mockResolvedValueOnce(false); // No legacy

      mockReadJson
        .mockRejectedValueOnce(new Error('Corrupted project file'));

      const result = await resolveCanonicalProjectPath(302);

      expect(result).toBeNull();
    });
  });
});

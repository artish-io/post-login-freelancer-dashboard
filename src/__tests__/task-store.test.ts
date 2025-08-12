/**
 * Task Store Test Suite
 * 
 * Tests the task store functionality including:
 * - Consolidation fallback builds tasks.json when missing
 * - De-duplication works; _archive created
 * - Canonical task operations
 * - Error handling for invalid data
 */

import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  getTasks,
  saveTasks,
  getTask,
  updateTask,
  TaskStoreError,
  Task,
  TasksContainer
} from '@/lib/tasks/task-store';

// Mock fs-json module
jest.mock('@/lib/fs-json', () => ({
  writeJsonAtomic: jest.fn(),
  readJson: jest.fn(),
  fileExists: jest.fn(),
  ensureDir: jest.fn()
}));

// Mock fs module for consolidation
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

import { writeJsonAtomic, readJson, fileExists, ensureDir } from '@/lib/fs-json';

const mockWriteJsonAtomic = writeJsonAtomic as jest.MockedFunction<typeof writeJsonAtomic>;
const mockReadJson = readJson as jest.MockedFunction<typeof readJson>;
const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;
const mockEnsureDir = ensureDir as jest.MockedFunction<typeof ensureDir>;
const mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;
const mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;

describe('Task Store', () => {
  
  const mockTasks: Task[] = [
    {
      id: 1,
      title: 'Design wireframes',
      status: 'done',
      milestoneId: 1,
      completedAt: '2025-08-11T10:00:00.000Z',
      links: {
        brief: '',
        work: 'https://figma.com/design'
      },
      projectId: 301,
      description: 'Create wireframes for the project',
      order: 1
    },
    {
      id: 2,
      title: 'Implement frontend',
      status: 'in_progress',
      milestoneId: 2,
      completedAt: null,
      links: {
        brief: '',
        work: ''
      },
      projectId: 301,
      description: 'Build the frontend components',
      order: 2
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    
    it('should return tasks from canonical file when it exists', async () => {
      const mockContainer: TasksContainer = {
        tasks: mockTasks,
        updatedAt: '2025-08-11T10:00:00.000Z',
        version: 1
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(mockContainer);

      const result = await getTasks(301);

      expect(result).toEqual(mockTasks);
      expect(mockFileExists).toHaveBeenCalledWith(
        expect.stringContaining('data/projects/301/tasks/tasks.json')
      );
      expect(mockReadJson).toHaveBeenCalledWith(
        expect.stringContaining('data/projects/301/tasks/tasks.json'),
        expect.any(Object)
      );
    });

    it('should consolidate scattered files when canonical file missing', async () => {
      // Canonical file doesn't exist
      mockFileExists.mockResolvedValue(false);
      
      // Mock scattered task files
      mockReaddir.mockImplementation(async (dir: any) => {
        if (dir.includes('project-tasks')) {
          return [
            { name: '2025', isDirectory: () => true },
          ] as any;
        }
        if (dir.includes('2025')) {
          return [
            { name: '07', isDirectory: () => true },
          ] as any;
        }
        if (dir.includes('07')) {
          return [
            { name: '14', isDirectory: () => true },
          ] as any;
        }
        if (dir.includes('14')) {
          return [
            { name: '301', isDirectory: () => true },
          ] as any;
        }
        if (dir.includes('301')) {
          return [
            { name: '1-task.json', isDirectory: () => false },
            { name: '2-task.json', isDirectory: () => false },
          ] as any;
        }
        return [];
      });

      // Mock task file contents
      mockReadJson.mockImplementation(async (filePath: string) => {
        if (filePath.includes('1-task.json')) {
          return {
            id: 1,
            projectId: 301,
            title: 'Design wireframes',
            status: 'Approved',
            completed: true,
            link: 'https://figma.com/design'
          };
        }
        if (filePath.includes('2-task.json')) {
          return {
            id: 2,
            projectId: 301,
            title: 'Implement frontend',
            status: 'Ongoing',
            completed: false
          };
        }
        return null;
      });

      // Mock file stats for mtime comparison
      mockStat.mockResolvedValue({
        mtime: new Date('2025-08-11T10:00:00.000Z')
      } as any);

      // Mock save operations
      mockWriteJsonAtomic.mockResolvedValue(undefined);
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await getTasks(301);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].status).toBe('done'); // Mapped from 'Approved'
      expect(result[1].id).toBe(2);
      expect(result[1].status).toBe('in_progress'); // Mapped from 'Ongoing'
      
      // Should save consolidated tasks
      expect(mockWriteJsonAtomic).toHaveBeenCalledWith(
        expect.stringContaining('data/projects/301/tasks/tasks.json'),
        expect.objectContaining({
          tasks: expect.arrayContaining([
            expect.objectContaining({ id: 1 }),
            expect.objectContaining({ id: 2 })
          ])
        })
      );
    });

    it('should handle de-duplication with last write wins', async () => {
      mockFileExists.mockResolvedValue(false);
      
      // Mock multiple files with same task ID but different mtimes
      mockReaddir.mockImplementation(async (dir: any) => {
        if (dir.includes('project-tasks')) {
          return [{ name: '2025', isDirectory: () => true }] as any;
        }
        if (dir.includes('2025')) {
          return [{ name: '07', isDirectory: () => true }] as any;
        }
        if (dir.includes('07')) {
          return [
            { name: '14', isDirectory: () => true },
            { name: '15', isDirectory: () => true }
          ] as any;
        }
        if (dir.includes('14')) {
          return [{ name: '301', isDirectory: () => true }] as any;
        }
        if (dir.includes('15')) {
          return [{ name: '301', isDirectory: () => true }] as any;
        }
        if (dir.includes('14/301')) {
          return [{ name: '1-task.json', isDirectory: () => false }] as any;
        }
        if (dir.includes('15/301')) {
          return [{ name: '1-task-updated.json', isDirectory: () => false }] as any;
        }
        return [];
      });

      // Mock task file contents - same ID, different content
      mockReadJson.mockImplementation(async (filePath: string) => {
        if (filePath.includes('14/301/1-task.json')) {
          return {
            id: 1,
            projectId: 301,
            title: 'Old title',
            status: 'Ongoing',
            completed: false
          };
        }
        if (filePath.includes('15/301/1-task-updated.json')) {
          return {
            id: 1,
            projectId: 301,
            title: 'Updated title',
            status: 'Approved',
            completed: true
          };
        }
        return null;
      });

      // Mock file stats - newer file has later mtime
      mockStat.mockImplementation(async (filePath: string) => {
        if (filePath.includes('14/301/1-task.json')) {
          return { mtime: new Date('2025-08-11T09:00:00.000Z') } as any;
        }
        if (filePath.includes('15/301/1-task-updated.json')) {
          return { mtime: new Date('2025-08-11T10:00:00.000Z') } as any;
        }
        return { mtime: new Date() } as any;
      });

      mockWriteJsonAtomic.mockResolvedValue(undefined);
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await getTasks(301);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Updated title'); // Should use the newer version
      expect(result[0].status).toBe('done'); // Mapped from 'Approved'
    });

    it('should create archive when consolidating', async () => {
      mockFileExists.mockResolvedValue(false);
      
      mockReaddir.mockImplementation(async (dir: any) => {
        if (dir.includes('project-tasks')) {
          return [{ name: '2025', isDirectory: () => true }] as any;
        }
        if (dir.includes('2025')) {
          return [{ name: '07', isDirectory: () => true }] as any;
        }
        if (dir.includes('07')) {
          return [{ name: '14', isDirectory: () => true }] as any;
        }
        if (dir.includes('14')) {
          return [{ name: '301', isDirectory: () => true }] as any;
        }
        if (dir.includes('301')) {
          return [{ name: '1-task.json', isDirectory: () => false }] as any;
        }
        return [];
      });

      mockReadJson.mockResolvedValue({
        id: 1,
        projectId: 301,
        title: 'Test task',
        status: 'Ongoing',
        completed: false
      });

      mockStat.mockResolvedValue({
        mtime: new Date('2025-08-11T10:00:00.000Z')
      } as any);

      mockWriteJsonAtomic.mockResolvedValue(undefined);
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue('{"id":1,"projectId":301}');

      await getTasks(301);

      // Should create archive directory
      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringContaining('data/projects/301/tasks/_archive')
      );

      // Should create archive manifest
      expect(mockWriteJsonAtomic).toHaveBeenCalledWith(
        expect.stringContaining('manifest.json'),
        expect.objectContaining({
          projectId: 301,
          taskCount: 1,
          reason: 'Consolidated into canonical tasks.json'
        })
      );

      // Should copy original files to archive
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('_archive'),
        expect.any(String)
      );
    });

    it('should throw TaskStoreError on consolidation failure', async () => {
      mockFileExists.mockResolvedValue(false);
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      await expect(getTasks(301)).rejects.toThrow(TaskStoreError);
      await expect(getTasks(301)).rejects.toThrow('Failed to consolidate task files');
    });
  });

  describe('saveTasks', () => {
    
    it('should save tasks in sorted order', async () => {
      const unsortedTasks = [mockTasks[1], mockTasks[0]]; // ID 2, then ID 1
      
      mockWriteJsonAtomic.mockResolvedValue(undefined);

      await saveTasks(301, unsortedTasks);

      expect(mockWriteJsonAtomic).toHaveBeenCalledWith(
        expect.stringContaining('data/projects/301/tasks/tasks.json'),
        expect.objectContaining({
          tasks: [
            expect.objectContaining({ id: 1 }), // Should be first
            expect.objectContaining({ id: 2 })  // Should be second
          ],
          version: 1
        })
      );
    });

    it('should throw TaskStoreError on save failure', async () => {
      mockWriteJsonAtomic.mockRejectedValue(new Error('Write failed'));

      await expect(saveTasks(301, mockTasks)).rejects.toThrow(TaskStoreError);
      await expect(saveTasks(301, mockTasks)).rejects.toThrow('Failed to save tasks for project 301');
    });
  });

  describe('getTask', () => {
    
    it('should return specific task by ID', async () => {
      const mockContainer: TasksContainer = {
        tasks: mockTasks,
        updatedAt: '2025-08-11T10:00:00.000Z',
        version: 1
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(mockContainer);

      const result = await getTask(301, 1);

      expect(result).toEqual(mockTasks[0]);
    });

    it('should return null for non-existent task', async () => {
      const mockContainer: TasksContainer = {
        tasks: mockTasks,
        updatedAt: '2025-08-11T10:00:00.000Z',
        version: 1
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(mockContainer);

      const result = await getTask(301, 999);

      expect(result).toBeNull();
    });
  });

  describe('updateTask', () => {
    
    it('should update specific task and save', async () => {
      const mockContainer: TasksContainer = {
        tasks: [...mockTasks],
        updatedAt: '2025-08-11T10:00:00.000Z',
        version: 1
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(mockContainer);
      mockWriteJsonAtomic.mockResolvedValue(undefined);

      const updates = { status: 'done' as const, completedAt: '2025-08-11T11:00:00.000Z' };
      const result = await updateTask(301, 2, updates);

      expect(result.id).toBe(2);
      expect(result.status).toBe('done');
      expect(result.completedAt).toBe('2025-08-11T11:00:00.000Z');

      expect(mockWriteJsonAtomic).toHaveBeenCalledWith(
        expect.stringContaining('data/projects/301/tasks/tasks.json'),
        expect.objectContaining({
          tasks: expect.arrayContaining([
            expect.objectContaining({ id: 2, status: 'done' })
          ])
        })
      );
    });

    it('should throw TaskStoreError for non-existent task', async () => {
      const mockContainer: TasksContainer = {
        tasks: mockTasks,
        updatedAt: '2025-08-11T10:00:00.000Z',
        version: 1
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(mockContainer);

      await expect(updateTask(301, 999, { status: 'done' })).rejects.toThrow(TaskStoreError);
      await expect(updateTask(301, 999, { status: 'done' })).rejects.toThrow('Task 999 not found in project 301');
    });
  });

  describe('Status Mapping', () => {
    
    it('should map various status formats correctly', async () => {
      mockFileExists.mockResolvedValue(false);
      
      mockReaddir.mockImplementation(async (dir: any) => {
        if (dir.includes('project-tasks')) {
          return [{ name: '2025', isDirectory: () => true }] as any;
        }
        if (dir.includes('2025')) {
          return [{ name: '07', isDirectory: () => true }] as any;
        }
        if (dir.includes('07')) {
          return [{ name: '14', isDirectory: () => true }] as any;
        }
        if (dir.includes('14')) {
          return [{ name: '301', isDirectory: () => true }] as any;
        }
        if (dir.includes('301')) {
          return [
            { name: '1-task.json', isDirectory: () => false },
            { name: '2-task.json', isDirectory: () => false },
            { name: '3-task.json', isDirectory: () => false },
            { name: '4-task.json', isDirectory: () => false }
          ] as any;
        }
        return [];
      });

      mockReadJson.mockImplementation(async (filePath: string) => {
        if (filePath.includes('1-task.json')) {
          return { id: 1, projectId: 301, status: 'Ongoing' };
        }
        if (filePath.includes('2-task.json')) {
          return { id: 2, projectId: 301, status: 'In review' };
        }
        if (filePath.includes('3-task.json')) {
          return { id: 3, projectId: 301, status: 'Approved' };
        }
        if (filePath.includes('4-task.json')) {
          return { id: 4, projectId: 301, status: 'Unknown Status' };
        }
        return null;
      });

      mockStat.mockResolvedValue({ mtime: new Date() } as any);
      mockWriteJsonAtomic.mockResolvedValue(undefined);
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await getTasks(301);

      expect(result[0].status).toBe('in_progress'); // Ongoing -> in_progress
      expect(result[1].status).toBe('review');      // In review -> review
      expect(result[2].status).toBe('done');        // Approved -> done
      expect(result[3].status).toBe('todo');        // Unknown -> todo (default)
    });
  });
});

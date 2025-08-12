/**
 * Wallet Store Test Suite
 * 
 * Tests the wallet store functionality including:
 * - getOrCreateWallet creates when missing; no duplicate files on repeat
 * - Credit/debit operations
 * - Error handling for invalid operations
 * - Atomic operations and concurrency safety
 */

import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  getWallet,
  getOrCreateWallet,
  saveWallet,
  updateWallet,
  creditWallet,
  debitWallet,
  confirmPendingPayment,
  addPendingPayment,
  getAllWallets,
  WalletStoreError
} from '@/lib/wallets/wallet-store';

// Mock fs-json module
jest.mock('@/lib/fs-json', () => ({
  writeJsonAtomic: jest.fn(),
  readJson: jest.fn(),
  fileExists: jest.fn(),
  ensureDir: jest.fn()
}));

import { writeJsonAtomic, readJson, fileExists, ensureDir } from '@/lib/fs-json';

const mockWriteJsonAtomic = writeJsonAtomic as jest.MockedFunction<typeof writeJsonAtomic>;
const mockReadJson = readJson as jest.MockedFunction<typeof readJson>;
const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;
const mockEnsureDir = ensureDir as jest.MockedFunction<typeof ensureDir>;

describe('Wallet Store', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    
    it('should return wallet when file exists', async () => {
      const mockWallet = {
        userId: 31,
        available: 1000,
        pending: 0,
        currency: 'USD',
        updatedAt: '2025-08-11T10:00:00.000Z'
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(mockWallet);

      const result = await getWallet(31);

      expect(result).toEqual(mockWallet);
      expect(mockFileExists).toHaveBeenCalledWith(
        expect.stringContaining('data/wallets/31.json')
      );
      expect(mockReadJson).toHaveBeenCalledWith(
        expect.stringContaining('data/wallets/31.json'),
        null
      );
    });

    it('should return null when file does not exist', async () => {
      mockFileExists.mockResolvedValue(false);

      const result = await getWallet(31);

      expect(result).toBeNull();
      expect(mockFileExists).toHaveBeenCalledWith(
        expect.stringContaining('data/wallets/31.json')
      );
      expect(mockReadJson).not.toHaveBeenCalled();
    });

    it('should throw WalletStoreError on IO error', async () => {
      mockFileExists.mockRejectedValue(new Error('IO Error'));

      await expect(getWallet(31)).rejects.toThrow(WalletStoreError);
      await expect(getWallet(31)).rejects.toThrow('Failed to read wallet for user 31');
    });
  });

  describe('getOrCreateWallet', () => {
    
    it('should return existing wallet if found', async () => {
      const existingWallet = {
        userId: 31,
        available: 1000,
        pending: 0,
        currency: 'USD',
        updatedAt: '2025-08-11T10:00:00.000Z'
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(existingWallet);

      const result = await getOrCreateWallet(31);

      expect(result).toEqual(existingWallet);
      expect(mockWriteJsonAtomic).not.toHaveBeenCalled();
    });

    it('should create new wallet when not found', async () => {
      mockFileExists.mockResolvedValue(false);
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteJsonAtomic.mockResolvedValue(undefined);

      const result = await getOrCreateWallet(31, 'USD');

      expect(result.userId).toBe(31);
      expect(result.available).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.currency).toBe('USD');
      expect(result.totalWithdrawn).toBe(0);
      expect(result.lifetimeEarnings).toBe(0);
      expect(result.holds).toBe(0);
      expect(result.version).toBe(1);
      expect(result.updatedAt).toBeDefined();

      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringContaining('data/wallets')
      );
      expect(mockWriteJsonAtomic).toHaveBeenCalledWith(
        expect.stringContaining('data/wallets/31.json'),
        expect.objectContaining({
          userId: 31,
          available: 0,
          pending: 0,
          currency: 'USD'
        })
      );
    });

    it('should not create duplicate files on repeat calls', async () => {
      // First call - wallet doesn't exist
      mockFileExists.mockResolvedValueOnce(false);
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteJsonAtomic.mockResolvedValue(undefined);

      const firstResult = await getOrCreateWallet(31);

      // Second call - wallet now exists
      mockFileExists.mockResolvedValueOnce(true);
      mockReadJson.mockResolvedValue(firstResult);

      const secondResult = await getOrCreateWallet(31);

      expect(firstResult.userId).toBe(31);
      expect(secondResult.userId).toBe(31);
      expect(mockWriteJsonAtomic).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should throw WalletStoreError on creation failure', async () => {
      mockFileExists.mockResolvedValue(false);
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteJsonAtomic.mockRejectedValue(new Error('Write failed'));

      await expect(getOrCreateWallet(31)).rejects.toThrow(WalletStoreError);
      await expect(getOrCreateWallet(31)).rejects.toThrow('Failed to create wallet for user 31');
    });
  });

  describe('creditWallet', () => {
    
    it('should credit amount to wallet', async () => {
      const existingWallet = {
        userId: 31,
        available: 1000,
        pending: 0,
        currency: 'USD',
        lifetimeEarnings: 5000,
        updatedAt: '2025-08-11T10:00:00.000Z'
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(existingWallet);
      mockWriteJsonAtomic.mockResolvedValue(undefined);

      const result = await creditWallet(31, 500);

      expect(result.available).toBe(1500);
      expect(result.lifetimeEarnings).toBe(5500);
      expect(mockWriteJsonAtomic).toHaveBeenCalledWith(
        expect.stringContaining('data/wallets/31.json'),
        expect.objectContaining({
          userId: 31,
          available: 1500,
          lifetimeEarnings: 5500
        })
      );
    });

    it('should reject negative credit amounts', async () => {
      await expect(creditWallet(31, -100)).rejects.toThrow(WalletStoreError);
      await expect(creditWallet(31, -100)).rejects.toThrow('Credit amount must be positive');
    });

    it('should reject zero credit amounts', async () => {
      await expect(creditWallet(31, 0)).rejects.toThrow(WalletStoreError);
      await expect(creditWallet(31, 0)).rejects.toThrow('Credit amount must be positive');
    });
  });

  describe('debitWallet', () => {
    
    it('should debit amount from wallet', async () => {
      const existingWallet = {
        userId: 31,
        available: 1000,
        pending: 0,
        currency: 'USD',
        totalWithdrawn: 2000,
        updatedAt: '2025-08-11T10:00:00.000Z'
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(existingWallet);
      mockWriteJsonAtomic.mockResolvedValue(undefined);

      const result = await debitWallet(31, 300);

      expect(result.available).toBe(700);
      expect(result.totalWithdrawn).toBe(2300);
      expect(mockWriteJsonAtomic).toHaveBeenCalledWith(
        expect.stringContaining('data/wallets/31.json'),
        expect.objectContaining({
          userId: 31,
          available: 700,
          totalWithdrawn: 2300
        })
      );
    });

    it('should reject debit when insufficient funds', async () => {
      const existingWallet = {
        userId: 31,
        available: 100,
        pending: 0,
        currency: 'USD',
        updatedAt: '2025-08-11T10:00:00.000Z'
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(existingWallet);

      await expect(debitWallet(31, 200)).rejects.toThrow(WalletStoreError);
      await expect(debitWallet(31, 200)).rejects.toThrow('Insufficient funds');
    });

    it('should reject negative debit amounts', async () => {
      await expect(debitWallet(31, -100)).rejects.toThrow(WalletStoreError);
      await expect(debitWallet(31, -100)).rejects.toThrow('Debit amount must be positive');
    });
  });

  describe('confirmPendingPayment', () => {
    
    it('should move amount from pending to available', async () => {
      const existingWallet = {
        userId: 31,
        available: 1000,
        pending: 500,
        currency: 'USD',
        updatedAt: '2025-08-11T10:00:00.000Z'
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(existingWallet);
      mockWriteJsonAtomic.mockResolvedValue(undefined);

      const result = await confirmPendingPayment(31, 300);

      expect(result.available).toBe(1300);
      expect(result.pending).toBe(200);
      expect(mockWriteJsonAtomic).toHaveBeenCalledWith(
        expect.stringContaining('data/wallets/31.json'),
        expect.objectContaining({
          userId: 31,
          available: 1300,
          pending: 200
        })
      );
    });

    it('should reject confirmation when insufficient pending funds', async () => {
      const existingWallet = {
        userId: 31,
        available: 1000,
        pending: 100,
        currency: 'USD',
        updatedAt: '2025-08-11T10:00:00.000Z'
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(existingWallet);

      await expect(confirmPendingPayment(31, 200)).rejects.toThrow(WalletStoreError);
      await expect(confirmPendingPayment(31, 200)).rejects.toThrow('Insufficient pending funds');
    });
  });

  describe('addPendingPayment', () => {
    
    it('should add amount to pending', async () => {
      const existingWallet = {
        userId: 31,
        available: 1000,
        pending: 200,
        currency: 'USD',
        updatedAt: '2025-08-11T10:00:00.000Z'
      };

      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue(existingWallet);
      mockWriteJsonAtomic.mockResolvedValue(undefined);

      const result = await addPendingPayment(31, 300);

      expect(result.available).toBe(1000);
      expect(result.pending).toBe(500);
      expect(mockWriteJsonAtomic).toHaveBeenCalledWith(
        expect.stringContaining('data/wallets/31.json'),
        expect.objectContaining({
          userId: 31,
          available: 1000,
          pending: 500
        })
      );
    });

    it('should create wallet if it does not exist', async () => {
      mockFileExists.mockResolvedValue(false);
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteJsonAtomic.mockResolvedValue(undefined);

      const result = await addPendingPayment(31, 300, 'USD');

      expect(result.userId).toBe(31);
      expect(result.available).toBe(0);
      expect(result.pending).toBe(300);
      expect(result.currency).toBe('USD');
    });
  });

  describe('Error Handling', () => {
    
    it('should handle wallet file corruption gracefully', async () => {
      mockFileExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue({ invalid: 'data' }); // Missing userId

      const result = await getWallet(31);
      expect(result).toBeNull();
    });

    it('should provide structured error codes', async () => {
      mockFileExists.mockRejectedValue(new Error('Permission denied'));

      try {
        await getWallet(31);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(WalletStoreError);
        expect((error as WalletStoreError).code).toBe('IO_ERROR');
        expect((error as WalletStoreError).userId).toBe(31);
      }
    });
  });
});

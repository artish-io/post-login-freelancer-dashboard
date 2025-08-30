/**
 * Unit tests for Organization Placeholder Generator
 */

import { 
  createPlaceholderOrganization, 
  getOrCreatePlaceholderOrg,
  cleanupPlaceholderOrganizations 
} from '../lib/organizations/placeholder-generator';
import { UnifiedStorageService } from '../lib/storage/unified-storage-service';

// Mock UnifiedStorageService
jest.mock('../lib/storage/unified-storage-service', () => ({
  UnifiedStorageService: {
    getAllOrganizations: jest.fn(),
    writeOrganization: jest.fn(),
    deleteOrganization: jest.fn()
  }
}));

const mockGetAllOrganizations = UnifiedStorageService.getAllOrganizations as jest.MockedFunction<typeof UnifiedStorageService.getAllOrganizations>;
const mockWriteOrganization = UnifiedStorageService.writeOrganization as jest.MockedFunction<typeof UnifiedStorageService.writeOrganization>;
const mockDeleteOrganization = UnifiedStorageService.deleteOrganization as jest.MockedFunction<typeof UnifiedStorageService.deleteOrganization>;

describe('Organization Placeholder Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Enable feature flag for tests
    process.env.ENABLE_PROPOSAL_ORG_PLACEHOLDERS = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_PROPOSAL_ORG_PLACEHOLDERS;
  });

  describe('createPlaceholderOrganization', () => {
    test('should create placeholder organization with valid email', async () => {
      mockGetAllOrganizations.mockResolvedValue([]);
      mockWriteOrganization.mockResolvedValue(undefined);

      const result = await createPlaceholderOrganization({
        commissionerId: 123,
        sourceEmail: 'john.doe@example.com',
        commissionerName: 'John Doe'
      });

      expect(result.success).toBe(true);
      expect(result.organization).toBeDefined();
      expect(result.organization?.name).toBe("John Doe's Organization");
      expect(result.organization?.email).toBe('john.doe@example.com');
      expect(result.organization?.isPlaceholder).toBe(true);
      expect(result.organization?.createdBy).toBe(123);
      expect(result.organization?.firstCommissionerId).toBe(123);
      expect(mockWriteOrganization).toHaveBeenCalledTimes(1);
    });

    test('should generate deterministic org ID from email', async () => {
      mockGetAllOrganizations.mockResolvedValue([]);
      mockWriteOrganization.mockResolvedValue(undefined);

      const email = 'test@example.com';
      
      const result1 = await createPlaceholderOrganization({
        commissionerId: 123,
        sourceEmail: email
      });

      const result2 = await createPlaceholderOrganization({
        commissionerId: 456,
        sourceEmail: email
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.organization?.id).toBe(result2.organization?.id);
    });

    test('should reject invalid email', async () => {
      const result = await createPlaceholderOrganization({
        commissionerId: 123,
        sourceEmail: 'invalid-email'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_email');
      expect(mockWriteOrganization).not.toHaveBeenCalled();
    });

    test('should reject empty email', async () => {
      const result = await createPlaceholderOrganization({
        commissionerId: 123,
        sourceEmail: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_email');
      expect(mockWriteOrganization).not.toHaveBeenCalled();
    });

    test('should fail when feature flag is disabled', async () => {
      process.env.ENABLE_PROPOSAL_ORG_PLACEHOLDERS = 'false';

      const result = await createPlaceholderOrganization({
        commissionerId: 123,
        sourceEmail: 'test@example.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('feature_disabled');
      expect(mockWriteOrganization).not.toHaveBeenCalled();
    });

    test('should return existing organization if already exists', async () => {
      const existingOrg = {
        id: 12345,
        name: 'Existing Org',
        email: 'test@example.com',
        isPlaceholder: true
      };

      mockGetAllOrganizations.mockResolvedValue([existingOrg]);

      const result = await createPlaceholderOrganization({
        commissionerId: 123,
        sourceEmail: 'test@example.com'
      });

      expect(result.success).toBe(true);
      expect(result.organization).toEqual(existingOrg);
      expect(mockWriteOrganization).not.toHaveBeenCalled();
    });

    test('should generate fallback name from email when no commissioner name', async () => {
      mockGetAllOrganizations.mockResolvedValue([]);
      mockWriteOrganization.mockResolvedValue(undefined);

      const result = await createPlaceholderOrganization({
        commissionerId: 123,
        sourceEmail: 'john.doe@company.com'
      });

      expect(result.success).toBe(true);
      expect(result.organization?.name).toBe('John (company)');
    });
  });

  describe('getOrCreatePlaceholderOrg', () => {
    test('should return existing organization if found', async () => {
      const existingOrg = {
        id: 12345,
        name: 'Existing Org',
        email: 'test@example.com',
        isPlaceholder: true
      };

      mockGetAllOrganizations.mockResolvedValue([existingOrg]);

      const result = await getOrCreatePlaceholderOrg({
        commissionerId: 123,
        sourceEmail: 'test@example.com'
      });

      expect(result.success).toBe(true);
      expect(result.organization).toEqual(existingOrg);
      expect(mockWriteOrganization).not.toHaveBeenCalled();
    });

    test('should create new organization if not found', async () => {
      mockGetAllOrganizations.mockResolvedValue([]);
      mockWriteOrganization.mockResolvedValue(undefined);

      const result = await getOrCreatePlaceholderOrg({
        commissionerId: 123,
        sourceEmail: 'new@example.com',
        commissionerName: 'New User'
      });

      expect(result.success).toBe(true);
      expect(result.organization?.name).toBe("New User's Organization");
      expect(mockWriteOrganization).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupPlaceholderOrganizations', () => {
    test('should delete all placeholder organizations', async () => {
      const orgs = [
        { id: 1, name: 'Real Org', isPlaceholder: false },
        { id: 2, name: 'Placeholder 1', isPlaceholder: true },
        { id: 3, name: 'Placeholder 2', isPlaceholder: true },
        { id: 4, name: 'Another Real Org', isPlaceholder: false }
      ];

      mockGetAllOrganizations.mockResolvedValue(orgs);
      mockDeleteOrganization.mockResolvedValue(undefined);

      const result = await cleanupPlaceholderOrganizations();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockDeleteOrganization).toHaveBeenCalledTimes(2);
      expect(mockDeleteOrganization).toHaveBeenCalledWith(2);
      expect(mockDeleteOrganization).toHaveBeenCalledWith(3);
    });

    test('should handle deletion errors gracefully', async () => {
      const orgs = [
        { id: 1, name: 'Placeholder 1', isPlaceholder: true },
        { id: 2, name: 'Placeholder 2', isPlaceholder: true }
      ];

      mockGetAllOrganizations.mockResolvedValue(orgs);
      mockDeleteOrganization
        .mockResolvedValueOnce(undefined) // First deletion succeeds
        .mockRejectedValueOnce(new Error('Deletion failed')); // Second deletion fails

      const result = await cleanupPlaceholderOrganizations();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to delete org 2');
    });
  });

  describe('Email validation', () => {
    test.each([
      ['valid@example.com', true],
      ['user.name@domain.co.uk', true],
      ['test+tag@example.org', true],
      ['invalid-email', false],
      ['@example.com', false],
      ['user@', false],
      ['', false],
      ['user space@example.com', false]
    ])('should validate email %s as %s', async (email, shouldBeValid) => {
      mockGetAllOrganizations.mockResolvedValue([]);
      mockWriteOrganization.mockResolvedValue(undefined);

      const result = await createPlaceholderOrganization({
        commissionerId: 123,
        sourceEmail: email
      });

      if (shouldBeValid) {
        expect(result.success).toBe(true);
      } else {
        expect(result.success).toBe(false);
        expect(result.error).toBe('invalid_email');
      }
    });
  });
});

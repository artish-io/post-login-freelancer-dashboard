/**
 * Integration test for proposal acceptance without organization
 * Verifies placeholder organization creation and project proceeds
 */

import { NextRequest } from 'next/server';
import { POST } from '../app/api/proposals/[proposalId]/accept/route';
import { UnifiedStorageService } from '../lib/storage/unified-storage-service';
import { readProposal, updateProposal } from '../lib/proposals/proposal-storage';

// Mock dependencies
jest.mock('../lib/auth/session-guard');
jest.mock('../lib/storage/unified-storage-service');
jest.mock('../lib/proposals/proposal-storage');
jest.mock('../lib/projects/gig-request-project-id-generator');
jest.mock('../lib/events/event-logger');

const mockRequireSession = require('../lib/auth/session-guard').requireSession as jest.MockedFunction<any>;
const mockGetAllOrganizations = UnifiedStorageService.getAllOrganizations as jest.MockedFunction<typeof UnifiedStorageService.getAllOrganizations>;
const mockGetAllUsers = UnifiedStorageService.getAllUsers as jest.MockedFunction<typeof UnifiedStorageService.getAllUsers>;
const mockListProjects = UnifiedStorageService.listProjects as jest.MockedFunction<typeof UnifiedStorageService.listProjects>;
const mockWriteOrganization = UnifiedStorageService.writeOrganization as jest.MockedFunction<typeof UnifiedStorageService.writeOrganization>;
const mockReadProposal = readProposal as jest.MockedFunction<typeof readProposal>;
const mockUpdateProposal = updateProposal as jest.MockedFunction<typeof updateProposal>;

describe('Proposal Acceptance Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Enable feature flags
    process.env.ENABLE_PROPOSAL_ORG_PLACEHOLDERS = 'true';
    process.env.ENABLE_PROPOSAL_PROJECT_IDS = 'true';
    
    // Mock session
    mockRequireSession.mockResolvedValue({ userId: 34 });
    
    // Mock project ID generation
    const mockGenerateProjectId = require('../lib/projects/gig-request-project-id-generator').generateProjectId;
    mockGenerateProjectId.mockResolvedValue({
      success: true,
      projectId: 'C-P001'
    });
  });

  afterEach(() => {
    delete process.env.ENABLE_PROPOSAL_ORG_PLACEHOLDERS;
    delete process.env.ENABLE_PROPOSAL_PROJECT_IDS;
  });

  test('should create placeholder organization and proceed with project creation', async () => {
    // Mock proposal without organization ID
    const mockProposal = {
      id: 'PROP-TEST123',
      title: 'Test Proposal',
      status: 'sent',
      commissionerId: 34,
      commissionerEmail: 'test@example.com',
      freelancerId: 12,
      upperBudget: 5000,
      invoicingMethod: 'completion',
      milestones: [
        { title: 'Milestone 1', description: 'Test milestone', amount: 5000 }
      ]
      // Note: organizationId is undefined/missing
    };

    // Mock users data
    const mockUsers = [
      {
        id: 34,
        name: 'Test Commissioner',
        email: 'test@example.com'
      },
      {
        id: 12,
        name: 'Test Freelancer',
        email: 'freelancer@example.com'
      }
    ];

    // Mock organizations data (empty - no existing organization)
    const mockOrganizations: any[] = [];

    // Mock projects data
    const mockProjects: any[] = [];

    // Setup mocks
    mockReadProposal.mockResolvedValue(mockProposal);
    mockGetAllOrganizations.mockResolvedValue(mockOrganizations);
    mockGetAllUsers.mockResolvedValue(mockUsers);
    mockListProjects.mockResolvedValue(mockProjects);
    mockWriteOrganization.mockResolvedValue(undefined);
    mockUpdateProposal.mockResolvedValue(undefined);

    // Mock ProjectService.acceptGig
    const mockProjectService = {
      acceptGig: jest.fn().mockReturnValue({
        project: {
          projectId: 'C-P001',
          title: 'Test Proposal',
          status: 'ongoing',
          invoicingMethod: 'completion'
        }
      })
    };
    jest.doMock('../lib/projects/project-service', () => ({
      ProjectService: mockProjectService
    }));

    // Create request
    const request = new NextRequest('http://localhost:3000/api/proposals/PROP-TEST123/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const params = Promise.resolve({ proposalId: 'PROP-TEST123' });

    // Execute request
    const response = await POST(request, { params });
    const result = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);

    // Verify placeholder organization was created
    expect(mockWriteOrganization).toHaveBeenCalledTimes(1);
    const createdOrg = mockWriteOrganization.mock.calls[0][0];
    expect(createdOrg.name).toBe("Test Commissioner's Organization");
    expect(createdOrg.email).toBe('test@example.com');
    expect(createdOrg.isPlaceholder).toBe(true);
    expect(createdOrg.createdBy).toBe(34);

    // Verify proposal was updated with organization ID
    expect(mockUpdateProposal).toHaveBeenCalledWith('PROP-TEST123', 
      expect.objectContaining({
        organizationId: expect.any(Number),
        status: 'accepted'
      })
    );

    // Verify project creation was called
    expect(mockProjectService.acceptGig).toHaveBeenCalledTimes(1);
  });

  test('should rollback proposal status on project creation failure', async () => {
    // Mock proposal
    const mockProposal = {
      id: 'PROP-TEST123',
      title: 'Test Proposal',
      status: 'sent',
      commissionerId: 34,
      commissionerEmail: 'test@example.com',
      freelancerId: 12,
      upperBudget: 5000,
      invoicingMethod: 'completion',
      milestones: []
    };

    // Mock users data
    const mockUsers = [
      { id: 34, name: 'Test Commissioner', email: 'test@example.com' },
      { id: 12, name: 'Test Freelancer', email: 'freelancer@example.com' }
    ];

    // Setup mocks
    mockReadProposal.mockResolvedValue(mockProposal);
    mockGetAllOrganizations.mockResolvedValue([]);
    mockGetAllUsers.mockResolvedValue(mockUsers);
    mockListProjects.mockResolvedValue([]);
    mockWriteOrganization.mockResolvedValue(undefined);
    mockUpdateProposal.mockResolvedValue(undefined);

    // Mock ProjectService.acceptGig to fail
    const mockProjectService = {
      acceptGig: jest.fn().mockImplementation(() => {
        throw new Error('Project creation failed');
      })
    };
    jest.doMock('../lib/projects/project-service', () => ({
      ProjectService: mockProjectService
    }));

    // Create request
    const request = new NextRequest('http://localhost:3000/api/proposals/PROP-TEST123/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const params = Promise.resolve({ proposalId: 'PROP-TEST123' });

    // Execute request
    const response = await POST(request, { params });

    // Verify response is error
    expect(response.status).toBe(400);

    // Verify proposal status was rolled back to 'sent'
    expect(mockUpdateProposal).toHaveBeenCalledWith('PROP-TEST123', 
      expect.objectContaining({
        status: 'sent'
      })
    );
  });

  test('should fail gracefully when email is invalid', async () => {
    // Mock proposal with invalid email
    const mockProposal = {
      id: 'PROP-TEST123',
      title: 'Test Proposal',
      status: 'sent',
      commissionerId: 34,
      commissionerEmail: 'invalid-email', // Invalid email
      freelancerId: 12,
      upperBudget: 5000,
      invoicingMethod: 'completion',
      milestones: []
    };

    // Mock users data
    const mockUsers = [
      { id: 34, name: 'Test Commissioner', email: 'invalid-email' },
      { id: 12, name: 'Test Freelancer', email: 'freelancer@example.com' }
    ];

    // Setup mocks
    mockReadProposal.mockResolvedValue(mockProposal);
    mockGetAllOrganizations.mockResolvedValue([]);
    mockGetAllUsers.mockResolvedValue(mockUsers);
    mockListProjects.mockResolvedValue([]);
    mockUpdateProposal.mockResolvedValue(undefined);

    // Create request
    const request = new NextRequest('http://localhost:3000/api/proposals/PROP-TEST123/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const params = Promise.resolve({ proposalId: 'PROP-TEST123' });

    // Execute request
    const response = await POST(request, { params });

    // Verify response is error
    expect(response.status).toBe(500);

    // Verify proposal status was rolled back to 'sent'
    expect(mockUpdateProposal).toHaveBeenCalledWith('PROP-TEST123', 
      expect.objectContaining({
        status: 'sent'
      })
    );

    // Verify no organization was created
    expect(mockWriteOrganization).not.toHaveBeenCalled();
  });

  test('should use existing placeholder organization if found', async () => {
    // Mock proposal
    const mockProposal = {
      id: 'PROP-TEST123',
      title: 'Test Proposal',
      status: 'sent',
      commissionerId: 34,
      commissionerEmail: 'test@example.com',
      freelancerId: 12,
      upperBudget: 5000,
      invoicingMethod: 'completion',
      milestones: []
    };

    // Mock existing placeholder organization
    const existingPlaceholderOrg = {
      id: 12345,
      name: "Test Commissioner's Organization",
      email: 'test@example.com',
      isPlaceholder: true,
      createdBy: 34
    };

    // Mock users data
    const mockUsers = [
      { id: 34, name: 'Test Commissioner', email: 'test@example.com' },
      { id: 12, name: 'Test Freelancer', email: 'freelancer@example.com' }
    ];

    // Setup mocks
    mockReadProposal.mockResolvedValue(mockProposal);
    mockGetAllOrganizations.mockResolvedValue([existingPlaceholderOrg]);
    mockGetAllUsers.mockResolvedValue(mockUsers);
    mockListProjects.mockResolvedValue([]);
    mockUpdateProposal.mockResolvedValue(undefined);

    // Mock ProjectService.acceptGig
    const mockProjectService = {
      acceptGig: jest.fn().mockReturnValue({
        project: {
          projectId: 'C-P001',
          title: 'Test Proposal',
          status: 'ongoing',
          invoicingMethod: 'completion'
        }
      })
    };
    jest.doMock('../lib/projects/project-service', () => ({
      ProjectService: mockProjectService
    }));

    // Create request
    const request = new NextRequest('http://localhost:3000/api/proposals/PROP-TEST123/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const params = Promise.resolve({ proposalId: 'PROP-TEST123' });

    // Execute request
    const response = await POST(request, { params });
    const result = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);

    // Verify no new organization was created (existing one was used)
    expect(mockWriteOrganization).not.toHaveBeenCalled();

    // Verify project creation proceeded
    expect(mockProjectService.acceptGig).toHaveBeenCalledTimes(1);
  });
});

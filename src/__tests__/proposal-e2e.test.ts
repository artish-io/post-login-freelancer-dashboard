/**
 * End-to-end test for proposal submission with email-only contact
 * Verifies complete flow from frontend submission to acceptance
 */

import { NextRequest } from 'next/server';
import { POST as SendProposal } from '../app/api/proposals/send/route';
import { POST as AcceptProposal } from '../app/api/proposals/[proposalId]/accept/route';
import { UnifiedStorageService } from '../lib/storage/unified-storage-service';

// Mock dependencies
jest.mock('../lib/auth/session-guard');
jest.mock('../lib/storage/unified-storage-service');
jest.mock('../lib/proposals/proposal-storage');
jest.mock('../lib/projects/gig-request-project-id-generator');

const mockRequireSession = require('../lib/auth/session-guard').requireSession as jest.MockedFunction<any>;
const mockGetAllOrganizations = UnifiedStorageService.getAllOrganizations as jest.MockedFunction<typeof UnifiedStorageService.getAllOrganizations>;
const mockGetAllUsers = UnifiedStorageService.getAllUsers as jest.MockedFunction<typeof UnifiedStorageService.getAllUsers>;
const mockListProjects = UnifiedStorageService.listProjects as jest.MockedFunction<typeof UnifiedStorageService.listProjects>;
const mockWriteOrganization = UnifiedStorageService.writeOrganization as jest.MockedFunction<typeof UnifiedStorageService.writeOrganization>;

describe('Proposal E2E Test: Email-Only Contact Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Enable feature flags
    process.env.ENABLE_PROPOSAL_ORG_PLACEHOLDERS = 'true';
    process.env.ENABLE_PROPOSAL_PROJECT_IDS = 'true';
    
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

  test('complete flow: send proposal with email-only contact → accept proposal → create project', async () => {
    // Step 1: Mock freelancer sending proposal with email-only contact
    mockRequireSession.mockResolvedValue({ userId: 12 }); // Freelancer ID

    // Mock storage for proposal sending
    mockGetAllOrganizations.mockResolvedValue([]);
    mockListProjects.mockResolvedValue([]);
    
    // Mock proposal storage functions
    const mockReadAllProposals = require('../lib/proposals/proposal-storage').readAllProposals;
    const mockWriteProposal = require('../lib/proposals/proposal-storage').writeProposal;
    const mockReadProposal = require('../lib/proposals/proposal-storage').readProposal;
    const mockUpdateProposal = require('../lib/proposals/proposal-storage').updateProposal;
    
    mockReadAllProposals.mockResolvedValue([]);
    mockWriteProposal.mockResolvedValue(undefined);
    mockReadProposal.mockResolvedValue(null);
    mockUpdateProposal.mockResolvedValue(undefined);

    // Create proposal submission request (email-only contact)
    const proposalData = {
      title: 'E2E Test Proposal',
      summary: 'Test proposal for end-to-end testing',
      contact: {
        email: 'commissioner@testcompany.com' // Email-only contact
      },
      typeTags: ['web-development'],
      milestones: [
        {
          title: 'Design Phase',
          description: 'Create mockups and designs',
          amount: 2500,
          dueDate: '2024-02-15'
        },
        {
          title: 'Development Phase', 
          description: 'Build the application',
          amount: 2500,
          dueDate: '2024-03-15'
        }
      ],
      totalBid: 5000,
      executionMethod: 'completion',
      startType: 'immediate'
    };

    const sendRequest = new NextRequest('http://localhost:3000/api/proposals/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proposalData)
    });

    // Execute proposal send
    const sendResponse = await SendProposal(sendRequest);
    const sendResult = await sendResponse.json();

    // Verify proposal was sent successfully
    expect(sendResponse.status).toBe(200);
    expect(sendResult.success).toBe(true);
    expect(mockWriteProposal).toHaveBeenCalledTimes(1);

    // Extract the created proposal
    const createdProposal = mockWriteProposal.mock.calls[0][0];
    expect(createdProposal.commissionerEmail).toBe('commissioner@testcompany.com');
    expect(createdProposal.organizationId).toBeUndefined(); // No organization initially

    // Step 2: Mock commissioner accepting the proposal
    mockRequireSession.mockResolvedValue({ userId: 34 }); // Commissioner ID

    // Mock the proposal read for acceptance
    const proposalForAcceptance = {
      ...createdProposal,
      id: 'PROP-E2E-TEST',
      commissionerId: 34,
      status: 'sent'
    };
    mockReadProposal.mockResolvedValue(proposalForAcceptance);

    // Mock users data for acceptance
    const mockUsers = [
      {
        id: 34,
        name: 'Test Commissioner',
        email: 'commissioner@testcompany.com'
      },
      {
        id: 12,
        name: 'Test Freelancer',
        email: 'freelancer@example.com'
      }
    ];
    mockGetAllUsers.mockResolvedValue(mockUsers);

    // Mock ProjectService.acceptGig
    const mockProjectService = {
      acceptGig: jest.fn().mockReturnValue({
        project: {
          projectId: 'C-P001',
          title: 'E2E Test Proposal',
          status: 'ongoing',
          invoicingMethod: 'completion',
          freelancerId: 12,
          commissionerId: 34,
          organizationId: expect.any(Number)
        }
      })
    };
    jest.doMock('../lib/projects/project-service', () => ({
      ProjectService: mockProjectService
    }));

    // Create acceptance request
    const acceptRequest = new NextRequest('http://localhost:3000/api/proposals/PROP-E2E-TEST/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const acceptParams = Promise.resolve({ proposalId: 'PROP-E2E-TEST' });

    // Execute proposal acceptance
    const acceptResponse = await AcceptProposal(acceptRequest, { params: acceptParams });
    const acceptResult = await acceptResponse.json();

    // Verify acceptance was successful
    expect(acceptResponse.status).toBe(200);
    expect(acceptResult.success).toBe(true);

    // Verify placeholder organization was created
    expect(mockWriteOrganization).toHaveBeenCalledTimes(1);
    const createdOrg = mockWriteOrganization.mock.calls[0][0];
    expect(createdOrg.name).toBe("Test Commissioner's Organization");
    expect(createdOrg.email).toBe('commissioner@testcompany.com');
    expect(createdOrg.isPlaceholder).toBe(true);
    expect(createdOrg.createdBy).toBe(34);

    // Verify proposal was updated with organization ID
    expect(mockUpdateProposal).toHaveBeenCalledWith('PROP-E2E-TEST', 
      expect.objectContaining({
        organizationId: expect.any(Number),
        status: 'accepted'
      })
    );

    // Verify project was created
    expect(mockProjectService.acceptGig).toHaveBeenCalledTimes(1);
    const projectCreationCall = mockProjectService.acceptGig.mock.calls[0][0];
    expect(projectCreationCall.gig.title).toBe('E2E Test Proposal');
    expect(projectCreationCall.freelancerId).toBe(12);
    expect(projectCreationCall.commissionerId).toBe(34);
    expect(projectCreationCall.organizationName).toBe("Test Commissioner's Organization");
  });

  test('should handle invalid email in proposal submission', async () => {
    mockRequireSession.mockResolvedValue({ userId: 12 });
    mockGetAllOrganizations.mockResolvedValue([]);
    mockListProjects.mockResolvedValue([]);

    const mockReadAllProposals = require('../lib/proposals/proposal-storage').readAllProposals;
    mockReadAllProposals.mockResolvedValue([]);

    // Create proposal with invalid email
    const proposalData = {
      title: 'Invalid Email Test',
      summary: 'Test with invalid email',
      contact: {
        email: 'invalid-email-format' // Invalid email
      },
      typeTags: ['web-development'],
      milestones: [
        { title: 'Test', description: 'Test', amount: 1000, dueDate: '2024-02-15' }
      ],
      totalBid: 1000,
      executionMethod: 'completion',
      startType: 'immediate'
    };

    const sendRequest = new NextRequest('http://localhost:3000/api/proposals/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proposalData)
    });

    // Execute proposal send
    const sendResponse = await SendProposal(sendRequest);

    // Should still succeed at send stage (validation happens at acceptance)
    expect(sendResponse.status).toBe(200);

    // Now test acceptance with invalid email
    mockRequireSession.mockResolvedValue({ userId: 34 });

    const mockReadProposal = require('../lib/proposals/proposal-storage').readProposal;
    const mockUpdateProposal = require('../lib/proposals/proposal-storage').updateProposal;
    
    const proposalWithInvalidEmail = {
      id: 'PROP-INVALID-EMAIL',
      title: 'Invalid Email Test',
      commissionerId: 34,
      commissionerEmail: 'invalid-email-format',
      status: 'sent'
    };
    
    mockReadProposal.mockResolvedValue(proposalWithInvalidEmail);
    mockUpdateProposal.mockResolvedValue(undefined);

    const mockUsers = [
      { id: 34, name: 'Test Commissioner', email: 'invalid-email-format' }
    ];
    mockGetAllUsers.mockResolvedValue(mockUsers);

    const acceptRequest = new NextRequest('http://localhost:3000/api/proposals/PROP-INVALID-EMAIL/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const acceptParams = Promise.resolve({ proposalId: 'PROP-INVALID-EMAIL' });

    // Execute acceptance
    const acceptResponse = await AcceptProposal(acceptRequest, { params: acceptParams });

    // Should fail due to invalid email
    expect(acceptResponse.status).toBe(500);

    // Verify proposal status was rolled back
    expect(mockUpdateProposal).toHaveBeenCalledWith('PROP-INVALID-EMAIL', 
      expect.objectContaining({
        status: 'sent'
      })
    );

    // Verify no organization was created
    expect(mockWriteOrganization).not.toHaveBeenCalled();
  });

  test('should reuse existing placeholder organization for same email', async () => {
    // Mock existing placeholder organization
    const existingPlaceholderOrg = {
      id: 12345,
      name: "Existing Commissioner's Organization",
      email: 'reuse@testcompany.com',
      isPlaceholder: true,
      createdBy: 34
    };

    mockRequireSession.mockResolvedValue({ userId: 34 });
    mockGetAllOrganizations.mockResolvedValue([existingPlaceholderOrg]);
    mockGetAllUsers.mockResolvedValue([
      { id: 34, name: 'Test Commissioner', email: 'reuse@testcompany.com' }
    ]);
    mockListProjects.mockResolvedValue([]);

    const mockReadProposal = require('../lib/proposals/proposal-storage').readProposal;
    const mockUpdateProposal = require('../lib/proposals/proposal-storage').updateProposal;
    
    const proposalForReuse = {
      id: 'PROP-REUSE-TEST',
      title: 'Reuse Test Proposal',
      commissionerId: 34,
      commissionerEmail: 'reuse@testcompany.com',
      status: 'sent'
    };
    
    mockReadProposal.mockResolvedValue(proposalForReuse);
    mockUpdateProposal.mockResolvedValue(undefined);

    // Mock ProjectService.acceptGig
    const mockProjectService = {
      acceptGig: jest.fn().mockReturnValue({
        project: {
          projectId: 'C-P002',
          title: 'Reuse Test Proposal',
          status: 'ongoing'
        }
      })
    };
    jest.doMock('../lib/projects/project-service', () => ({
      ProjectService: mockProjectService
    }));

    const acceptRequest = new NextRequest('http://localhost:3000/api/proposals/PROP-REUSE-TEST/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const acceptParams = Promise.resolve({ proposalId: 'PROP-REUSE-TEST' });

    // Execute acceptance
    const acceptResponse = await AcceptProposal(acceptRequest, { params: acceptParams });
    const acceptResult = await acceptResponse.json();

    // Verify success
    expect(acceptResponse.status).toBe(200);
    expect(acceptResult.success).toBe(true);

    // Verify no new organization was created (existing one was reused)
    expect(mockWriteOrganization).not.toHaveBeenCalled();

    // Verify project creation proceeded with existing organization
    expect(mockProjectService.acceptGig).toHaveBeenCalledTimes(1);
    const projectCall = mockProjectService.acceptGig.mock.calls[0][0];
    expect(projectCall.organizationName).toBe("Existing Commissioner's Organization");
  });
});

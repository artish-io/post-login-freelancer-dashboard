import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Add any providers you want to wrap your tests with here
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
    </>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Common test utilities
export const createMockUser = (overrides = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'freelancer',
  ...overrides,
})

export const createMockProject = (overrides = {}) => ({
  id: '1',
  title: 'Test Project',
  description: 'Test project description',
  status: 'ongoing',
  freelancerId: '1',
  commissionerId: '2',
  budget: 1000,
  ...overrides,
})

export const createMockTask = (overrides = {}) => ({
  id: '1',
  title: 'Test Task',
  description: 'Test task description',
  status: 'pending',
  projectId: '1',
  assigneeId: '1',
  dueDate: new Date().toISOString(),
  ...overrides,
})

// Mock API responses
export const mockApiResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
})

// Wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock fetch
export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve(mockApiResponse(response, status))
  ) as jest.Mock
}

// Enhanced mock Request for API testing
export const createMockRequest = (url: string, options: RequestInit = {}) => {
  const request = new Request(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options
  });

  // Override json method if body is provided
  if (options.body) {
    const bodyData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    request.json = async () => bodyData;
  }

  return request;
};

// Mock API handler response
export const createMockApiResponse = (data: any, status = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  };
};

// Enhanced milestone-specific test utilities
export const createMockMilestoneGig = (overrides = {}) => ({
  title: 'Test Milestone-Based Gig',
  commissionerId: 32,
  organizationId: 1,
  category: 'development',
  subcategory: 'Web Development',
  skills: ['React', 'TypeScript', 'Node.js'],
  tools: ['React', 'Jest', 'TypeScript'],
  description: 'Test gig for milestone-based invoicing workflow validation',
  executionMethod: 'milestone',
  invoicingMethod: 'milestone',
  budget: 10000,
  lowerBudget: 10000,
  upperBudget: 10000,
  deliveryTimeWeeks: 8,
  estimatedHours: 200,
  startType: 'Immediately',
  isPublic: true,
  isTargetedRequest: false,
  milestones: [
    {
      id: 'M1',
      title: 'Project Setup and Architecture',
      description: 'Initial project setup, architecture design, and development environment',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'M2',
      title: 'Core Development and Implementation',
      description: 'Main feature development, API integration, and core functionality implementation',
      startDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'M3',
      title: 'Testing, Optimization and Deployment',
      description: 'Comprehensive testing, performance optimization, and production deployment',
      startDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  ...overrides
});

// Mock project for milestone testing
export const createMockMilestoneProject = (overrides = {}) => ({
  projectId: Date.now(),
  gigId: Date.now() - 1000,
  commissionerId: 32,
  freelancerId: 31,
  title: 'Test Milestone-Based Project',
  description: 'Test project for milestone-based invoicing workflow validation',
  budget: {
    lower: 10000,
    upper: 10000,
    currency: 'USD'
  },
  status: 'ongoing',
  invoicingMethod: 'milestone',
  executionMethod: 'milestone',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  organizationId: 1,
  typeTags: ['React', 'TypeScript', 'Node.js'],
  ...overrides
});

// Mock task for milestone testing
export const createMockMilestoneTask = (overrides = {}) => ({
  taskId: Date.now(),
  projectId: Date.now() - 1000,
  title: 'Test Milestone Task',
  description: 'Test task for milestone validation',
  status: 'Ongoing',
  completed: false,
  order: 1,
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  rejected: false,
  feedbackCount: 0,
  pushedBack: false,
  version: 1,
  milestoneId: 'M1',
  freelancerId: 31,
  createdDate: new Date().toISOString(),
  lastModified: new Date().toISOString(),
  ...overrides
});

// Test environment setup
export const setupTestEnvironment = () => {
  // Set test environment variables
  process.env.TEST_BYPASS_AUTH = '1';
  process.env.NODE_ENV = 'test';

  // Mock console methods to reduce noise in tests
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  return {
    enableLogging: () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    },
    disableLogging: () => {
      console.log = jest.fn();
      console.error = jest.fn();
    },
    cleanup: () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      delete process.env.TEST_BYPASS_AUTH;
      process.env.NODE_ENV = 'development';
    }
  };
};

// Reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
}

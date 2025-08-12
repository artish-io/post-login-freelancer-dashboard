/**
 * DEBUG GIG CREATION TEST
 * ======================
 * 
 * Simple test to debug the gig creation API issue
 */

import { jest } from '@jest/globals';

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 10000
};

async function makeApiCall(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`🌐 API Call: ${method} ${url}`);
  if (body) console.log(`📤 Request Body:`, JSON.stringify(body, null, 2));

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();

    console.log(`📥 Response Status: ${response.status}`);
    console.log(`📥 Response OK: ${response.ok}`);
    console.log(`📥 Response Type: ${typeof responseData}`);
    console.log(`📥 Response Data:`, JSON.stringify(responseData, null, 2));

    return { status: response.status, data: responseData, ok: response.ok };
  } catch (error) {
    console.error(`❌ API Call Error:`, error);
    throw error;
  }
}

describe('🔍 DEBUG GIG CREATION', () => {
  jest.setTimeout(TEST_CONFIG.timeout);

  it('should test basic gig creation without invoicingMethod', async () => {
    const gigData = {
      title: 'Debug Test Basic',
      budget: 1000,
      executionMethod: 'completion',
      commissionerId: 31
    };

    const response = await makeApiCall('/api/gigs/post', 'POST', gigData);
    
    expect(response.ok).toBe(true);
    expect(response.data.success).toBe(true);
    expect(response.data.gigId).toBeDefined();
    
    console.log('✅ Basic gig creation works');
  });

  it('should test gig creation with invoicingMethod', async () => {
    const gigData = {
      title: 'Debug Test with InvoicingMethod',
      budget: 1000,
      executionMethod: 'completion',
      invoicingMethod: 'completion',
      commissionerId: 31
    };

    const response = await makeApiCall('/api/gigs/post', 'POST', gigData);
    
    console.log('🔍 Testing with invoicingMethod field...');
    
    expect(response.ok).toBe(true);
    expect(response.data.success).toBe(true);
    expect(response.data.gigId).toBeDefined();
    
    console.log('✅ Gig creation with invoicingMethod works');
  });

  it('should test gig creation with full completion invoicing payload', async () => {
    const gigData = {
      title: 'Debug Test Full Payload',
      budget: 10000,
      executionMethod: 'completion',
      invoicingMethod: 'completion',
      commissionerId: 31,
      category: 'development',
      subcategory: 'Web Development',
      skills: ['React', 'TypeScript', 'Testing'],
      tools: ['React', 'Jest', 'TypeScript'],
      description: 'Debug test gig for completion invoicing flow validation',
      lowerBudget: 10000,
      upperBudget: 10000,
      deliveryTimeWeeks: 4,
      estimatedHours: 100,
      startType: 'Immediately',
      isPublic: true,
      isTargetedRequest: false
    };

    const response = await makeApiCall('/api/gigs/post', 'POST', gigData);
    
    console.log('🔍 Testing with full completion invoicing payload...');
    
    expect(response.ok).toBe(true);
    expect(response.data.success).toBe(true);
    expect(response.data.gigId).toBeDefined();
    
    console.log('✅ Full payload gig creation works');
    console.log(`📝 Created gig ID: ${response.data.gigId}`);
  });

  it('should test server connectivity', async () => {
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/`);
      console.log(`🌐 Server connectivity test: ${response.status}`);
      expect(response.status).toBeLessThan(500);
      console.log('✅ Server is reachable');
    } catch (error) {
      console.error('❌ Server connectivity failed:', error);
      throw error;
    }
  });
});

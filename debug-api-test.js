#!/usr/bin/env node

/**
 * Debug script to test the API directly and compare with test results
 */

const fetch = require('node-fetch');

const TEST_CONFIG = {
  freelancerId: 31,
  commissionerId: 32,
  organizationId: 1,
  totalBudget: 15000,
  baseUrl: 'http://localhost:3000'
};

const gigData = {
  title: 'Test Milestone-Based Project for Comprehensive Validation',
  commissionerId: TEST_CONFIG.commissionerId,
  organizationId: TEST_CONFIG.organizationId,
  category: 'development',
  subcategory: 'Web Development',
  skills: ['React', 'TypeScript', 'Node.js'],
  tools: ['React', 'Jest', 'TypeScript'],
  description: 'Comprehensive test project for milestone-based invoicing workflow validation',
  executionMethod: 'milestone',
  invoicingMethod: 'milestone',
  budget: TEST_CONFIG.totalBudget,
  lowerBudget: TEST_CONFIG.totalBudget,
  upperBudget: TEST_CONFIG.totalBudget,
  deliveryTimeWeeks: 12,
  estimatedHours: 300,
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
  ]
};

async function testAPI() {
  console.log('🧪 Testing API with exact test data...');
  console.log('📋 Request data:', JSON.stringify(gigData, null, 2));
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/gigs/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Bypass-Auth': 'true'
      },
      body: JSON.stringify(gigData)
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response OK:', response.ok);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Response result:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
    }

  } catch (error) {
    console.error('🔥 Request failed:', error.message);
  }
}

testAPI();

#!/usr/bin/env node

/**
 * Quick test script to verify task approval API endpoint
 */

const fetch = require('node-fetch');

async function testTaskApproval() {
  console.log('🧪 Testing task approval API endpoint...');
  
  try {
    const response = await fetch('http://localhost:3001/api/project-tasks/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add a test auth header if needed
      },
      body: JSON.stringify({
        taskId: 1,
        projectId: 1,
        action: 'approve'
      })
    });

    console.log('📡 Response status:', response.status);
    console.log('📄 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('📦 Response body:', text);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const data = JSON.parse(text);
        console.log('✅ Parsed JSON:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('❌ Failed to parse JSON:', e.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTaskApproval();

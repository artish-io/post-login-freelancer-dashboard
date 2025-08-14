#!/usr/bin/env node

/**
 * Performance Test for Task Approval
 * 
 * Tests the task approval endpoint to measure response time improvements
 */

const { performance } = require('perf_hooks');

async function testTaskApprovalPerformance() {
  console.log('🚀 Testing task approval performance...\n');

  const testCases = [
    {
      name: 'Task Approval with Invoice Generation',
      payload: {
        taskId: 1,
        action: 'approve'
      }
    },
    {
      name: 'Task Submission',
      payload: {
        taskId: 2,
        action: 'submit',
        referenceUrl: 'https://example.com/work'
      }
    },
    {
      name: 'Task Rejection',
      payload: {
        taskId: 3,
        action: 'reject',
        feedback: 'Needs revision'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`📊 Testing: ${testCase.name}`);
    
    const startTime = performance.now();
    
    try {
      const response = await fetch('http://localhost:3000/api/project-tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=test-session' // Use test session
        },
        body: JSON.stringify(testCase.payload)
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const result = await response.json();
      
      console.log(`   ⏱️  Response time: ${duration.toFixed(2)}ms`);
      console.log(`   📈 Status: ${response.status}`);
      console.log(`   ✅ Success: ${result.success || false}`);
      
      if (duration > 5000) {
        console.log(`   ⚠️  SLOW: Response took over 5 seconds!`);
      } else if (duration > 2000) {
        console.log(`   🐌 Moderate: Response took over 2 seconds`);
      } else {
        console.log(`   🚀 Fast: Response under 2 seconds`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('🏁 Performance test completed!');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testTaskApprovalPerformance().catch(console.error);
}

module.exports = { testTaskApprovalPerformance };

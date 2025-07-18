/**
 * Debug script to test all API endpoints and identify which ones are returning HTML instead of JSON
 */

console.log('🔍 Debugging API Endpoints...\n');
console.log('=' .repeat(70));

// List of API endpoints to test
const endpoints = [
  '/api/projects',
  '/api/project-tasks', 
  '/api/users',
  '/api/organizations',
  '/api/dashboard/stats?id=31',
  '/api/dashboard/tasks-summary?id=31',
  '/api/dashboard/project-notes/count?userId=31&readNotes=false',
  '/api/dashboard/project-details?projectId=301',
  '/api/dashboard/earnings?id=31',
  '/api/user/profile/31',
  '/api/messages',
  '/api/messages/preview',
  '/api/storefront/summary',
  '/api/storefront/recent-sales',
  '/api/storefront/revenue-chart?range=week',
  '/api/storefront/sales-breakdown',
  '/api/gigs/gig-requests/all',
  '/api/projects/auto-complete'
];

async function testEndpoint(endpoint) {
  try {
    console.log(`\n🔍 Testing: ${endpoint}`);
    
    const response = await fetch(`http://localhost:3000${endpoint}`);
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (!response.ok) {
      console.log(`   ❌ HTTP Error: ${response.status}`);
      const text = await response.text();
      if (text.includes('<!DOCTYPE')) {
        console.log(`   🚨 ISSUE: Returning HTML instead of JSON`);
        console.log(`   HTML Preview: ${text.substring(0, 100)}...`);
      }
      return { endpoint, status: response.status, issue: 'HTTP Error', contentType: response.headers.get('content-type') };
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log(`   🚨 ISSUE: Wrong content type - expected JSON, got ${contentType}`);
      const text = await response.text();
      if (text.includes('<!DOCTYPE')) {
        console.log(`   🚨 ISSUE: Returning HTML instead of JSON`);
        console.log(`   HTML Preview: ${text.substring(0, 100)}...`);
      }
      return { endpoint, status: response.status, issue: 'Wrong Content-Type', contentType };
    }
    
    try {
      const data = await response.json();
      console.log(`   ✅ Valid JSON response`);
      console.log(`   Data type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      if (Array.isArray(data)) {
        console.log(`   Array length: ${data.length}`);
      } else if (typeof data === 'object' && data !== null) {
        console.log(`   Object keys: ${Object.keys(data).slice(0, 5).join(', ')}${Object.keys(data).length > 5 ? '...' : ''}`);
      }
      return { endpoint, status: response.status, issue: null, contentType };
    } catch (jsonError) {
      console.log(`   🚨 ISSUE: Invalid JSON`);
      console.log(`   JSON Error: ${jsonError.message}`);
      const text = await response.text();
      if (text.includes('<!DOCTYPE')) {
        console.log(`   🚨 ISSUE: Returning HTML instead of JSON`);
        console.log(`   HTML Preview: ${text.substring(0, 100)}...`);
      }
      return { endpoint, status: response.status, issue: 'Invalid JSON', contentType };
    }
    
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
    return { endpoint, status: 'Network Error', issue: error.message, contentType: null };
  }
}

async function runDiagnostics() {
  console.log('🚀 Starting API endpoint diagnostics...');
  console.log('Make sure your Next.js dev server is running on http://localhost:3000\n');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 DIAGNOSTIC SUMMARY:');
  console.log('=' .repeat(70));
  
  const issues = results.filter(r => r.issue);
  const working = results.filter(r => !r.issue);
  
  console.log(`\n✅ Working endpoints: ${working.length}`);
  working.forEach(r => {
    console.log(`   • ${r.endpoint} (${r.status})`);
  });
  
  if (issues.length > 0) {
    console.log(`\n❌ Problematic endpoints: ${issues.length}`);
    issues.forEach(r => {
      console.log(`   • ${r.endpoint}`);
      console.log(`     Status: ${r.status}`);
      console.log(`     Issue: ${r.issue}`);
      console.log(`     Content-Type: ${r.contentType || 'Unknown'}`);
    });
    
    console.log('\n🔧 LIKELY CAUSES:');
    console.log('   1. API route file missing or has syntax errors');
    console.log('   2. Data file (JSON) is corrupted or has syntax errors');
    console.log('   3. Next.js is serving 404 page instead of API response');
    console.log('   4. File path issues in API route');
    console.log('   5. Permission issues reading data files');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('   1. Check the problematic endpoints in your browser');
    console.log('   2. Look at the actual HTML being returned');
    console.log('   3. Check the corresponding API route files');
    console.log('   4. Verify data files are valid JSON');
    console.log('   5. Check Next.js server console for errors');
    
  } else {
    console.log('\n🎉 All endpoints are working correctly!');
  }
}

// Run the diagnostics
runDiagnostics().catch(error => {
  console.error('🔥 Diagnostic script failed:', error);
});

/**
 * Script to identify deprecated JSON files that can be removed
 * since we now use universal source files (projects.json, project-tasks.json, users.json)
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Identifying deprecated JSON files...\n');
console.log('=' .repeat(60));

// Universal source files that should be kept
const universalSourceFiles = [
  'data/projects.json',
  'data/project-tasks.json', 
  'data/users.json',
  'data/freelancers.json',
  'data/organizations.json',
  'data/contacts.json',
  'data/messages.json',
  'data/gigs/gigs.json',
  'data/gigs/gig-applications.json',
  'data/gigs/gig-requests.json',
  'data/gigs/gig-categories.json',
  'data/gigs/gig-tools.json',
  'data/notifications/commissioners.json',
  'data/notifications/freelancers.json',
  'data/wallet/wallet-history.json',
  'data/invoices-log/invoices-draft.json',
  'data/storefront/products.json',
  'data/storefront/unit-sales.json',
  'data/milestones.json',
  'data/project-notes.json',
  'data/project-links.json'
];

// Deprecated files that duplicate data from universal sources
const deprecatedFiles = [
  {
    file: 'data/dashboard-stats.json',
    reason: 'Stats now calculated dynamically from projects.json and project-tasks.json',
    replacedBy: 'API route /api/dashboard/stats calculates from source files'
  },
  {
    file: 'data/task-summary.json', 
    reason: 'Task data duplicated from project-tasks.json',
    replacedBy: 'Direct queries to project-tasks.json'
  },
  {
    file: 'data/projects-summary.json',
    reason: 'Project summaries can be calculated from projects.json',
    replacedBy: 'Dynamic calculation from projects.json'
  }
];

console.log('✅ UNIVERSAL SOURCE FILES (keep these):');
universalSourceFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`   ${exists ? '✓' : '✗'} ${file}`);
});

console.log('\n❌ DEPRECATED FILES (can be removed):');
deprecatedFiles.forEach(({ file, reason, replacedBy }) => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`   ${exists ? '🗑️' : '✗'} ${file}`);
  console.log(`      Reason: ${reason}`);
  console.log(`      Replaced by: ${replacedBy}`);
  console.log('');
});

console.log('🔧 SCRIPTS THAT CAN BE DEPRECATED:');
const deprecatedScripts = [
  {
    file: 'scripts/update-dashboard-stats.js',
    reason: 'Dashboard stats now calculated dynamically in API routes'
  }
];

deprecatedScripts.forEach(({ file, reason }) => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`   ${exists ? '🗑️' : '✗'} ${file}`);
  console.log(`      Reason: ${reason}`);
  console.log('');
});

console.log('📋 SUMMARY:');
console.log(`• ${universalSourceFiles.length} universal source files identified`);
console.log(`• ${deprecatedFiles.length} deprecated data files can be removed`);
console.log(`• ${deprecatedScripts.length} deprecated scripts can be removed`);
console.log('• All application logic now uses dynamic data from universal sources');

console.log('\n🎯 NEXT STEPS:');
console.log('1. Verify all components work with universal source files');
console.log('2. Remove deprecated files after confirming they are not used');
console.log('3. Update any remaining references to deprecated files');
console.log('4. Test the application to ensure data flows correctly');

console.log('\n' + '=' .repeat(60));

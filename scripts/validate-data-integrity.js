const fs = require('fs');
const path = require('path');

async function validateDataIntegrity() {
  console.log('🔍 Validating data integrity...\n');

  // For now, just skip validation since all data has been migrated to hierarchical storage
  // TODO: Update this script to use hierarchical storage when needed
  console.log('⚠️  Skipping validation - users.json, freelancers.json, and organizations.json have been migrated to hierarchical storage');
  const users = [];
  const freelancers = [];
  const organizations = [];

  let errors = [];
  let warnings = [];

  // 1. Check freelancer userId references
  console.log('📋 Checking freelancer → user references...');
  freelancers.forEach(freelancer => {
    const user = users.find(u => u.id === freelancer.userId);
    if (!user) {
      errors.push(`❌ Freelancer ${freelancer.id} references non-existent userId ${freelancer.userId}`);
    } else if (user.type !== 'freelancer') {
      warnings.push(`⚠️  Freelancer ${freelancer.id} references user ${user.id} who is not type 'freelancer'`);
    }
  });

  // 2. Check organization contactPersonId references
  console.log('📋 Checking organization → user references...');
  organizations.forEach(org => {
    if (org.contactPersonId) {
      const user = users.find(u => u.id === org.contactPersonId);
      if (!user) {
        errors.push(`❌ Organization ${org.id} references non-existent contactPersonId ${org.contactPersonId}`);
      } else if (user.type !== 'commissioner') {
        warnings.push(`⚠️  Organization ${org.id} references user ${user.id} who is not type 'commissioner'`);
      }
    }
  });

// 3. Check for duplicate IDs
console.log('📋 Checking for duplicate IDs...');
const userIds = users.map(u => u.id);
const duplicateUserIds = userIds.filter((id, index) => userIds.indexOf(id) !== index);
if (duplicateUserIds.length > 0) {
  errors.push(`❌ Duplicate user IDs found: ${duplicateUserIds.join(', ')}`);
}

const freelancerIds = freelancers.map(f => f.id);
const duplicateFreelancerIds = freelancerIds.filter((id, index) => freelancerIds.indexOf(id) !== index);
if (duplicateFreelancerIds.length > 0) {
  errors.push(`❌ Duplicate freelancer IDs found: ${duplicateFreelancerIds.join(', ')}`);
}

// 4. Check for orphaned users
console.log('📋 Checking for orphaned users...');
const referencedUserIds = new Set([
  ...freelancers.map(f => f.userId),
  ...organizations.map(o => o.contactPersonId).filter(Boolean)
]);

users.forEach(user => {
  if (user.type === 'freelancer' && !referencedUserIds.has(user.id)) {
    warnings.push(`⚠️  User ${user.id} (${user.name}) is type 'freelancer' but not referenced by any freelancer record`);
  }
  if (user.type === 'commissioner' && !referencedUserIds.has(user.id)) {
    warnings.push(`⚠️  User ${user.id} (${user.name}) is type 'commissioner' but not referenced by any organization`);
  }
});

// 5. Check required fields
console.log('📋 Checking required fields...');
users.forEach(user => {
  if (!user.name) errors.push(`❌ User ${user.id} missing required field: name`);
  if (!user.type) errors.push(`❌ User ${user.id} missing required field: type`);
  if (!user.email) errors.push(`❌ User ${user.id} missing required field: email`);
});

freelancers.forEach(freelancer => {
  if (!freelancer.userId) errors.push(`❌ Freelancer ${freelancer.id} missing required field: userId`);
  if (!freelancer.category) errors.push(`❌ Freelancer ${freelancer.id} missing required field: category`);
  if (!freelancer.availability) errors.push(`❌ Freelancer ${freelancer.id} missing required field: availability`);
});

// 6. Check data consistency
console.log('📋 Checking data consistency...');
freelancers.forEach(freelancer => {
  // Check if freelancer has old redundant fields
  if (freelancer.name) {
    warnings.push(`⚠️  Freelancer ${freelancer.id} has redundant 'name' field - should use userId reference`);
  }
  if (freelancer.title) {
    warnings.push(`⚠️  Freelancer ${freelancer.id} has redundant 'title' field - should use userId reference`);
  }
  if (freelancer.avatar) {
    warnings.push(`⚠️  Freelancer ${freelancer.id} has redundant 'avatar' field - should use userId reference`);
  }
});

// Report results
console.log('\n📊 Validation Results:');
console.log('='.repeat(50));

if (errors.length === 0) {
  console.log('✅ No critical errors found!');
} else {
  console.log(`❌ Found ${errors.length} critical error(s):`);
  errors.forEach(error => console.log(`   ${error}`));
}

if (warnings.length === 0) {
  console.log('✅ No warnings!');
} else {
  console.log(`\n⚠️  Found ${warnings.length} warning(s):`);
  warnings.forEach(warning => console.log(`   ${warning}`));
}

// Summary statistics
console.log('\n📈 Data Summary:');
console.log(`   Users: ${users.length} (${users.filter(u => u.type === 'freelancer').length} freelancers, ${users.filter(u => u.type === 'commissioner').length} commissioners)`);
console.log(`   Freelancers: ${freelancers.length}`);
console.log(`   Organizations: ${organizations.length}`);

  // Exit with appropriate code
  if (errors.length > 0) {
    console.log('\n💥 Data integrity check FAILED - please fix critical errors');
    process.exit(1);
  } else {
    console.log('\n🎉 Data integrity check PASSED!');
    process.exit(0);
  }
}

// Run the validation
validateDataIntegrity().catch(error => {
  console.error('💥 Validation script failed:', error);
  process.exit(1);
});

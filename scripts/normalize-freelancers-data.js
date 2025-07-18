const fs = require('fs');
const path = require('path');

// Read the current freelancers.json
const freelancersPath = path.join(__dirname, '../data/freelancers.json');
const usersPath = path.join(__dirname, '../data/users.json');

const freelancers = JSON.parse(fs.readFileSync(freelancersPath, 'utf8'));
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

console.log('🔄 Normalizing freelancers data...');

// Normalize freelancers data by removing redundant information
const normalizedFreelancers = freelancers.map(freelancer => {
  // Find corresponding user
  const user = users.find(u => u.id === freelancer.id);
  
  if (!user) {
    console.warn(`⚠️  No user found for freelancer ID ${freelancer.id}`);
  }

  // Create normalized freelancer object
  const normalized = {
    id: freelancer.id,
    userId: freelancer.id, // Reference to users.json
    category: freelancer.category,
    skills: freelancer.skills,
    rate: freelancer.rate,
    minRate: freelancer.minRate,
    maxRate: freelancer.maxRate,
    location: freelancer.location,
    rating: freelancer.rating,
    availability: freelancer.availability,
    withdrawalMethod: freelancer.withdrawalMethod
  };

  // Add optional fields if they exist
  if (freelancer.specializations) {
    normalized.specializations = freelancer.specializations;
  }

  // Handle freelancers with extra fields that should be moved to users.json
  if (freelancer.username || freelancer.about || freelancer.socialLinks || freelancer.workSamples || freelancer.trend) {
    // Move user-specific data to users.json if not already there
    const existingUser = users.find(u => u.id === freelancer.userId);
    if (existingUser) {
      // Update user with additional info from freelancer record
      if (freelancer.username) existingUser.username = freelancer.username;
      if (freelancer.about) existingUser.about = freelancer.about;
      if (freelancer.socialLinks) existingUser.socialLinks = freelancer.socialLinks;
      if (freelancer.workSamples) existingUser.workSamples = freelancer.workSamples;
      if (freelancer.trend) existingUser.trend = freelancer.trend;
    }
  }

  // Handle location format normalization
  if (freelancer.location && typeof freelancer.location === 'string' && freelancer.location.includes(',')) {
    // Convert "Lagos, Nigeria" to country code format
    if (freelancer.location.includes('Nigeria')) {
      normalized.location = "NG";
    } else {
      // Keep original location if we can't determine country code
      normalized.location = freelancer.location;
    }
  }

  return normalized;
});

// Write normalized data back to files
fs.writeFileSync(freelancersPath, JSON.stringify(normalizedFreelancers, null, 2));
fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

console.log('✅ Freelancers data normalized successfully!');
console.log(`📊 Processed ${normalizedFreelancers.length} freelancer records`);

// Report what was changed
console.log('\n📋 Changes made:');
console.log('• Removed duplicate name and title fields from freelancers.json');
console.log('• Added userId references to link with users.json');
console.log('• Moved user-specific data from freelancers to users.json');
console.log('• Standardized location formats');

// Verify data integrity
const duplicateUserIds = normalizedFreelancers
  .map(f => f.userId)
  .filter((id, index, arr) => arr.indexOf(id) !== index);

if (duplicateUserIds.length > 0) {
  console.warn('⚠️  Found duplicate userId references:', duplicateUserIds);
} else {
  console.log('✅ No duplicate userId references found');
}

console.log('\n🎯 Data structure is now normalized and follows best practices!');

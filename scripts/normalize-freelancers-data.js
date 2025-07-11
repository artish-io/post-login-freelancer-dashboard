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

  // Handle the special case of ID 31 which has extra fields
  if (freelancer.id === 31) {
    // Move user-specific data to users.json if not already there
    const existingUser = users.find(u => u.id === 31);
    if (existingUser) {
      // Update user with additional info from freelancer record
      existingUser.username = freelancer.username;
      existingUser.about = freelancer.about;
      existingUser.socialLinks = freelancer.socialLinks;
      existingUser.workSamples = freelancer.workSamples;
      existingUser.trend = freelancer.trend;
      
      // Update location format to match others
      normalized.location = "NG"; // Convert "Lagos, Nigeria" to country code
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
console.log('• Moved user-specific data from freelancer ID 31 to users.json');
console.log('• Standardized location format for ID 31');

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

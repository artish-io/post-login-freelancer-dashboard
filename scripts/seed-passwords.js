#!/usr/bin/env node

/**
 * Password Seeding Script for Development
 * 
 * This script adds bcrypt password hashes to existing users in the hierarchical storage
 * for testing traditional login flow alongside the magic link authentication.
 * 
 * Usage:
 *   node scripts/seed-passwords.js
 *   node scripts/seed-passwords.js --password=mypassword
 *   node scripts/seed-passwords.js --users=1,2,3 --password=testpass
 * 
 * DEV-ONLY: This script is for development testing only.
 * TODO: Remove before production deployment.
 */

const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

// Default password for seeding (can be overridden via command line)
const DEFAULT_PASSWORD = 'password123';
const SALT_ROUNDS = 10;

async function loadUsersIndex() {
  try {
    const indexPath = path.join(process.cwd(), 'data', 'users-index.json');
    const data = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error loading users index:', error.message);
    process.exit(1);
  }
}

async function readUserProfile(userId, userPath) {
  try {
    const profilePath = path.join(process.cwd(), 'data', 'users', userPath, 'profile.json');
    const data = await fs.readFile(profilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`⚠️  Could not read user ${userId} profile:`, error.message);
    return null;
  }
}

async function writeUserProfile(userId, userPath, profile) {
  try {
    const profilePath = path.join(process.cwd(), 'data', 'users', userPath, 'profile.json');
    
    // Add updatedAt timestamp
    const updatedProfile = {
      ...profile,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(profilePath, JSON.stringify(updatedProfile, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Error writing user ${userId} profile:`, error.message);
    return false;
  }
}

async function seedPasswords(options = {}) {
  const {
    password = DEFAULT_PASSWORD,
    userIds = null, // null means all users
    dryRun = false
  } = options;

  console.log('🔐 Password Seeding Script');
  console.log('==========================');
  console.log(`Password: ${password}`);
  console.log(`Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log('');

  // Load users index
  const usersIndex = await loadUsersIndex();
  const allUserIds = Object.keys(usersIndex);
  
  // Filter users if specific IDs provided
  const targetUserIds = userIds ? userIds.filter(id => allUserIds.includes(id.toString())) : allUserIds;
  
  if (targetUserIds.length === 0) {
    console.log('❌ No valid users found to seed passwords for.');
    return;
  }

  console.log(`📋 Found ${targetUserIds.length} users to process:`);
  
  // Hash the password once
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const userId of targetUserIds) {
    const userPath = usersIndex[userId].path;
    
    // Read current profile
    const profile = await readUserProfile(userId, userPath);
    if (!profile) {
      errorCount++;
      continue;
    }

    // Check if user already has a password
    if (profile.password || profile.passwordHash) {
      console.log(`⏭️  User ${userId} (${profile.name}) already has a password - skipping`);
      skipCount++;
      continue;
    }

    if (dryRun) {
      console.log(`🔍 [DRY RUN] Would add password to user ${userId} (${profile.name})`);
      successCount++;
    } else {
      // Add password hash to profile
      const updatedProfile = {
        ...profile,
        password: password, // Store plain text for dev convenience
        passwordHash: passwordHash // Store hash for production-like testing
      };

      const success = await writeUserProfile(userId, userPath, updatedProfile);
      if (success) {
        console.log(`✅ Added password to user ${userId} (${profile.name})`);
        successCount++;
      } else {
        errorCount++;
      }
    }
  }

  console.log('');
  console.log('📊 Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (!dryRun && successCount > 0) {
    console.log('');
    console.log('🧪 Testing Instructions:');
    console.log('1. Use the existing login flow with username/email and password');
    console.log('2. Or test the new magic link flow via the sign-up modal');
    console.log('3. Example curl command for testing:');
    console.log(`   curl -X POST http://localhost:3000/api/test-auth \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"username": "user@example.com", "password": "${password}"}'`);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--password=')) {
      options.password = arg.split('=')[1];
    } else if (arg.startsWith('--users=')) {
      options.userIds = arg.split('=')[1].split(',').map(id => id.trim());
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Password Seeding Script');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/seed-passwords.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  --password=<password>    Set custom password (default: password123)');
      console.log('  --users=<id1,id2,id3>    Seed specific user IDs only');
      console.log('  --dry-run                Show what would be done without making changes');
      console.log('  --help, -h               Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/seed-passwords.js');
      console.log('  node scripts/seed-passwords.js --password=testpass');
      console.log('  node scripts/seed-passwords.js --users=1,2,3 --dry-run');
      process.exit(0);
    }
  }

  return options;
}

// Main execution
async function main() {
  try {
    // Check if bcrypt is available
    try {
      require('bcryptjs');
    } catch (error) {
      console.error('❌ bcryptjs is not installed. Please run: npm install bcryptjs');
      process.exit(1);
    }

    const options = parseArgs();
    await seedPasswords(options);
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedPasswords };

#!/usr/bin/env node

/**
 * Direct Ratings Test Script
 * 
 * This script directly tests the rating collection logic
 * without going through the API authentication.
 */

const fs = require('fs').promises;
const path = require('path');

// Simple validation function for testing
function isValidProjectRating(data) {
  return data &&
         typeof data.ratingId === 'string' &&
         typeof data.projectId === 'number' &&
         typeof data.subjectUserId === 'number' &&
         typeof data.rating === 'number';
}

// Simple file operations for testing
async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path, defaultValue) {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Replicate the collectUserRatings function logic
 */
async function testCollectUserRatings(userId, userType) {
  const ratings = [];
  
  try {
    const projectsBasePath = path.join(process.cwd(), 'data', 'projects');
    log(`Looking for ratings in: ${projectsBasePath}`, 'blue');
    
    // Check if projects directory exists
    if (!(await fileExists(projectsBasePath))) {
      log('Projects directory does not exist', 'red');
      return ratings;
    }
    
    // First, check for flat structure (legacy ratings)
    await checkFlatStructureRatings(projectsBasePath, userId, userType, ratings);
    log(`Found ${ratings.length} ratings in flat structure`, 'yellow');
    
    // Then walk through the hierarchical structure
    const years = await fs.readdir(projectsBasePath, { withFileTypes: true });
    log(`Found ${years.length} entries in projects directory`, 'blue');
    
    for (const year of years) {
      if (!year.isDirectory() || year.name === 'metadata') continue;
      
      log(`Checking year: ${year.name}`, 'blue');
      
      const yearPath = path.join(projectsBasePath, year.name);
      const months = await fs.readdir(yearPath, { withFileTypes: true });
      
      for (const month of months) {
        if (!month.isDirectory()) continue;
        
        const monthPath = path.join(yearPath, month.name);
        const days = await fs.readdir(monthPath, { withFileTypes: true });
        
        for (const day of days) {
          if (!day.isDirectory()) continue;
          
          const dayPath = path.join(monthPath, day.name);
          const projects = await fs.readdir(dayPath, { withFileTypes: true });
          
          for (const project of projects) {
            if (!project.isDirectory()) continue;
            
            const projectId = Number(project.name);
            if (isNaN(projectId)) continue;
            
            log(`Checking project ${projectId} for ${userType} ratings`, 'blue');
            
            // Check for ratings directory
            const ratingsPath = path.join(dayPath, project.name, 'ratings', userType);
            
            if (await fileExists(ratingsPath)) {
              try {
                const ratingFiles = await fs.readdir(ratingsPath);
                log(`Found ${ratingFiles.length} rating files in ${ratingsPath}`, 'green');
                
                for (const ratingFile of ratingFiles) {
                  if (!ratingFile.endsWith('.json')) continue;
                  
                  const ratingFilePath = path.join(ratingsPath, ratingFile);
                  const rating = await readJson(ratingFilePath, null);
                  
                  if (rating && isValidProjectRating(rating) && rating.subjectUserId === userId) {
                    ratings.push(rating);
                    log(`✅ Found valid rating: ${rating.ratingId}`, 'green');
                  } else {
                    log(`❌ Invalid or non-matching rating in ${ratingFile}`, 'red');
                    if (rating) {
                      log(`   Subject: ${rating.subjectUserId}, Looking for: ${userId}`, 'yellow');
                    }
                  }
                }
              } catch (error) {
                log(`Error reading ratings from ${ratingsPath}: ${error.message}`, 'red');
              }
            } else {
              log(`No ratings directory at ${ratingsPath}`, 'yellow');
            }
          }
        }
      }
    }
    
  } catch (error) {
    log(`Error collecting ratings: ${error.message}`, 'red');
  }
  
  return ratings;
}

/**
 * Check for ratings in the flat structure (legacy format)
 */
async function checkFlatStructureRatings(projectsBasePath, userId, userType, ratings) {
  try {
    const entries = await fs.readdir(projectsBasePath, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip hierarchical directories (year folders) and metadata
      if (!entry.isDirectory() || /^\d{4}$/.test(entry.name) || entry.name === 'metadata') {
        continue;
      }
      
      const projectId = Number(entry.name);
      if (isNaN(projectId)) continue;
      
      log(`Checking flat structure project ${projectId}`, 'blue');
      
      // Check for ratings in flat structure
      const ratingsPath = path.join(projectsBasePath, entry.name, 'ratings', userType);
      
      if (await fileExists(ratingsPath)) {
        try {
          const ratingFiles = await fs.readdir(ratingsPath);
          log(`Found ${ratingFiles.length} rating files in flat structure: ${ratingsPath}`, 'green');
          
          for (const ratingFile of ratingFiles) {
            if (!ratingFile.endsWith('.json')) continue;
            
            const ratingFilePath = path.join(ratingsPath, ratingFile);
            const rating = await readJson(ratingFilePath, null);
            
            if (rating && isValidProjectRating(rating) && rating.subjectUserId === userId) {
              ratings.push(rating);
              log(`✅ Found valid flat structure rating: ${rating.ratingId}`, 'green');
            } else {
              log(`❌ Invalid or non-matching flat structure rating in ${ratingFile}`, 'red');
              if (rating) {
                log(`   Subject: ${rating.subjectUserId}, Looking for: ${userId}`, 'yellow');
              }
            }
          }
        } catch (error) {
          log(`Error reading flat structure ratings from ${ratingsPath}: ${error.message}`, 'red');
        }
      }
    }
  } catch (error) {
    log(`Error checking flat structure ratings: ${error.message}`, 'red');
  }
}

async function runTest() {
  log('🧪 Testing Direct Rating Collection', 'blue');
  
  // Test for user 31 (freelancer)
  log('\n📋 Testing User 31 (Freelancer) Ratings', 'yellow');
  const user31Ratings = await testCollectUserRatings(31, 'freelancer');
  log(`Found ${user31Ratings.length} ratings for user 31:`, 'green');
  user31Ratings.forEach(rating => {
    log(`  - ${rating.rating}/5 stars from user ${rating.raterUserId} (${rating.raterUserType})`, 'green');
    log(`    Project: ${rating.projectTitle || rating.projectId}`, 'blue');
    log(`    Comment: ${rating.comment || 'No comment'}`, 'blue');
  });
  
  // Test for user 32 (commissioner)
  log('\n📋 Testing User 32 (Commissioner) Ratings', 'yellow');
  const user32Ratings = await testCollectUserRatings(32, 'commissioner');
  log(`Found ${user32Ratings.length} ratings for user 32:`, 'green');
  user32Ratings.forEach(rating => {
    log(`  - ${rating.rating}/5 stars from user ${rating.raterUserId} (${rating.raterUserType})`, 'green');
    log(`    Project: ${rating.projectTitle || rating.projectId}`, 'blue');
    log(`    Comment: ${rating.comment || 'No comment'}`, 'blue');
  });
  
  // Summary
  log('\n📊 Test Summary', 'blue');
  if (user31Ratings.length > 0 || user32Ratings.length > 0) {
    log('✅ Rating collection is working correctly', 'green');
    log('💡 The API should be able to find these ratings', 'blue');
  } else {
    log('❌ No ratings found - there may be an issue with the collection logic', 'red');
  }
}

// Run the test
if (require.main === module) {
  runTest();
}

module.exports = { testCollectUserRatings };

#!/usr/bin/env node

/**
 * Test script to verify rating notification functionality
 * This script tests the rating submission API and verifies that notifications are created
 */

const fs = require('fs');
const path = require('path');

// Test data
const TEST_PROJECT_ID = 301;
const TEST_FREELANCER_ID = 31;
const TEST_COMMISSIONER_ID = 32;

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function checkNotificationEvents() {
  console.log('\n🔍 Checking for rating notification events...');
  
  const eventsDir = path.join(process.cwd(), 'data', 'notifications', 'events');
  
  if (!fs.existsSync(eventsDir)) {
    console.log('❌ Events directory does not exist');
    return false;
  }
  
  // Get current date for checking today's events
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const day = now.getDate().toString().padStart(2, '0');
  
  const todayEventsDir = path.join(eventsDir, year.toString(), month, day);
  
  if (!fs.existsSync(todayEventsDir)) {
    console.log(`❌ No events directory for today: ${year}/${month}/${day}`);
    return false;
  }
  
  // Check for rating events
  const ratingEventsFile = path.join(todayEventsDir, 'project_rating_submitted.json');
  
  if (!fs.existsSync(ratingEventsFile)) {
    console.log('❌ No rating events found for today');
    return false;
  }
  
  const ratingEvents = readJsonFile(ratingEventsFile);
  if (!ratingEvents || !Array.isArray(ratingEvents)) {
    console.log('❌ Invalid rating events file');
    return false;
  }
  
  console.log(`✅ Found ${ratingEvents.length} rating event(s) for today`);
  
  // Check for recent rating events (last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentEvents = ratingEvents.filter(event => {
    const eventTime = new Date(event.timestamp);
    return eventTime > fiveMinutesAgo;
  });
  
  if (recentEvents.length > 0) {
    console.log(`✅ Found ${recentEvents.length} recent rating event(s):`);
    recentEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. Project ${event.context?.projectId}, ${event.metadata?.stars} stars, Target: ${event.targetId}`);
    });
    return true;
  } else {
    console.log('ℹ️  No recent rating events found (last 5 minutes)');
    return false;
  }
}

function checkRatingFiles() {
  console.log('\n🔍 Checking for rating files...');

  // Check hierarchical structure first
  const hierarchicalRatingsDir = path.join(process.cwd(), 'data', 'projects', '2025', '07', '29', TEST_PROJECT_ID.toString(), 'ratings');

  if (fs.existsSync(hierarchicalRatingsDir)) {
    return checkRatingsInDirectory(hierarchicalRatingsDir);
  }

  // Fallback to flat structure
  const flatRatingsDir = path.join(process.cwd(), 'data', 'projects', TEST_PROJECT_ID.toString(), 'ratings');

  if (fs.existsSync(flatRatingsDir)) {
    return checkRatingsInDirectory(flatRatingsDir);
  }

  console.log(`❌ No ratings directory for project ${TEST_PROJECT_ID}`);
  return false;
}

function checkRatingsInDirectory(ratingsDir) {
  const freelancerRatingsDir = path.join(ratingsDir, 'freelancer');
  const commissionerRatingsDir = path.join(ratingsDir, 'commissioner');

  let ratingsFound = 0;

  if (fs.existsSync(freelancerRatingsDir)) {
    const freelancerRatings = fs.readdirSync(freelancerRatingsDir);
    console.log(`✅ Found ${freelancerRatings.length} freelancer rating(s)`);
    ratingsFound += freelancerRatings.length;
  }

  if (fs.existsSync(commissionerRatingsDir)) {
    const commissionerRatings = fs.readdirSync(commissionerRatingsDir);
    console.log(`✅ Found ${commissionerRatings.length} commissioner rating(s)`);
    ratingsFound += commissionerRatings.length;
  }

  return ratingsFound > 0;
}

function checkProjectExists() {
  console.log('\n🔍 Checking if test project exists...');

  // Check hierarchical structure first
  const hierarchicalProjectFile = path.join(process.cwd(), 'data', 'projects', '2025', '07', '29', TEST_PROJECT_ID.toString(), 'project.json');

  if (fs.existsSync(hierarchicalProjectFile)) {
    const project = readJsonFile(hierarchicalProjectFile);
    if (project) {
      console.log(`✅ Test project exists: "${project.title}"`);
      console.log(`   Freelancer ID: ${project.freelancerId}`);
      console.log(`   Commissioner ID: ${project.commissionerId}`);
      return true;
    }
  }

  // Fallback to flat structure
  const flatProjectFile = path.join(process.cwd(), 'data', 'projects', TEST_PROJECT_ID.toString(), 'project.json');

  if (fs.existsSync(flatProjectFile)) {
    const project = readJsonFile(flatProjectFile);
    if (project) {
      console.log(`✅ Test project exists: "${project.title}"`);
      console.log(`   Freelancer ID: ${project.freelancerId}`);
      console.log(`   Commissioner ID: ${project.commissionerId}`);
      return true;
    }
  }

  console.log(`❌ Test project ${TEST_PROJECT_ID} does not exist`);
  return false;
}

function checkUsers() {
  console.log('\n🔍 Checking if test users exist...');
  
  const usersFile = path.join(process.cwd(), 'data', 'users.json');
  const users = readJsonFile(usersFile);
  
  if (!users || !Array.isArray(users)) {
    console.log('❌ Could not read users file');
    return false;
  }
  
  const freelancer = users.find(u => u.id === TEST_FREELANCER_ID);
  const commissioner = users.find(u => u.id === TEST_COMMISSIONER_ID);
  
  if (!freelancer) {
    console.log(`❌ Test freelancer ${TEST_FREELANCER_ID} not found`);
    return false;
  }
  
  if (!commissioner) {
    console.log(`❌ Test commissioner ${TEST_COMMISSIONER_ID} not found`);
    return false;
  }
  
  console.log(`✅ Test freelancer exists: ${freelancer.name}`);
  console.log(`✅ Test commissioner exists: ${commissioner.name}`);
  
  return true;
}

function main() {
  console.log('🧪 Testing Rating Notification System');
  console.log('=====================================');
  
  // Check prerequisites
  const projectExists = checkProjectExists();
  const usersExist = checkUsers();
  
  if (!projectExists || !usersExist) {
    console.log('\n❌ Prerequisites not met. Cannot test rating notifications.');
    console.log('\nTo test rating notifications:');
    console.log('1. Ensure project 301 exists with freelancer 31 and commissioner 32');
    console.log('2. Submit a rating through the UI or API');
    console.log('3. Run this script again to verify notifications were created');
    return;
  }
  
  // Check for existing ratings
  const ratingsExist = checkRatingFiles();
  
  // Check for notification events
  const notificationsExist = checkNotificationEvents();
  
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Project exists: ${projectExists}`);
  console.log(`✅ Users exist: ${usersExist}`);
  console.log(`${ratingsExist ? '✅' : '❌'} Ratings exist: ${ratingsExist}`);
  console.log(`${notificationsExist ? '✅' : '❌'} Recent notifications exist: ${notificationsExist}`);
  
  if (ratingsExist && notificationsExist) {
    console.log('\n🎉 Rating notification system is working correctly!');
  } else if (ratingsExist && !notificationsExist) {
    console.log('\n⚠️  Ratings exist but no recent notifications found.');
    console.log('   This might be expected if ratings were submitted earlier.');
  } else {
    console.log('\n📝 To test the system:');
    console.log('1. Login as a user (freelancer or commissioner)');
    console.log('2. Navigate to a completed project');
    console.log('3. Submit a rating');
    console.log('4. Run this script to verify notifications were created');
  }
}

// Run the test
main();

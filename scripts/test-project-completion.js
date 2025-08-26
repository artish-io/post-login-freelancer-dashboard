#!/usr/bin/env node

/**
 * Test Project Completion Notifications
 * 
 * This script tests if project completion and rating notifications
 * are properly triggered for milestone-based projects.
 */

const fs = require('fs').promises;
const path = require('path');

async function testProjectCompletion() {
  console.log('🧪 Testing Project Completion Notifications');
  console.log('==========================================\n');

  try {
    // Check C-009 project status
    const projectPath = path.join(process.cwd(), 'data/projects/2025/08/26/C-009/project.json');
    const projectData = JSON.parse(await fs.readFile(projectPath, 'utf8'));
    
    console.log('📊 Project C-009 Status:');
    console.log(`   Title: ${projectData.title}`);
    console.log(`   Status: ${projectData.status}`);
    console.log(`   Invoicing Method: ${projectData.invoicingMethod}`);
    console.log(`   Total Tasks: ${projectData.totalTasks}`);
    console.log(`   Commissioner: ${projectData.commissionerId}`);
    console.log(`   Freelancer: ${projectData.freelancerId}`);

    // Check task completion status
    const tasksDir = path.join(process.cwd(), 'data/project-tasks/2025/08/26/C-009');
    const taskFiles = await fs.readdir(tasksDir);
    
    let approvedTasks = 0;
    let totalTasks = 0;
    
    for (const file of taskFiles) {
      if (file.endsWith('.json')) {
        const taskPath = path.join(tasksDir, file);
        const taskData = JSON.parse(await fs.readFile(taskPath, 'utf8'));
        totalTasks++;
        
        if (taskData.status === 'Approved' && taskData.completed) {
          approvedTasks++;
        }
        
        console.log(`   Task ${taskData.taskId}: ${taskData.title} - ${taskData.status} (completed: ${taskData.completed})`);
      }
    }
    
    console.log(`\n📈 Task Summary: ${approvedTasks}/${totalTasks} tasks approved and completed`);
    
    const isProjectComplete = approvedTasks === totalTasks && totalTasks > 0;
    console.log(`🎯 Project Complete: ${isProjectComplete ? '✅ YES' : '❌ NO'}`);

    // Check existing project completion notifications
    console.log('\n🔍 Checking Existing Project Completion Notifications:');
    
    const notificationsDir = path.join(process.cwd(), 'data/notifications/events/2025/August/26/project_completed');
    let existingNotifications = [];
    
    try {
      const notificationFiles = await fs.readdir(notificationsDir);
      existingNotifications = notificationFiles.filter(f => f.includes('C-009'));
      
      if (existingNotifications.length > 0) {
        console.log(`   Found ${existingNotifications.length} existing notifications:`);
        for (const file of existingNotifications) {
          console.log(`   - ${file}`);
        }
      } else {
        console.log('   ❌ No project completion notifications found for C-009');
      }
    } catch (error) {
      console.log('   ❌ No project completion notifications directory found');
    }

    // Check rating prompt notifications
    console.log('\n🔍 Checking Rating Prompt Notifications:');
    
    const ratingDir = path.join(process.cwd(), 'data/notifications/events/2025/August/26/rating_prompt_commissioner');
    let existingRatingNotifications = [];
    
    try {
      const ratingFiles = await fs.readdir(ratingDir);
      existingRatingNotifications = ratingFiles.filter(f => f.includes('C-009'));
      
      if (existingRatingNotifications.length > 0) {
        console.log(`   Found ${existingRatingNotifications.length} existing rating notifications:`);
        for (const file of existingRatingNotifications) {
          console.log(`   - ${file}`);
        }
      } else {
        console.log('   ❌ No rating prompt notifications found for C-009');
      }
    } catch (error) {
      console.log('   ❌ No rating prompt notifications directory found');
    }

    // Test manual trigger if project is complete but notifications don't exist
    if (isProjectComplete && existingNotifications.length === 0) {
      console.log('\n🚀 Project is complete but no notifications exist. Testing manual trigger...');
      
      // Call the completion detection API
      const response = await fetch('http://localhost:3001/api/test-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'C-009',
          action: 'test_completion'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Manual trigger response:', result);
      } else {
        console.log('❌ Manual trigger failed:', response.status);
      }
    }

    console.log('\n🎉 Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testProjectCompletion();

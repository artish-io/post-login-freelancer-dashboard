#!/usr/bin/env node

/**
 * Test script to verify multiple task submissions from the same project work correctly
 */

const fs = require('fs').promises;
const path = require('path');

console.log('🧪 Testing Multiple Task Submissions from Project 326\n');

// Helper function to read task data
async function readTask(projectId, taskId) {
  const basePath = path.join(process.cwd(), 'data', 'project-tasks');
  
  // Search for the task file
  const years = await fs.readdir(basePath);
  for (const year of years) {
    const yearPath = path.join(basePath, year);
    const months = await fs.readdir(yearPath);
    for (const month of months) {
      const monthPath = path.join(yearPath, month);
      const days = await fs.readdir(monthPath);
      for (const day of days) {
        const dayPath = path.join(monthPath, day);
        const projectPath = path.join(dayPath, projectId.toString());
        
        try {
          const taskFiles = await fs.readdir(projectPath);
          const taskFileName = `${taskId}-task.json`;
          
          if (taskFiles.includes(taskFileName)) {
            const taskPath = path.join(projectPath, taskFileName);
            const taskData = JSON.parse(await fs.readFile(taskPath, 'utf-8'));
            return { taskData, taskPath };
          }
        } catch {
          // Project directory doesn't exist for this date, continue
        }
      }
    }
  }
  return null;
}

// Helper function to simulate task submission
async function simulateTaskSubmission(projectId, taskId, submissionLink) {
  const taskInfo = await readTask(projectId, taskId);
  if (!taskInfo) {
    console.log(`   ❌ Task ${taskId} not found`);
    return false;
  }
  
  const { taskData, taskPath } = taskInfo;
  
  // Create backup
  const backupPath = taskPath + '.backup';
  await fs.copyFile(taskPath, backupPath);
  
  try {
    // Simulate submission
    const updatedTask = {
      ...taskData,
      status: 'In review',
      submittedDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      link: submissionLink,
      version: (taskData.version || 0) + 1
    };
    
    // Write updated task
    await fs.writeFile(taskPath, JSON.stringify(updatedTask, null, 2));
    console.log(`   ✅ Submitted task ${taskId}: "${taskData.title}"`);
    console.log(`      Status: ${taskData.status} → In review`);
    console.log(`      Link: ${submissionLink}`);
    console.log(`      Version: ${taskData.version || 0} → ${updatedTask.version}`);
    
    return { original: taskData, updated: updatedTask, backupPath };
  } catch (error) {
    // Restore backup on error
    await fs.copyFile(backupPath, taskPath);
    await fs.unlink(backupPath);
    console.log(`   ❌ Failed to submit task ${taskId}: ${error.message}`);
    return false;
  }
}

// Helper function to restore task from backup
async function restoreTask(projectId, taskId, backupPath) {
  const taskInfo = await readTask(projectId, taskId);
  if (taskInfo && backupPath) {
    await fs.copyFile(backupPath, taskInfo.taskPath);
    await fs.unlink(backupPath);
    console.log(`   🔄 Restored task ${taskId} from backup`);
  }
}

// Test 1: Check initial state of all tasks in project 326
async function checkInitialState() {
  console.log('1. 📋 Checking initial state of project 326 tasks...');
  
  const projectTasks = [];
  for (const taskId of [305, 306, 307, 308]) {
    const taskInfo = await readTask(326, taskId);
    if (taskInfo) {
      projectTasks.push({
        taskId,
        title: taskInfo.taskData.title,
        status: taskInfo.taskData.status,
        completed: taskInfo.taskData.completed,
        submittedDate: taskInfo.taskData.submittedDate,
        version: taskInfo.taskData.version || 0
      });
      console.log(`   📄 Task ${taskId}: "${taskInfo.taskData.title}" (Status: ${taskInfo.taskData.status})`);
    } else {
      console.log(`   ❌ Task ${taskId}: Not found`);
    }
  }
  
  return projectTasks;
}

// Test 2: Submit multiple tasks sequentially
async function testSequentialSubmissions() {
  console.log('\n2. 🚀 Testing sequential task submissions...');
  
  const submissions = [];
  const tasksToSubmit = [
    { taskId: 305, link: 'https://submission-305-v1.com' },
    { taskId: 306, link: 'https://submission-306-v1.com' },
    { taskId: 307, link: 'https://submission-307-v1.com' }
  ];
  
  for (const { taskId, link } of tasksToSubmit) {
    console.log(`\n   📤 Submitting task ${taskId}...`);
    const result = await simulateTaskSubmission(326, taskId, link);
    if (result) {
      submissions.push({ taskId, result });
      
      // Wait a moment to simulate real-world timing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if other tasks are still intact
      console.log(`   🔍 Checking other tasks after submitting ${taskId}...`);
      for (const otherTaskId of [305, 306, 307, 308]) {
        if (otherTaskId !== taskId) {
          const otherTask = await readTask(326, otherTaskId);
          if (otherTask) {
            const expectedStatus = submissions.find(s => s.taskId === otherTaskId) ? 'In review' : 'Ongoing';
            if (otherTask.taskData.status === expectedStatus) {
              console.log(`      ✅ Task ${otherTaskId} status preserved: ${otherTask.taskData.status}`);
            } else {
              console.log(`      ⚠️  Task ${otherTaskId} status changed unexpectedly: ${otherTask.taskData.status} (expected: ${expectedStatus})`);
            }
          }
        }
      }
    }
  }
  
  return submissions;
}

// Test 3: Verify all submissions are preserved
async function verifyAllSubmissions(submissions) {
  console.log('\n3. 🔍 Verifying all submissions are preserved...');
  
  let allPreserved = true;
  
  for (const { taskId } of submissions) {
    const taskInfo = await readTask(326, taskId);
    if (taskInfo && taskInfo.taskData.status === 'In review') {
      console.log(`   ✅ Task ${taskId} still in review: "${taskInfo.taskData.title}"`);
      console.log(`      Submitted: ${taskInfo.taskData.submittedDate}`);
      console.log(`      Link: ${taskInfo.taskData.link}`);
    } else {
      console.log(`   ❌ Task ${taskId} submission lost!`);
      allPreserved = false;
    }
  }
  
  return allPreserved;
}

// Test 4: Cleanup - restore all tasks to original state
async function cleanup(submissions) {
  console.log('\n4. 🧹 Cleaning up - restoring original task states...');
  
  for (const { taskId, result } of submissions) {
    if (result && result.backupPath) {
      await restoreTask(326, taskId, result.backupPath);
    }
  }
  
  console.log('   ✅ All tasks restored to original state');
}

// Main test function
async function runTests() {
  try {
    const initialTasks = await checkInitialState();
    
    if (initialTasks.length === 0) {
      console.log('\n❌ No tasks found in project 326. Cannot run tests.');
      return;
    }
    
    const submissions = await testSequentialSubmissions();
    
    if (submissions.length === 0) {
      console.log('\n❌ No successful submissions. Test failed.');
      return;
    }
    
    const allPreserved = await verifyAllSubmissions(submissions);
    
    await cleanup(submissions);
    
    console.log('\n📊 Test Summary:');
    console.log(`   - Initial tasks found: ${initialTasks.length}`);
    console.log(`   - Successful submissions: ${submissions.length}`);
    console.log(`   - All submissions preserved: ${allPreserved ? '✅ YES' : '❌ NO'}`);
    
    if (allPreserved && submissions.length > 0) {
      console.log('\n🎉 Multiple task submission test PASSED!');
      console.log('   Multiple tasks from the same project can be submitted without interference.');
    } else {
      console.log('\n⚠️  Multiple task submission test FAILED!');
      console.log('   Tasks are interfering with each other during submission.');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
}

runTests();

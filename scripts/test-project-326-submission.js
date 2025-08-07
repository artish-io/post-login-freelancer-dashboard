#!/usr/bin/env node

/**
 * Test script to debug project 326 task submission issues
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Project 326 Task Submission\n');

// Test 1: Check current state of project 326 tasks
function checkProject326Tasks() {
  console.log('1. 📁 Checking current state of project 326 tasks...');
  
  const project326Path = path.join(process.cwd(), 'data', 'project-tasks', '2025', '08', '05', '326');
  
  if (!fs.existsSync(project326Path)) {
    console.log('   ❌ Project 326 directory not found');
    return [];
  }
  
  const taskFiles = fs.readdirSync(project326Path).filter(file => file.endsWith('-task.json'));
  const tasks = [];
  
  console.log(`   📋 Found ${taskFiles.length} task files:`);
  
  taskFiles.forEach(file => {
    const taskPath = path.join(project326Path, file);
    const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
    
    tasks.push(taskData);
    console.log(`      - Task ${taskData.taskId}: "${taskData.title}"`);
    console.log(`        Status: ${taskData.status}, Completed: ${taskData.completed}`);
    console.log(`        Last Modified: ${taskData.lastModified}`);
    console.log(`        Submitted Date: ${taskData.submittedDate || 'N/A'}`);
  });
  
  return tasks;
}

// Test 2: Simulate API call to submit task 305
async function testTaskSubmission() {
  console.log('\n2. 🌐 Testing task submission API for task 305...');
  
  const submissionData = {
    projectId: 326,
    taskId: 305,
    action: 'submit',
    referenceUrl: 'https://test-submission-link.com'
  };
  
  try {
    const response = await fetch('http://localhost:3001/api/project-tasks/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData)
    });
    
    const result = await response.json();
    
    console.log(`   📡 API Response Status: ${response.status}`);
    console.log(`   📄 Response Body:`, result);
    
    if (response.ok) {
      console.log('   ✅ API call successful');
      return true;
    } else {
      console.log('   ❌ API call failed');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ API call error: ${error.message}`);
    return false;
  }
}

// Test 3: Check if task was updated after submission
function checkTaskAfterSubmission() {
  console.log('\n3. 🔍 Checking task 305 after submission...');
  
  const taskPath = path.join(process.cwd(), 'data', 'project-tasks', '2025', '08', '05', '326', '305-task.json');
  
  if (!fs.existsSync(taskPath)) {
    console.log('   ❌ Task 305 file not found');
    return null;
  }
  
  const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  
  console.log(`   📋 Task 305 current state:`);
  console.log(`      Status: ${taskData.status}`);
  console.log(`      Completed: ${taskData.completed}`);
  console.log(`      Last Modified: ${taskData.lastModified}`);
  console.log(`      Submitted Date: ${taskData.submittedDate || 'N/A'}`);
  console.log(`      Link: ${taskData.link || 'N/A'}`);
  
  return taskData;
}

// Test 4: Check hierarchical storage lookup
async function testHierarchicalLookup() {
  console.log('\n4. 🔍 Testing hierarchical storage lookup for task 305...');
  
  try {
    // Simulate the readProjectTasks function
    const response = await fetch('http://localhost:3001/api/project-tasks/326');
    
    if (!response.ok) {
      console.log(`   ❌ Failed to fetch project 326 tasks: ${response.status}`);
      return [];
    }
    
    const tasks = await response.json();
    console.log(`   📋 Found ${tasks.length} tasks via API:`);
    
    tasks.forEach(task => {
      console.log(`      - Task ${task.taskId}: "${task.title}" (Status: ${task.status})`);
    });
    
    const task305 = tasks.find(t => t.taskId === 305);
    if (task305) {
      console.log(`   🎯 Task 305 found via API:`, {
        status: task305.status,
        completed: task305.completed,
        lastModified: task305.lastModified
      });
    } else {
      console.log('   ❌ Task 305 not found via API');
    }
    
    return tasks;
  } catch (error) {
    console.log(`   ❌ Error testing hierarchical lookup: ${error.message}`);
    return [];
  }
}

// Main test function
async function runTests() {
  const initialTasks = checkProject326Tasks();
  const task305Initial = initialTasks.find(t => t.taskId === 305);
  
  if (!task305Initial) {
    console.log('\n❌ Task 305 not found, cannot proceed with tests');
    return;
  }
  
  console.log(`\n📊 Initial state of task 305: ${task305Initial.status}`);
  
  // Test API lookup first
  await testHierarchicalLookup();
  
  // Test submission
  const submissionSuccess = await testTaskSubmission();
  
  if (submissionSuccess) {
    // Wait a moment for file write
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if task was updated
    const updatedTask = checkTaskAfterSubmission();
    
    if (updatedTask && updatedTask.status === 'In review') {
      console.log('\n🎉 Task submission test PASSED!');
      console.log('   Task 305 successfully updated to "In review" status');
    } else {
      console.log('\n⚠️  Task submission test FAILED!');
      console.log('   Task 305 was not updated to "In review" status');
    }
    
    // Test API lookup after submission
    console.log('\n5. 🔍 Re-checking hierarchical storage after submission...');
    await testHierarchicalLookup();
  } else {
    console.log('\n❌ Cannot test file update because API submission failed');
  }
}

// Run the tests
runTests().catch(console.error);

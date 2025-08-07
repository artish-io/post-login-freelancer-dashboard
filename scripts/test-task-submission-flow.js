#!/usr/bin/env node

/**
 * Test script to verify the task submission flow works correctly
 * Tests: project-tracking submission → task appears in review column → commissioner sees task
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Task Submission Flow\n');

// Test 1: Check if hierarchical storage has tasks with "In review" status
function testHierarchicalStorageTasks() {
  console.log('1. 📁 Checking hierarchical storage for tasks in review...');
  
  const basePath = path.join(process.cwd(), 'data', 'project-tasks');
  let reviewTasks = [];
  
  try {
    // Walk through hierarchical structure
    const years = fs.readdirSync(basePath).filter(item => 
      fs.statSync(path.join(basePath, item)).isDirectory()
    );
    
    for (const year of years) {
      const yearPath = path.join(basePath, year);
      const months = fs.readdirSync(yearPath).filter(item => 
        fs.statSync(path.join(yearPath, item)).isDirectory()
      );
      
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const days = fs.readdirSync(monthPath).filter(item => 
          fs.statSync(path.join(monthPath, item)).isDirectory()
        );
        
        for (const day of days) {
          const dayPath = path.join(yearPath, month, day);
          const projects = fs.readdirSync(dayPath).filter(item => 
            fs.statSync(path.join(dayPath, item)).isDirectory()
          );
          
          for (const projectId of projects) {
            const projectPath = path.join(dayPath, projectId);
            const taskFiles = fs.readdirSync(projectPath).filter(file => 
              file.endsWith('-task.json')
            );
            
            for (const taskFile of taskFiles) {
              const taskPath = path.join(projectPath, taskFile);
              const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
              
              if (taskData.status === 'In review' && !taskData.completed) {
                reviewTasks.push({
                  taskId: taskData.taskId,
                  projectId: taskData.projectId,
                  title: taskData.title,
                  status: taskData.status,
                  completed: taskData.completed,
                  submittedDate: taskData.submittedDate,
                  filePath: taskPath
                });
              }
            }
          }
        }
      }
    }
    
    console.log(`   ✅ Found ${reviewTasks.length} tasks in review status:`);
    reviewTasks.forEach(task => {
      console.log(`      - Task ${task.taskId}: "${task.title}" (Project ${task.projectId})`);
      console.log(`        Status: ${task.status}, Completed: ${task.completed}`);
      console.log(`        Submitted: ${task.submittedDate || 'N/A'}`);
    });
    
    return reviewTasks;
  } catch (error) {
    console.log(`   ❌ Error reading hierarchical storage: ${error.message}`);
    return [];
  }
}

// Test 2: Check if API endpoints return the correct data
async function testAPIEndpoints() {
  console.log('\n2. 🌐 Testing API endpoints...');
  
  try {
    // Test project-tasks API
    const response = await fetch('http://localhost:3001/api/project-tasks');
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const projectsData = await response.json();
    let reviewTasksFromAPI = [];
    
    projectsData.forEach(project => {
      if (project.tasks) {
        project.tasks.forEach(task => {
          if (task.status === 'In review' && !task.completed) {
            reviewTasksFromAPI.push({
              taskId: task.id,
              projectId: project.projectId,
              title: task.title,
              status: task.status,
              completed: task.completed
            });
          }
        });
      }
    });
    
    console.log(`   ✅ API returned ${reviewTasksFromAPI.length} tasks in review:`);
    reviewTasksFromAPI.forEach(task => {
      console.log(`      - Task ${task.taskId}: "${task.title}" (Project ${task.projectId})`);
    });
    
    return reviewTasksFromAPI;
  } catch (error) {
    console.log(`   ❌ Error testing API: ${error.message}`);
    return [];
  }
}

// Test 3: Check data consistency
function testDataConsistency(hierarchicalTasks, apiTasks) {
  console.log('\n3. 🔍 Testing data consistency...');
  
  const hierarchicalIds = new Set(hierarchicalTasks.map(t => `${t.projectId}-${t.taskId}`));
  const apiIds = new Set(apiTasks.map(t => `${t.projectId}-${t.taskId}`));
  
  const onlyInHierarchical = [...hierarchicalIds].filter(id => !apiIds.has(id));
  const onlyInAPI = [...apiIds].filter(id => !hierarchicalIds.has(id));
  
  if (onlyInHierarchical.length === 0 && onlyInAPI.length === 0) {
    console.log('   ✅ Data is consistent between hierarchical storage and API');
  } else {
    console.log('   ⚠️  Data inconsistency detected:');
    if (onlyInHierarchical.length > 0) {
      console.log(`      - Only in hierarchical storage: ${onlyInHierarchical.join(', ')}`);
    }
    if (onlyInAPI.length > 0) {
      console.log(`      - Only in API response: ${onlyInAPI.join(', ')}`);
    }
  }
  
  return onlyInHierarchical.length === 0 && onlyInAPI.length === 0;
}

// Main test function
async function runTests() {
  const hierarchicalTasks = testHierarchicalStorageTasks();
  const apiTasks = await testAPIEndpoints();
  const isConsistent = testDataConsistency(hierarchicalTasks, apiTasks);
  
  console.log('\n📊 Test Summary:');
  console.log(`   - Hierarchical storage tasks: ${hierarchicalTasks.length}`);
  console.log(`   - API response tasks: ${apiTasks.length}`);
  console.log(`   - Data consistency: ${isConsistent ? '✅ PASS' : '❌ FAIL'}`);
  
  if (hierarchicalTasks.length > 0 && apiTasks.length > 0 && isConsistent) {
    console.log('\n🎉 Task submission flow appears to be working correctly!');
    console.log('   Tasks are properly stored and accessible via API.');
  } else {
    console.log('\n⚠️  Issues detected in task submission flow.');
    console.log('   Check the logs above for specific problems.');
  }
}

// Run the tests
runTests().catch(console.error);

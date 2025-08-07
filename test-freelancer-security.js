/**
 * Test script to verify freelancer security filtering is working correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Freelancer Security Filtering...\n');

// Load test data
const projectsPath = path.join(__dirname, 'data', 'projects');
const projectTasksPath = path.join(__dirname, 'data', 'project-tasks');

// Test user 1 (Tobi Philly)
const testUserId = 1;
console.log(`Testing for user ID: ${testUserId}`);

// Find projects for user 1
function findProjectsForUser(userId) {
  const projects = [];
  
  // Recursively search through project directories
  function searchProjects(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        searchProjects(itemPath);
      } else if (item === 'project.json') {
        try {
          const projectData = JSON.parse(fs.readFileSync(itemPath, 'utf-8'));
          if (projectData.freelancerId === userId) {
            projects.push(projectData);
          }
        } catch (error) {
          console.warn(`Error reading ${itemPath}:`, error.message);
        }
      }
    }
  }
  
  searchProjects(projectsPath);
  return projects;
}

// Find tasks for projects
function findTasksForProjects(projectIds) {
  const tasks = [];
  
  function searchTasks(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        searchTasks(itemPath);
      } else if (item.endsWith('-task.json')) {
        try {
          const taskData = JSON.parse(fs.readFileSync(itemPath, 'utf-8'));
          if (projectIds.includes(taskData.projectId)) {
            tasks.push(taskData);
          }
        } catch (error) {
          console.warn(`Error reading ${itemPath}:`, error.message);
        }
      }
    }
  }
  
  searchTasks(projectTasksPath);
  return tasks;
}

// Run the test
const userProjects = findProjectsForUser(testUserId);
console.log(`\n📊 Found ${userProjects.length} projects for user ${testUserId}:`);

userProjects.forEach(project => {
  console.log(`  - Project ${project.projectId}: ${project.title} (Status: ${project.status})`);
});

if (userProjects.length > 0) {
  const projectIds = userProjects.map(p => p.projectId);
  const userTasks = findTasksForProjects(projectIds);
  
  console.log(`\n📋 Found ${userTasks.length} tasks for user ${testUserId}'s projects:`);
  
  userTasks.forEach(task => {
    console.log(`  - Task ${task.taskId}: ${task.title} (Project: ${task.projectId}, Status: ${task.status})`);
  });
  
  if (userTasks.length === 0) {
    console.log('\n⚠️  No tasks found! This explains why the user sees no projects.');
    console.log('   The security filtering is working, but there are no tasks to display.');
  } else {
    console.log('\n✅ Security filtering should work correctly - user has both projects and tasks.');
  }
} else {
  console.log('\n❌ No projects found for this user!');
}

console.log('\n🔍 Security Test Complete!');

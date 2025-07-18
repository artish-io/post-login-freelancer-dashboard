/**
 * Audit and fix data inconsistencies in projects.json and project-tasks.json
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Auditing Data Inconsistencies...\n');
console.log('=' .repeat(70));

// Load data files
const projectsPath = path.join(__dirname, '..', 'data', 'projects.json');
const projectTasksPath = path.join(__dirname, '..', 'data', 'project-tasks.json');

const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
const projectTasks = JSON.parse(fs.readFileSync(projectTasksPath, 'utf-8'));

console.log('📊 Data Loaded:');
console.log(`   • Projects: ${projects.length}`);
console.log(`   • Project Tasks: ${projectTasks.length}`);

// Audit for user 31
const userId = 31;
const freelancerProjects = projects.filter(p => p.freelancerId === userId);
const freelancerProjectIds = freelancerProjects.map(p => p.projectId);
const freelancerTaskProjects = projectTasks.filter(pt => freelancerProjectIds.includes(pt.projectId));

console.log(`\n👤 User ${userId} Projects: ${freelancerProjects.length}`);

console.log('\n🚨 DATA INCONSISTENCIES FOUND:');

let inconsistencies = [];

freelancerTaskProjects.forEach(taskProject => {
  const project = freelancerProjects.find(p => p.projectId === taskProject.projectId);
  
  console.log(`\n📋 Project ${taskProject.projectId}: "${taskProject.title}"`);
  console.log(`   Project Status: ${project.status}`);
  
  let completedTasks = 0;
  let approvedTasks = 0;
  let totalTasks = taskProject.tasks.length;
  let logicalErrors = [];
  
  taskProject.tasks.forEach((task, index) => {
    console.log(`   Task ${task.id}: "${task.title}"`);
    console.log(`     Status: ${task.status}, Completed: ${task.completed}, Rejected: ${task.rejected}`);
    
    // Check for logical impossibilities
    if (task.completed && task.rejected) {
      logicalErrors.push(`Task ${task.id}: Cannot be both completed AND rejected`);
    }
    
    if (task.status === 'Approved' && !task.completed) {
      logicalErrors.push(`Task ${task.id}: Status 'Approved' but completed=false`);
    }
    
    if (task.completed && task.status === 'Ongoing') {
      logicalErrors.push(`Task ${task.id}: Completed but status still 'Ongoing'`);
    }
    
    // Count completion states
    if (task.completed) completedTasks++;
    if (task.status === 'Approved') approvedTasks++;
  });
  
  console.log(`   Completion: ${completedTasks}/${totalTasks} completed, ${approvedTasks}/${totalTasks} approved`);
  
  // Check project-level inconsistencies
  if (approvedTasks === totalTasks && project.status !== 'Completed') {
    logicalErrors.push(`Project ${project.projectId}: All tasks approved but project status is '${project.status}'`);
  }
  
  if (logicalErrors.length > 0) {
    console.log(`   ❌ LOGICAL ERRORS:`);
    logicalErrors.forEach(error => console.log(`     • ${error}`));
    inconsistencies.push({
      projectId: taskProject.projectId,
      title: taskProject.title,
      errors: logicalErrors,
      completedTasks,
      approvedTasks,
      totalTasks,
      currentProjectStatus: project.status
    });
  } else {
    console.log(`   ✅ No logical errors found`);
  }
});

console.log('\n📊 SUMMARY OF ISSUES:');
console.log(`   Total projects audited: ${freelancerTaskProjects.length}`);
console.log(`   Projects with inconsistencies: ${inconsistencies.length}`);

if (inconsistencies.length > 0) {
  console.log('\n🔧 RECOMMENDED FIXES:');
  
  inconsistencies.forEach(issue => {
    console.log(`\n📋 Project ${issue.projectId}: "${issue.title}"`);
    console.log(`   Current Status: ${issue.currentProjectStatus}`);
    console.log(`   Completion: ${issue.completedTasks}/${issue.totalTasks} completed, ${issue.approvedTasks}/${issue.totalTasks} approved`);
    
    // Recommend project status
    let recommendedStatus;
    if (issue.approvedTasks === issue.totalTasks) {
      recommendedStatus = 'Completed';
    } else if (issue.completedTasks > 0) {
      recommendedStatus = 'Active';
    } else {
      recommendedStatus = 'Ongoing';
    }
    
    console.log(`   Recommended Project Status: ${recommendedStatus}`);
    console.log(`   Issues to fix:`);
    issue.errors.forEach(error => console.log(`     • ${error}`));
  });
}

console.log('\n🎯 STATS CALCULATION ISSUES:');

// Check today's tasks calculation
const today = new Date();
const todayStr = today.toISOString().split('T')[0];

let actualTasksToday = 0;
let tasksWithDifferentStatuses = [];

freelancerTaskProjects.forEach(project => {
  project.tasks.forEach(task => {
    const taskDueDate = new Date(task.dueDate);
    const taskDueDateStr = taskDueDate.toISOString().split('T')[0];
    
    if (taskDueDateStr === todayStr && !task.completed) {
      actualTasksToday++;
      tasksWithDifferentStatuses.push({
        id: task.id,
        title: task.title,
        status: task.status,
        completed: task.completed,
        projectId: project.projectId
      });
    }
  });
});

console.log(`\n📅 Tasks Due Today Analysis:`);
console.log(`   Total tasks due today (incomplete): ${actualTasksToday}`);
console.log(`   Current stats API filter: status === 'Ongoing'`);

if (tasksWithDifferentStatuses.length > 0) {
  console.log(`   Tasks due today by status:`);
  const statusCounts = {};
  tasksWithDifferentStatuses.forEach(task => {
    statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
  });
  
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`     • ${status}: ${count} tasks`);
  });
  
  console.log(`\n   🚨 ISSUE: Stats API only counts 'Ongoing' tasks`);
  console.log(`   📝 SOLUTION: Update stats calculation to include relevant statuses`);
}

console.log('\n' + '=' .repeat(70));

/**
 * Comprehensive audit of data/projects.json and data/project-tasks.json
 * Find all logical impossibilities and status inconsistencies
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive Data Audit...\n');
console.log('=' .repeat(70));

// Load data files
const projectsPath = path.join(__dirname, '..', 'data', 'projects.json');
const projectTasksPath = path.join(__dirname, '..', 'data', 'project-tasks.json');

const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
const projectTasks = JSON.parse(fs.readFileSync(projectTasksPath, 'utf-8'));

console.log('📊 Data Loaded:');
console.log(`   • Projects: ${projects.length}`);
console.log(`   • Project Tasks: ${projectTasks.length}`);

console.log('\n🚨 LOGICAL IMPOSSIBILITIES AUDIT:');

let allIssues = [];
let statusCounts = {};

projects.forEach(project => {
  statusCounts[project.status] = (statusCounts[project.status] || 0) + 1;
});

console.log('\n📊 Current Status Distribution:');
Object.entries(statusCounts).forEach(([status, count]) => {
  console.log(`   • ${status}: ${count} projects`);
});

console.log('\n🔍 PROJECT-BY-PROJECT ANALYSIS:');

projectTasks.forEach(taskProject => {
  const project = projects.find(p => p.projectId === taskProject.projectId);
  
  if (!project) {
    console.log(`❌ ORPHANED TASKS: Project ${taskProject.projectId} has tasks but no project entry`);
    return;
  }

  console.log(`\n📋 Project ${taskProject.projectId}: "${taskProject.title}"`);
  console.log(`   Project Status: ${project.status}`);
  console.log(`   Freelancer ID: ${project.freelancerId}`);
  
  let totalTasks = taskProject.tasks.length;
  let completedTasks = 0;
  let approvedTasks = 0;
  let rejectedTasks = 0;
  let ongoingTasks = 0;
  let inReviewTasks = 0;
  
  let taskIssues = [];
  
  taskProject.tasks.forEach((task, index) => {
    console.log(`   Task ${task.id}: "${task.title}"`);
    console.log(`     Status: ${task.status}, Completed: ${task.completed}, Rejected: ${task.rejected || false}`);
    
    // Count task states
    if (task.completed) completedTasks++;
    if (task.status === 'Approved') approvedTasks++;
    if (task.status === 'Rejected' || task.rejected) rejectedTasks++;
    if (task.status === 'Ongoing') ongoingTasks++;
    if (task.status === 'In review') inReviewTasks++;
    
    // Check for logical impossibilities
    if (task.completed && task.rejected) {
      taskIssues.push(`Task ${task.id}: Cannot be both completed AND rejected`);
    }
    
    if (task.status === 'Approved' && !task.completed) {
      taskIssues.push(`Task ${task.id}: Status 'Approved' but completed=false`);
    }
    
    if (task.completed && task.status === 'Ongoing') {
      taskIssues.push(`Task ${task.id}: Completed but status still 'Ongoing'`);
    }
    
    if (task.status === 'Rejected' && task.completed) {
      taskIssues.push(`Task ${task.id}: Status 'Rejected' but completed=true`);
    }
    
    if (task.rejected && task.status !== 'Rejected') {
      taskIssues.push(`Task ${task.id}: rejected=true but status is '${task.status}'`);
    }
  });
  
  console.log(`   Task Summary: ${completedTasks}/${totalTasks} completed, ${approvedTasks}/${totalTasks} approved`);
  console.log(`   Breakdown: ${approvedTasks} approved, ${rejectedTasks} rejected, ${ongoingTasks} ongoing, ${inReviewTasks} in review`);
  
  // Determine correct project status
  let correctStatus;
  if (approvedTasks === totalTasks) {
    correctStatus = 'Completed';
  } else if (project.status === 'Paused') {
    correctStatus = 'Paused'; // Keep paused status if explicitly set
  } else {
    correctStatus = 'Ongoing';
  }
  
  // Check project-level inconsistencies
  let projectIssues = [];
  
  if (approvedTasks === totalTasks && project.status !== 'Completed') {
    projectIssues.push(`All tasks approved but project status is '${project.status}' (should be 'Completed')`);
  }
  
  if (approvedTasks < totalTasks && project.status === 'Completed') {
    projectIssues.push(`Project marked 'Completed' but only ${approvedTasks}/${totalTasks} tasks approved`);
  }
  
  if (project.status === 'Active') {
    projectIssues.push(`Status 'Active' should be simplified to 'Ongoing'`);
  }
  
  if (project.status === 'At risk') {
    projectIssues.push(`Status 'At risk' should be simplified to 'Ongoing'`);
  }
  
  // Report issues
  if (taskIssues.length > 0 || projectIssues.length > 0) {
    console.log(`   ❌ ISSUES FOUND:`);
    taskIssues.forEach(issue => console.log(`     • ${issue}`));
    projectIssues.forEach(issue => console.log(`     • ${issue}`));
    
    allIssues.push({
      projectId: taskProject.projectId,
      title: taskProject.title,
      currentStatus: project.status,
      correctStatus,
      taskIssues,
      projectIssues,
      totalTasks,
      completedTasks,
      approvedTasks,
      rejectedTasks
    });
  } else {
    console.log(`   ✅ No issues found`);
  }
});

console.log('\n📊 AUDIT SUMMARY:');
console.log(`   Total projects: ${projectTasks.length}`);
console.log(`   Projects with issues: ${allIssues.length}`);

if (allIssues.length > 0) {
  console.log('\n🔧 RECOMMENDED FIXES:');
  
  allIssues.forEach(issue => {
    console.log(`\n📋 Project ${issue.projectId}: "${issue.title}"`);
    console.log(`   Current Status: ${issue.currentStatus} → Recommended: ${issue.correctStatus}`);
    
    if (issue.taskIssues.length > 0) {
      console.log(`   Task Issues:`);
      issue.taskIssues.forEach(taskIssue => console.log(`     • ${taskIssue}`));
    }
    
    if (issue.projectIssues.length > 0) {
      console.log(`   Project Issues:`);
      issue.projectIssues.forEach(projectIssue => console.log(`     • ${projectIssue}`));
    }
  });
  
  console.log('\n🎯 SIMPLIFIED STATUS SYSTEM:');
  console.log('   ONGOING: Projects with incomplete tasks');
  console.log('   PAUSED: Projects temporarily halted');
  console.log('   COMPLETED: Projects with all tasks approved');
  console.log('   ');
  console.log('   ELIMINATE: "Active", "At risk", "Delayed" (confusing, unnecessary)');
  
} else {
  console.log('\n✅ No issues found! Data is consistent.');
}

console.log('\n' + '=' .repeat(70));

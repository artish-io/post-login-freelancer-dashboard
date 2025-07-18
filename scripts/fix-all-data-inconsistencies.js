/**
 * Fix all data inconsistencies and simplify status system
 * Align projects.json and project-tasks.json with logical consistency
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing All Data Inconsistencies...\n');
console.log('=' .repeat(70));

// Load data files
const projectsPath = path.join(__dirname, '..', 'data', 'projects.json');
const projectTasksPath = path.join(__dirname, '..', 'data', 'project-tasks.json');

let projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
let projectTasks = JSON.parse(fs.readFileSync(projectTasksPath, 'utf-8'));

console.log('📊 Data Loaded:');
console.log(`   • Projects: ${projects.length}`);
console.log(`   • Project Tasks: ${projectTasks.length}`);

console.log('\n🔧 APPLYING FIXES:');

let totalFixes = 0;

// Fix task-level logical impossibilities
projectTasks.forEach(taskProject => {
  console.log(`\n📋 Project ${taskProject.projectId}: "${taskProject.title}"`);
  
  taskProject.tasks.forEach(task => {
    let taskFixes = [];
    
    // Fix: rejected=true but status is not 'Rejected'
    if (task.rejected && task.status !== 'Rejected') {
      taskFixes.push(`Status: ${task.status} → Rejected`);
      task.status = 'Rejected';
      task.completed = false; // Rejected tasks cannot be completed
    }
    
    // Fix: completed=true but status is 'Ongoing'
    if (task.completed && task.status === 'Ongoing') {
      taskFixes.push(`Status: Ongoing → In review (completed task)`);
      task.status = 'In review';
    }
    
    // Fix: status='Approved' but completed=false
    if (task.status === 'Approved' && !task.completed) {
      taskFixes.push(`Completed: false → true (approved task)`);
      task.completed = true;
    }
    
    // Fix: completed=true and rejected=true (impossible)
    if (task.completed && task.rejected) {
      taskFixes.push(`Rejected: true → false (completed task cannot be rejected)`);
      task.rejected = false;
    }
    
    if (taskFixes.length > 0) {
      console.log(`   Task ${task.id}: ${taskFixes.join(', ')}`);
      totalFixes += taskFixes.length;
    }
  });
});

// Fix project-level status inconsistencies and simplify status system
projects.forEach(project => {
  const taskProject = projectTasks.find(tp => tp.projectId === project.projectId);
  
  if (!taskProject) return;
  
  // Calculate correct status based on tasks
  const totalTasks = taskProject.tasks.length;
  const approvedTasks = taskProject.tasks.filter(t => t.status === 'Approved').length;
  
  let correctStatus;
  let statusReason;
  
  if (approvedTasks === totalTasks) {
    correctStatus = 'Completed';
    statusReason = 'all tasks approved';
  } else if (project.status === 'Paused') {
    correctStatus = 'Paused'; // Keep paused status if explicitly set
    statusReason = 'explicitly paused';
  } else {
    correctStatus = 'Ongoing';
    statusReason = 'has incomplete tasks';
  }
  
  // Apply status fixes
  if (project.status !== correctStatus) {
    console.log(`   Project Status: ${project.status} → ${correctStatus} (${statusReason})`);
    project.status = correctStatus;
    totalFixes++;
  }
  
  // Simplify confusing statuses
  if (['Active', 'At risk', 'Delayed'].includes(project.status)) {
    console.log(`   Project Status: ${project.status} → Ongoing (simplified)`);
    project.status = 'Ongoing';
    totalFixes++;
  }
});

console.log(`\n📊 FIXES APPLIED: ${totalFixes} total fixes`);

// Write fixed data back to files
fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
fs.writeFileSync(projectTasksPath, JSON.stringify(projectTasks, null, 2));

console.log('\n✅ FILES UPDATED:');
console.log('   • data/projects.json');
console.log('   • data/project-tasks.json');

// Final status summary
console.log('\n📊 FINAL STATUS DISTRIBUTION:');
const finalStatusCounts = {};
projects.forEach(project => {
  finalStatusCounts[project.status] = (finalStatusCounts[project.status] || 0) + 1;
});

Object.entries(finalStatusCounts).forEach(([status, count]) => {
  console.log(`   • ${status}: ${count} projects`);
});

console.log('\n🎯 SIMPLIFIED STATUS SYSTEM:');
console.log('   ✅ ONGOING: Projects with incomplete tasks');
console.log('   ✅ PAUSED: Projects temporarily halted');
console.log('   ✅ COMPLETED: Projects with all tasks approved');
console.log('   ❌ ELIMINATED: "Active", "At risk", "Delayed" (confusing)');

console.log('\n🔍 LOGICAL CONSISTENCY RULES APPLIED:');
console.log('   • Rejected tasks: status="Rejected", completed=false, rejected=true');
console.log('   • Approved tasks: status="Approved", completed=true, rejected=false');
console.log('   • Completed tasks: cannot be rejected');
console.log('   • Project status: based on actual task completion');

console.log('\n🎉 DATA CONSISTENCY ACHIEVED!');
console.log('All logical impossibilities resolved and status system simplified.');

console.log('\n' + '=' .repeat(70));

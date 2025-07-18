/**
 * Script to run auto-completion for all projects that need status updates
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Running Auto-Completion for Projects...\n');
console.log('=' .repeat(70));

// Load data files
const projectsPath = path.join(__dirname, '..', 'data', 'projects.json');
const projectTasksPath = path.join(__dirname, '..', 'data', 'project-tasks.json');

const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
const projectTasks = JSON.parse(fs.readFileSync(projectTasksPath, 'utf-8'));

console.log('📊 Data Loaded:');
console.log(`   • Projects: ${projects.length}`);
console.log(`   • Project Tasks: ${projectTasks.length}`);

console.log('\n🔍 Checking for Projects Needing Auto-Completion...');

const updates = [];

projectTasks.forEach(taskProject => {
  const project = projects.find(p => p.projectId === taskProject.projectId);
  
  if (project) {
    const approvedTasks = taskProject.tasks.filter(t => t.status === 'Approved').length;
    const totalTasks = taskProject.tasks.length;
    const allTasksApproved = approvedTasks === totalTasks;
    const hasApprovedTasks = approvedTasks > 0;

    let newStatus = project.status;
    let shouldUpdate = false;

    if (allTasksApproved && project.status !== 'Completed') {
      newStatus = 'Completed';
      shouldUpdate = true;
    } else if (hasApprovedTasks && project.status === 'Ongoing') {
      newStatus = 'Active';
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      updates.push({
        projectId: project.projectId,
        title: project.title,
        oldStatus: project.status,
        newStatus,
        approvedTasks,
        totalTasks,
        reason: allTasksApproved ? 'All tasks approved' : 'Has approved tasks'
      });
    }
  }
});

console.log(`\n📋 Projects Needing Updates: ${updates.length}`);

if (updates.length === 0) {
  console.log('✅ No projects need status updates. All data is consistent!');
} else {
  console.log('\n🔧 Applying Auto-Completion Updates:');
  
  updates.forEach(update => {
    console.log(`\n📋 Project ${update.projectId}: "${update.title}"`);
    console.log(`   Status: ${update.oldStatus} → ${update.newStatus}`);
    console.log(`   Tasks: ${update.approvedTasks}/${update.totalTasks} approved`);
    console.log(`   Reason: ${update.reason}`);
    
    // Update the project status in the data
    const projectIndex = projects.findIndex(p => p.projectId === update.projectId);
    if (projectIndex !== -1) {
      projects[projectIndex].status = update.newStatus;
    }
  });
  
  // Write updated projects back to file
  fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
  
  console.log(`\n✅ Auto-Completion Complete!`);
  console.log(`   Updated ${updates.length} project(s)`);
  console.log(`   Data consistency restored`);
}

console.log('\n📊 Final Status Summary:');

const statusCounts = {};
projects.forEach(project => {
  statusCounts[project.status] = (statusCounts[project.status] || 0) + 1;
});

Object.entries(statusCounts).forEach(([status, count]) => {
  console.log(`   • ${status}: ${count} projects`);
});

console.log('\n🎯 Impact on User 31:');

// Check user 31 specifically
const user31Projects = projects.filter(p => p.freelancerId === 31);
const user31Updates = updates.filter(u => user31Projects.some(p => p.projectId === u.projectId));

console.log(`   Total projects: ${user31Projects.length}`);
console.log(`   Projects updated: ${user31Updates.length}`);

if (user31Updates.length > 0) {
  console.log(`   Updated projects:`);
  user31Updates.forEach(update => {
    console.log(`     • ${update.title}: ${update.oldStatus} → ${update.newStatus}`);
  });
}

console.log('\n🔄 Next Steps:');
console.log('   1. Refresh the freelancer dashboard');
console.log('   2. Check project stats for accurate counts');
console.log('   3. Verify progress rings show correct percentages');
console.log('   4. Confirm "Tasks for Today" count is accurate');

console.log('\n' + '=' .repeat(70));

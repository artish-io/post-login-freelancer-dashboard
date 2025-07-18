/**
 * Test script to verify dashboard stats calculation from universal source files
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing dashboard stats calculation...\n');

// Load universal source files
const projectsPath = path.join(__dirname, '..', 'data', 'projects.json');
const projectTasksPath = path.join(__dirname, '..', 'data', 'project-tasks.json');

const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
const projectTasks = JSON.parse(fs.readFileSync(projectTasksPath, 'utf-8'));

// Test with user ID 31 (Margsate Flether)
const freelancerId = 31;

console.log(`📊 Calculating stats for freelancer ID: ${freelancerId}\n`);

// Get projects for this freelancer
const freelancerProjects = projects.filter(p => p.freelancerId === freelancerId);
console.log(`📁 Found ${freelancerProjects.length} projects for freelancer ${freelancerId}:`);
freelancerProjects.forEach(p => {
  console.log(`   • ${p.title} (${p.status})`);
});

// Get ongoing projects
const ongoingProjects = freelancerProjects.filter(p => 
  ['Active', 'Ongoing', 'Delayed'].includes(p.status)
).length;

console.log(`\n🔄 Ongoing projects: ${ongoingProjects}`);

// Get all tasks for freelancer's projects
const freelancerProjectIds = freelancerProjects.map(p => p.projectId);
const freelancerTaskProjects = projectTasks.filter(pt => 
  freelancerProjectIds.includes(pt.projectId)
);

let tasksToday = 0;
let upcomingDeadlines = 0;
let overdueDeadlines = 0;
let totalTasks = 0;

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

console.log(`\n📅 Today: ${todayStr}`);
console.log(`📅 Three days from now: ${threeDaysFromNow.toISOString().split('T')[0]}`);

freelancerTaskProjects.forEach(project => {
  console.log(`\n📋 Project: ${project.title}`);
  project.tasks.forEach(task => {
    totalTasks++;
    const taskDueDate = new Date(task.dueDate);
    const taskDueDateStr = taskDueDate.toISOString().split('T')[0];

    console.log(`   • ${task.title} (${task.status}, due: ${taskDueDateStr}, completed: ${task.completed})`);

    // Tasks for today (due today and not completed)
    if (taskDueDateStr === todayStr && !task.completed && task.status === 'Ongoing') {
      tasksToday++;
      console.log(`     → Counts as task for today`);
    }

    // Upcoming deadlines (due within 3 days and not completed)
    if (taskDueDate <= threeDaysFromNow && !task.completed && task.status === 'Ongoing') {
      upcomingDeadlines++;
      console.log(`     → Counts as upcoming deadline`);
    }

    // Overdue deadlines (past due and not completed)
    if (taskDueDate < today && !task.completed && task.status === 'Ongoing') {
      overdueDeadlines++;
      console.log(`     → Counts as overdue deadline`);
    }
  });
});

const stats = {
  tasksToday,
  ongoingProjects,
  upcomingDeadlines,
  overdueDeadlines,
  totalTasks
};

console.log('\n📊 CALCULATED STATS:');
console.log('=' .repeat(40));
console.log(`Tasks for today: ${stats.tasksToday}`);
console.log(`Ongoing projects: ${stats.ongoingProjects}`);
console.log(`Upcoming deadlines: ${stats.upcomingDeadlines}`);
console.log(`Overdue deadlines: ${stats.overdueDeadlines}`);
console.log(`Total tasks: ${stats.totalTasks}`);

console.log('\n✅ Dashboard stats calculation test completed!');
console.log('These stats should match what the API returns for user ID 31.');

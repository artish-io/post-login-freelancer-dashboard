/**
 * Script to update all project due dates to August 2025
 * and adjust task distribution for better column balance
 */

const fs = require('fs');
const path = require('path');

// Read the data files
const projectsPath = path.join(__dirname, '..', 'data', 'projects.json');
const projectTasksPath = path.join(__dirname, '..', 'data', 'project-tasks.json');

const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
const projectTasks = JSON.parse(fs.readFileSync(projectTasksPath, 'utf-8'));

console.log('📅 Updating project dates to August 2025...\n');

// Function to generate random date in August 2025
function getRandomAugust2025Date() {
  const year = 2025;
  const month = 7; // August (0-indexed)
  const day = Math.floor(Math.random() * 31) + 1; // 1-31
  return new Date(year, month, day).toISOString().split('T')[0];
}

// Function to generate task due dates in August 2025
function getTaskDueDate(baseDate, taskIndex) {
  const base = new Date(baseDate);
  // Spread tasks throughout August, with some variation
  const dayOffset = Math.floor(Math.random() * 20) + taskIndex * 2;
  const taskDate = new Date(base);
  taskDate.setDate(base.getDate() + dayOffset);
  
  // Ensure we stay in August 2025
  if (taskDate.getMonth() !== 7 || taskDate.getFullYear() !== 2025) {
    taskDate.setFullYear(2025, 7, Math.floor(Math.random() * 31) + 1);
  }
  
  return taskDate.toISOString();
}

// Update projects.json due dates
let updatedProjects = 0;
projects.forEach(project => {
  const oldDate = project.dueDate;
  project.dueDate = getRandomAugust2025Date();
  console.log(`✅ Project ${project.projectId}: ${oldDate} → ${project.dueDate}`);
  updatedProjects++;
});

// Update project-tasks.json due dates and adjust task statuses for better distribution
let updatedTasks = 0;
let projectsInTodo = 0;

projectTasks.forEach((project, projectIndex) => {
  const baseDate = getRandomAugust2025Date();
  
  // Only first 2 projects should have tasks in "todo" column (Ongoing status)
  // Others should be in upcoming (also Ongoing) or review (In review)
  const shouldBeInTodo = projectIndex < 2;
  
  project.tasks.forEach((task, taskIndex) => {
    // Update due date
    const oldDate = task.dueDate;
    task.dueDate = getTaskDueDate(baseDate, taskIndex);
    
    // Adjust task status for better column distribution
    if (shouldBeInTodo) {
      // First 2 projects: mix of Ongoing (todo), In review, and some Approved
      if (taskIndex === 0) {
        task.status = 'Ongoing';
        task.completed = false;
      } else if (taskIndex === 1) {
        task.status = 'In review';
        task.completed = true;
      } else {
        task.status = Math.random() > 0.5 ? 'Approved' : 'Ongoing';
        task.completed = task.status === 'Approved';
      }
      
      if (task.status === 'Ongoing') {
        projectsInTodo++;
      }
    } else {
      // Other projects: mostly Ongoing (upcoming) with some in review
      if (Math.random() > 0.7) {
        task.status = 'In review';
        task.completed = true;
      } else {
        task.status = 'Ongoing';
        task.completed = false;
      }
    }
    
    console.log(`  📋 Task ${task.id}: ${oldDate.split('T')[0]} → ${task.dueDate.split('T')[0]} (${task.status})`);
    updatedTasks++;
  });
  
  console.log(`✅ Project ${project.projectId} (${project.title}): ${shouldBeInTodo ? 'TODO/REVIEW' : 'UPCOMING/REVIEW'}`);
});

// Write updated data back to files
fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
fs.writeFileSync(projectTasksPath, JSON.stringify(projectTasks, null, 2));

console.log('\n🎉 Update Summary:');
console.log(`   📅 Updated ${updatedProjects} project due dates to August 2025`);
console.log(`   📋 Updated ${updatedTasks} task due dates to August 2025`);
console.log(`   🎯 Configured first 2 projects for TODO column`);
console.log(`   📚 Configured remaining projects for UPCOMING column`);
console.log(`   ✅ Task distribution optimized for better column balance`);

console.log('\n📊 Expected Column Distribution:');
console.log('   📝 TODO: Tasks from first 2 projects (max 3 tasks)');
console.log('   📅 UPCOMING: Tasks from remaining projects + overflow');
console.log('   👀 REVIEW: Tasks with "In review" status from all projects');

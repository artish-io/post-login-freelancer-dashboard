/**
 * Script to fix remaining task dates that weren't updated to August 2025
 */

const fs = require('fs');
const path = require('path');

// Read the data files
const projectTasksPath = path.join(__dirname, '..', 'data', 'project-tasks.json');
const projectTasks = JSON.parse(fs.readFileSync(projectTasksPath, 'utf-8'));

console.log('🔧 Fixing remaining task dates to August 2025...\n');

// Function to generate random date in August 2025
function getRandomAugust2025Date() {
  const year = 2025;
  const month = 7; // August (0-indexed)
  const day = Math.floor(Math.random() * 31) + 1; // 1-31
  return new Date(year, month, day).toISOString();
}

let updatedTasks = 0;
let totalTasks = 0;

projectTasks.forEach((project, projectIndex) => {
  console.log(`📁 Project ${project.projectId} (${project.title}):`);
  
  project.tasks.forEach((task, taskIndex) => {
    totalTasks++;
    const currentDate = new Date(task.dueDate);
    const isAugust2025 = currentDate.getFullYear() === 2025 && currentDate.getMonth() === 7;
    
    if (!isAugust2025) {
      const oldDate = task.dueDate;
      task.dueDate = getRandomAugust2025Date();
      console.log(`   ✅ Task ${task.id}: ${oldDate.split('T')[0]} → ${task.dueDate.split('T')[0]}`);
      updatedTasks++;
    } else {
      console.log(`   ✓ Task ${task.id}: ${task.dueDate.split('T')[0]} (already August 2025)`);
    }
  });
  
  console.log('');
});

// Write updated data back to file
fs.writeFileSync(projectTasksPath, JSON.stringify(projectTasks, null, 2));

console.log('🎉 Task Date Update Summary:');
console.log(`   📅 Updated ${updatedTasks} task dates to August 2025`);
console.log(`   ✅ ${totalTasks - updatedTasks} tasks were already in August 2025`);
console.log(`   📊 Total tasks processed: ${totalTasks}`);

if (updatedTasks > 0) {
  console.log('\n🔄 All task dates are now aligned with August 2025!');
} else {
  console.log('\n✅ All task dates were already in August 2025!');
}

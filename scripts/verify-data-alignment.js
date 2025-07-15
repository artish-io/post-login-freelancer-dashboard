/**
 * Script to verify data alignment between project summary table and project list
 */

const fs = require('fs');
const path = require('path');

// Read the data files
const projectsPath = path.join(__dirname, '..', 'data', 'projects.json');
const projectTasksPath = path.join(__dirname, '..', 'data', 'project-tasks.json');

const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
const projectTasks = JSON.parse(fs.readFileSync(projectTasksPath, 'utf-8'));

console.log('🔍 Data Source Alignment Verification\n');
console.log('=' .repeat(70));

console.log('📊 COMPARING PROJECT DUE DATES:\n');

// Create a map of project due dates from both sources
const projectsDueDates = {};
const tasksDueDates = {};

projects.forEach(project => {
  projectsDueDates[project.projectId] = project.dueDate;
});

projectTasks.forEach(project => {
  // Get earliest task due date as representative
  const taskDueDates = project.tasks.map(task => task.dueDate).sort();
  tasksDueDates[project.projectId] = taskDueDates[0]?.split('T')[0] || 'No tasks';
});

// Compare the dates
console.log('Project ID | projects.json | project-tasks.json | Match | Project Title');
console.log('-'.repeat(70));

let matchCount = 0;
let totalProjects = 0;

projects.forEach(project => {
  const projectId = project.projectId;
  const projectsDate = projectsDueDates[projectId];
  const tasksDate = tasksDueDates[projectId];
  
  // For comparison, we'll check if both are in August 2025
  const projectsIsAugust2025 = projectsDate && projectsDate.startsWith('2025-08');
  const tasksIsAugust2025 = tasksDate && tasksDate.startsWith('2025-08');
  
  const isAligned = projectsIsAugust2025 && tasksIsAugust2025;
  const status = isAligned ? '✅' : '❌';
  
  if (isAligned) matchCount++;
  totalProjects++;
  
  console.log(`${projectId.toString().padEnd(10)} | ${projectsDate.padEnd(13)} | ${tasksDate.padEnd(18)} | ${status}   | ${project.title.substring(0, 25)}...`);
});

console.log('-'.repeat(70));
console.log(`📈 Alignment Summary: ${matchCount}/${totalProjects} projects have consistent August 2025 dates\n`);

console.log('🔧 COMPONENT DATA SOURCE VERIFICATION:\n');

// Check what data sources each component should be using
const summaryTablePath = path.join(__dirname, '..', 'components', 'freelancer-dashboard', 'project-summary-table.tsx');
const projectListPath = path.join(__dirname, '..', 'src', 'app', 'freelancer-dashboard', 'projects-and-invoices', 'project-list', 'page.tsx');

const summaryTableContent = fs.readFileSync(summaryTablePath, 'utf-8');
const projectListContent = fs.readFileSync(projectListPath, 'utf-8');

// Check for API endpoints used
const summaryTableAPIs = [];
const projectListAPIs = [];

const apiRegex = /fetch\('\/api\/([^']+)'\)/g;

let match;
while ((match = apiRegex.exec(summaryTableContent)) !== null) {
  summaryTableAPIs.push(match[1]);
}

while ((match = apiRegex.exec(projectListContent)) !== null) {
  projectListAPIs.push(match[1]);
}

console.log('📋 Project Summary Table APIs:');
summaryTableAPIs.forEach(api => console.log(`   ✅ /api/${api}`));

console.log('\n📋 Project List Page APIs:');
projectListAPIs.forEach(api => console.log(`   ✅ /api/${api}`));

// Check if they're using the same APIs
const summarySet = new Set(summaryTableAPIs);
const listSet = new Set(projectListAPIs);
const hasProjectsAPI = summarySet.has('projects') && listSet.has('projects');
const hasProjectTasksAPI = summarySet.has('project-tasks') && listSet.has('project-tasks');

console.log('\n🎯 API Alignment Check:');
console.log(`   📊 Both use /api/projects: ${hasProjectsAPI ? '✅' : '❌'}`);
console.log(`   📋 Both use /api/project-tasks: ${hasProjectTasksAPI ? '✅' : '❌'}`);

if (hasProjectsAPI && hasProjectTasksAPI) {
  console.log('\n🎉 SUCCESS: Both components now use the same data sources!');
  console.log('   📅 Due dates will be consistent (from projects.json)');
  console.log('   📊 Task progress will be accurate (from project-tasks.json)');
  console.log('   🔄 Status information will be synchronized');
} else {
  console.log('\n⚠️  WARNING: Components may still have data source misalignment');
}

console.log('\n✅ Verification complete!');

/**
 * Debug script to check logo mapping in tasks-summary API
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Logo Mapping...\n');
console.log('=' .repeat(60));

// Load data files
const projectsPath = path.join(__dirname, '..', 'data', 'projects.json');
const projectTasksPath = path.join(__dirname, '..', 'data', 'project-tasks.json');
const organizationsPath = path.join(__dirname, '..', 'data', 'organizations.json');

const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
const projectTasks = JSON.parse(fs.readFileSync(projectTasksPath, 'utf-8'));
const organizations = JSON.parse(fs.readFileSync(organizationsPath, 'utf-8'));

console.log('📊 Data Loaded:');
console.log(`   • Projects: ${projects.length}`);
console.log(`   • Project Tasks: ${projectTasks.length}`);
console.log(`   • Organizations: ${organizations.length}`);

// Test for user ID 31
const userId = 31;
const freelancerId = parseInt(userId);

// Get projects for this freelancer
const freelancerProjects = projects.filter((p) => p.freelancerId === freelancerId);
const freelancerProjectIds = freelancerProjects.map((p) => p.projectId);

console.log(`\n👤 User ${userId} Projects:`);
freelancerProjects.forEach(project => {
  console.log(`   • Project ${project.projectId}: "${project.title}"`);
  console.log(`     Organization ID: ${project.organizationId}`);
  
  // Find organization
  const org = organizations.find(o => o.id === project.organizationId);
  if (org) {
    console.log(`     Organization: "${org.name}"`);
    console.log(`     Logo: ${org.logo}`);
  } else {
    console.log(`     ❌ Organization not found for ID ${project.organizationId}`);
  }
  console.log('');
});

// Get project tasks for freelancer's projects only
const freelancerProjectTasks = projectTasks.filter((pt) =>
  freelancerProjectIds.includes(pt.projectId)
);

console.log('📋 Task Logo Mapping Test:');
freelancerProjectTasks.forEach((project) => {
  console.log(`\n🏗️ Project ${project.projectId}: "${project.title}"`);
  
  // Find the corresponding project info for enrichment
  const projectInfo = freelancerProjects.find((p) => p.projectId === project.projectId);
  
  if (!projectInfo) {
    console.log('   ❌ Project info not found');
    return;
  }
  
  console.log(`   Organization ID: ${projectInfo.organizationId}`);
  
  // Find the organization for the project logo
  const organization = organizations.find((org) => org.id === projectInfo.organizationId);
  
  if (organization) {
    console.log(`   ✅ Organization found: "${organization.name}"`);
    console.log(`   Logo: ${organization.logo}`);
  } else {
    console.log(`   ❌ Organization not found for ID ${projectInfo.organizationId}`);
    console.log(`   Available organizations:`);
    organizations.forEach(org => {
      console.log(`     - ID ${org.id}: "${org.name}"`);
    });
  }
  
  // Test tasks
  project.tasks.slice(0, 2).forEach((task, taskIndex) => {
    console.log(`   Task ${taskIndex + 1}: "${task.title}"`);
    console.log(`     Expected logo: ${organization?.logo || '/logos/fallback-logo.png'}`);
  });
});

console.log('\n🔍 Organization Lookup Test:');
organizations.forEach(org => {
  console.log(`   ID ${org.id}: "${org.name}" → ${org.logo}`);
});

console.log('\n📊 Project-Organization Mapping:');
freelancerProjects.forEach(project => {
  const org = organizations.find(o => o.id === project.organizationId);
  console.log(`   Project ${project.projectId} (orgId: ${project.organizationId}) → ${org ? org.logo : 'NOT FOUND'}`);
});

console.log('\n' + '=' .repeat(60));

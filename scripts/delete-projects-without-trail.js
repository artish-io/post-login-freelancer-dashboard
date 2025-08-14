#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import the audit function to identify projects without trail
const { auditProjectMonetaryValues } = require('./audit-project-monetary-values');

// Helper function to delete directory recursively
async function deleteDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          await deleteDirectory(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      
      fs.rmdirSync(dirPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting directory ${dirPath}:`, error.message);
    return false;
  }
}

// Helper function to update projects index
function updateProjectsIndex(projectsToDelete) {
  const indexPath = 'data/projects/metadata/projects-index.json';
  
  try {
    if (fs.existsSync(indexPath)) {
      const indexData = fs.readFileSync(indexPath, 'utf8');
      const index = JSON.parse(indexData);
      
      // Remove deleted projects from index
      projectsToDelete.forEach(projectId => {
        delete index[projectId.toString()];
      });
      
      // Write updated index
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
      console.log(`✅ Updated projects index, removed ${projectsToDelete.length} entries`);
    }
  } catch (error) {
    console.error('Error updating projects index:', error.message);
  }
}

// Main deletion function
async function deleteProjectsWithoutTrail() {
  console.log('🔍 Running audit to identify projects without trail...\n');
  
  // Run audit to get projects without trail
  const auditResults = auditProjectMonetaryValues();
  
  if (auditResults.projectsWithoutTrail.length === 0) {
    console.log('✅ No projects without trail found. Nothing to delete.');
    return;
  }
  
  console.log(`\n🗑️  Found ${auditResults.projectsWithoutTrail.length} projects without valid trail to delete:`);
  
  const projectsToDelete = [];
  const deletionResults = {
    successful: [],
    failed: []
  };
  
  for (const project of auditResults.projectsWithoutTrail) {
    console.log(`\n📁 Deleting Project ${project.projectId}: ${project.title}`);
    console.log(`   Path: ${project.projectPath}`);
    
    // Extract project directory path
    const projectDir = path.dirname(project.projectPath);
    
    const deleted = await deleteDirectory(projectDir);
    
    if (deleted) {
      console.log(`   ✅ Successfully deleted`);
      deletionResults.successful.push(project.projectId);
      projectsToDelete.push(project.projectId);
    } else {
      console.log(`   ❌ Failed to delete`);
      deletionResults.failed.push(project.projectId);
    }
  }
  
  // Update projects index
  if (projectsToDelete.length > 0) {
    updateProjectsIndex(projectsToDelete);
  }
  
  // Summary
  console.log('\n📊 DELETION SUMMARY');
  console.log('===================');
  console.log(`Total projects identified: ${auditResults.projectsWithoutTrail.length}`);
  console.log(`Successfully deleted: ${deletionResults.successful.length}`);
  console.log(`Failed to delete: ${deletionResults.failed.length}`);
  
  if (deletionResults.successful.length > 0) {
    console.log('\n✅ Successfully deleted projects:');
    deletionResults.successful.forEach(id => console.log(`   - Project ${id}`));
  }
  
  if (deletionResults.failed.length > 0) {
    console.log('\n❌ Failed to delete projects:');
    deletionResults.failed.forEach(id => console.log(`   - Project ${id}`));
  }
  
  console.log('\n🎯 Clean dataset ready for gig-to-project-to-payment testing!');
  
  return deletionResults;
}

// Run the deletion if this script is executed directly
if (require.main === module) {
  deleteProjectsWithoutTrail()
    .then(() => {
      console.log('\n✨ Cleanup completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error during cleanup:', error);
      process.exit(1);
    });
}

module.exports = { deleteProjectsWithoutTrail };

/**
 * Backfill script to fix organization IDs in projects created from proposals
 * 
 * This script finds all projects that were created from proposals and ensures
 * they have the correct organization ID based on the commissioner's actual organization.
 */

const fs = require('fs').promises;
const path = require('path');

async function backfillProjectOrganizationIds() {
  try {
    console.log('🔧 Starting project organization ID backfill...');
    
    // Read all organizations
    const organizationsDir = path.join(process.cwd(), 'data', 'organizations');
    const organizations = [];
    
    // Get all organization directories
    const years = await fs.readdir(organizationsDir);
    for (const year of years) {
      if (!year.match(/^\d{4}$/)) continue;
      
      const yearDir = path.join(organizationsDir, year);
      const months = await fs.readdir(yearDir);
      
      for (const month of months) {
        const monthDir = path.join(yearDir, month);
        const days = await fs.readdir(monthDir);
        
        for (const day of days) {
          const dayDir = path.join(yearDir, month, day);
          const orgDirs = await fs.readdir(dayDir);
          
          for (const orgDir of orgDirs) {
            const profilePath = path.join(dayDir, orgDir, 'profile.json');
            try {
              const orgData = JSON.parse(await fs.readFile(profilePath, 'utf-8'));
              organizations.push(orgData);
            } catch (error) {
              console.log(`⚠️ Skipping ${profilePath}: ${error.message}`);
            }
          }
        }
      }
    }
    
    console.log(`📊 Found ${organizations.length} organizations`);
    
    // Read all projects
    const projectsDir = path.join(process.cwd(), 'data', 'projects');
    const projectYears = await fs.readdir(projectsDir);
    
    let fixedCount = 0;
    let totalCount = 0;
    
    for (const year of projectYears) {
      if (!year.match(/^\d{4}$/)) continue;
      
      const yearDir = path.join(projectsDir, year);
      const months = await fs.readdir(yearDir);
      
      for (const month of months) {
        const monthDir = path.join(yearDir, month);
        const days = await fs.readdir(monthDir);
        
        for (const day of days) {
          const dayDir = path.join(yearDir, month, day);
          const projectDirs = await fs.readdir(dayDir);
          
          for (const projectDir of projectDirs) {
            const projectPath = path.join(dayDir, projectDir, 'project.json');
            
            try {
              const projectData = JSON.parse(await fs.readFile(projectPath, 'utf-8'));
              totalCount++;
              
              // Only process projects that have a proposalId (created from proposals)
              if (!projectData.proposalId) {
                console.log(`⏭️ Skipping project ${projectData.projectId} - not created from proposal`);
                continue;
              }
              
              const commissionerId = projectData.commissionerId;
              if (!commissionerId) {
                console.log(`⚠️ Project ${projectData.projectId} has no commissionerId`);
                continue;
              }
              
              // Find the correct organization for this commissioner
              const correctOrg = organizations.find(org => 
                org.firstCommissionerId === commissionerId ||
                org.contactPersonId === commissionerId ||
                org.associatedCommissioners?.includes(commissionerId)
              );
              
              if (!correctOrg) {
                console.log(`⚠️ No organization found for commissioner ${commissionerId} in project ${projectData.projectId}`);
                continue;
              }
              
              // Check if organization ID needs to be updated
              if (projectData.organizationId !== correctOrg.id) {
                console.log(`🔍 Project ${projectData.projectId}:`);
                console.log(`  Commissioner: ${commissionerId}`);
                console.log(`  Current org ID: ${projectData.organizationId}`);
                console.log(`  Correct org ID: ${correctOrg.id} (${correctOrg.name})`);
                
                // Update the project
                projectData.organizationId = correctOrg.id;
                projectData.updatedAt = new Date().toISOString();
                
                // Write back the updated project
                await fs.writeFile(projectPath, JSON.stringify(projectData, null, 2));
                
                fixedCount++;
                console.log(`✅ Fixed project ${projectData.projectId} - updated organizationId to ${correctOrg.id}`);
              } else {
                console.log(`✓ Project ${projectData.projectId} already has correct organizationId: ${correctOrg.id}`);
              }
              
            } catch (error) {
              console.log(`⚠️ Skipping ${projectPath}: ${error.message}`);
            }
          }
        }
      }
    }
    
    console.log(`🎉 Backfill complete! Fixed ${fixedCount} out of ${totalCount} projects.`);
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillProjectOrganizationIds();

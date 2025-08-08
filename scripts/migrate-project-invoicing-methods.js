#!/usr/bin/env node

/**
 * Project Invoicing Method Migration Script
 * 
 * This script migrates existing projects to include the invoicingMethod field
 * based on intelligent defaults and project characteristics.
 */

const fs = require('fs').promises;
const path = require('path');

async function migrateProjectInvoicingMethods() {
  console.log('🔄 Migrating Project Invoicing Methods...\n');

  let projectsProcessed = 0;
  let projectsUpdated = 0;
  let errors = 0;

  async function processProjectsRecursively(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processProjectsRecursively(fullPath);
      } else if (entry.name === 'project.json') {
        try {
          const projectData = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
          projectsProcessed++;
          
          let needsUpdate = false;
          let updates = {};
          
          // Add invoicingMethod if missing
          if (!projectData.invoicingMethod) {
            // Intelligent default based on project characteristics
            let invoicingMethod = 'completion'; // Default
            
            // If project has multiple tasks (>1), likely milestone-based
            if (projectData.totalTasks && projectData.totalTasks > 1) {
              invoicingMethod = 'milestone';
            }
            
            // If project has executionMethod, use that
            if (projectData.executionMethod) {
              invoicingMethod = projectData.executionMethod;
            }
            
            updates.invoicingMethod = invoicingMethod;
            needsUpdate = true;
          }
          
          // Add budget structure if missing
          if (!projectData.budget) {
            let budget = {
              lower: 1000,
              upper: 5000,
              currency: 'USD'
            };
            
            // Use existing budget fields if available
            if (projectData.totalBudget) {
              budget.upper = projectData.totalBudget;
              budget.lower = Math.round(projectData.totalBudget * 0.8);
            }
            
            // Use upfront amount to estimate total budget
            if (projectData.upfrontAmount) {
              const estimatedTotal = Math.round(projectData.upfrontAmount / 0.12); // Reverse 12% upfront
              budget.upper = estimatedTotal;
              budget.lower = Math.round(estimatedTotal * 0.8);
            }
            
            updates.budget = budget;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            const updatedProject = { ...projectData, ...updates };
            await fs.writeFile(fullPath, JSON.stringify(updatedProject, null, 2));
            projectsUpdated++;
            
            console.log(`✅ Updated ${fullPath.replace(process.cwd(), '.')}`);
            console.log(`   - Invoicing Method: ${updates.invoicingMethod || 'already set'}`);
            console.log(`   - Budget: ${updates.budget ? `$${updates.budget.lower}-$${updates.budget.upper}` : 'already set'}`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${fullPath}:`, error.message);
          errors++;
        }
      }
    }
  }
  
  try {
    const projectsDir = path.join(process.cwd(), 'data/projects');
    await processProjectsRecursively(projectsDir);
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Projects processed: ${projectsProcessed}`);
    console.log(`   Projects updated: ${projectsUpdated}`);
    console.log(`   Errors: ${errors}`);
    
    if (errors === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with ${errors} errors`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
migrateProjectInvoicingMethods();

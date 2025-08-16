#!/usr/bin/env node

/**
 * Project-Gig Consistency Fixer
 * 
 * Automatically fixes common data consistency issues between projects, gigs, and gig requests.
 * Run with --dry-run to see what would be fixed without making changes.
 * 
 * Usage:
 *   node scripts/fix-project-gig-consistency.js [--dry-run] [--fix]
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldFix = args.includes('--fix');

if (!isDryRun && !shouldFix) {
  console.log('🔍 Running in analysis mode. Use --dry-run to see what would be fixed, or --fix to apply fixes.');
  console.log('');
}

async function main() {
  console.log('🛡️ Project-Gig Consistency Fixer');
  console.log('=====================================');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : shouldFix ? 'FIX' : 'ANALYSIS'}`);
  console.log('');

  try {
    // Load all data
    const projects = await loadAllProjects();
    const gigs = await loadAllGigs();
    const gigRequests = await loadAllGigRequests();
    const applications = await loadAllGigApplications();

    console.log(`📊 Loaded data:`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   Gigs: ${gigs.length}`);
    console.log(`   Gig Requests: ${gigRequests.length}`);
    console.log(`   Applications: ${applications.length}`);
    console.log('');

    let fixedCount = 0;
    let issuesFound = 0;

    // Fix 1: Available gigs with active projects
    const availableGigIssues = await fixAvailableGigsWithProjects(gigs, projects, shouldFix && !isDryRun);
    issuesFound += availableGigIssues.found;
    fixedCount += availableGigIssues.fixed;

    // Fix 2: Unavailable gigs without active projects
    const unavailableGigIssues = await fixUnavailableGigsWithoutProjects(gigs, projects, shouldFix && !isDryRun);
    issuesFound += unavailableGigIssues.found;
    fixedCount += unavailableGigIssues.fixed;

    // Fix 3: Accepted applications without projects (report only - requires manual intervention)
    const applicationIssues = await reportAcceptedApplicationsWithoutProjects(applications, projects);
    issuesFound += applicationIssues.found;

    // Summary
    console.log('');
    console.log('📋 SUMMARY');
    console.log('==========');
    console.log(`Issues found: ${issuesFound}`);
    
    if (shouldFix && !isDryRun) {
      console.log(`Issues fixed: ${fixedCount}`);
      console.log(`Manual intervention needed: ${issuesFound - fixedCount}`);
    } else if (isDryRun) {
      console.log(`Would fix: ${fixedCount}`);
      console.log(`Would require manual intervention: ${issuesFound - fixedCount}`);
    } else {
      console.log(`Can auto-fix: ${fixedCount}`);
      console.log(`Requires manual intervention: ${issuesFound - fixedCount}`);
    }

    if (issuesFound === 0) {
      console.log('✅ No consistency issues found - system is healthy!');
    } else if (shouldFix && !isDryRun && fixedCount > 0) {
      console.log(`✅ Fixed ${fixedCount} issues automatically`);
    }

  } catch (error) {
    console.error('❌ Error running consistency fixer:', error);
    process.exit(1);
  }
}

/**
 * Fix gigs marked as Available that have active projects
 */
async function fixAvailableGigsWithProjects(gigs, projects, shouldApplyFix) {
  console.log('🔍 Checking for Available gigs with active projects...');
  
  let found = 0;
  let fixed = 0;

  for (const gig of gigs) {
    if (gig.status === 'Available') {
      const relatedProjects = projects.filter(p => 
        p.gigId === gig.id && 
        (p.status === 'ongoing' || p.status === 'paused')
      );

      if (relatedProjects.length > 0) {
        found++;
        console.log(`   ⚠️ Gig ${gig.id}: "${gig.title}"`);
        console.log(`      Status: Available (should be Unavailable)`);
        console.log(`      Active projects: ${relatedProjects.map(p => p.projectId).join(', ')}`);

        if (shouldApplyFix) {
          try {
            gig.status = 'Unavailable';
            gig.lastModified = new Date().toISOString();
            gig.linkedProjectId = relatedProjects[0].projectId;
            
            await saveGig(gig);
            console.log(`      ✅ Fixed: Updated to Unavailable`);
            fixed++;
          } catch (error) {
            console.log(`      ❌ Failed to fix: ${error.message}`);
          }
        } else {
          console.log(`      💡 Fix: Update status to 'Unavailable'`);
          fixed++; // Count as fixable
        }
        console.log('');
      }
    }
  }

  if (found === 0) {
    console.log('   ✅ No issues found');
  }
  console.log('');

  return { found, fixed };
}

/**
 * Fix gigs marked as Unavailable that don't have active projects
 */
async function fixUnavailableGigsWithoutProjects(gigs, projects, shouldApplyFix) {
  console.log('🔍 Checking for Unavailable gigs without active projects...');
  
  let found = 0;
  let fixed = 0;

  for (const gig of gigs) {
    if (gig.status === 'Unavailable') {
      const relatedProjects = projects.filter(p => 
        p.gigId === gig.id && 
        (p.status === 'ongoing' || p.status === 'paused')
      );

      if (relatedProjects.length === 0) {
        // Check if there are completed projects
        const completedProjects = projects.filter(p => 
          p.gigId === gig.id && 
          p.status === 'completed'
        );

        found++;
        console.log(`   ⚠️ Gig ${gig.id}: "${gig.title}"`);
        console.log(`      Status: Unavailable (should be Available)`);
        console.log(`      Active projects: 0`);
        console.log(`      Completed projects: ${completedProjects.length}`);

        if (shouldApplyFix) {
          try {
            gig.status = 'Available';
            gig.lastModified = new Date().toISOString();
            delete gig.linkedProjectId;
            
            await saveGig(gig);
            console.log(`      ✅ Fixed: Updated to Available`);
            fixed++;
          } catch (error) {
            console.log(`      ❌ Failed to fix: ${error.message}`);
          }
        } else {
          console.log(`      💡 Fix: Update status to 'Available'`);
          fixed++; // Count as fixable
        }
        console.log('');
      }
    }
  }

  if (found === 0) {
    console.log('   ✅ No issues found');
  }
  console.log('');

  return { found, fixed };
}

/**
 * Report accepted applications without projects (requires manual intervention)
 */
async function reportAcceptedApplicationsWithoutProjects(applications, projects) {
  console.log('🔍 Checking for accepted applications without projects...');
  
  let found = 0;

  for (const application of applications) {
    if (application.status === 'accepted') {
      const relatedProjects = projects.filter(p => 
        p.gigId === application.gigId && 
        p.freelancerId === application.freelancerId &&
        (p.status === 'ongoing' || p.status === 'paused' || p.status === 'completed')
      );

      if (relatedProjects.length === 0) {
        found++;
        console.log(`   ⚠️ Application ${application.id} for gig ${application.gigId}`);
        console.log(`      Status: accepted`);
        console.log(`      Freelancer: ${application.freelancerId}`);
        console.log(`      ❗ MANUAL ACTION REQUIRED: Create project or revert application status`);
        console.log('');
      }
    }
  }

  if (found === 0) {
    console.log('   ✅ No issues found');
  }
  console.log('');

  return { found, fixed: 0 }; // These require manual intervention
}

// Helper functions for loading data
async function loadAllProjects() {
  const projects = [];
  const projectsDir = path.join(process.cwd(), 'data/projects');
  
  if (!fs.existsSync(projectsDir)) return projects;

  // Read from hierarchical structure
  const years = fs.readdirSync(projectsDir).filter(item => 
    fs.statSync(path.join(projectsDir, item)).isDirectory()
  );

  for (const year of years) {
    const yearPath = path.join(projectsDir, year);
    const months = fs.readdirSync(yearPath).filter(item => 
      fs.statSync(path.join(yearPath, item)).isDirectory()
    );

    for (const month of months) {
      const monthPath = path.join(yearPath, month);
      const days = fs.readdirSync(monthPath).filter(item => 
        fs.statSync(path.join(monthPath, item)).isDirectory()
      );

      for (const day of days) {
        const dayPath = path.join(monthPath, day);
        const projectDirs = fs.readdirSync(dayPath).filter(item => 
          fs.statSync(path.join(dayPath, item)).isDirectory()
        );

        for (const projectDir of projectDirs) {
          const projectFile = path.join(dayPath, projectDir, 'project.json');
          if (fs.existsSync(projectFile)) {
            try {
              const project = JSON.parse(fs.readFileSync(projectFile, 'utf-8'));
              projects.push(project);
            } catch (error) {
              console.warn(`Warning: Could not parse project file ${projectFile}`);
            }
          }
        }
      }
    }
  }

  return projects;
}

async function loadAllGigs() {
  const gigs = [];
  const gigsDir = path.join(process.cwd(), 'data/gigs');
  
  if (!fs.existsSync(gigsDir)) return gigs;

  // Read from hierarchical structure
  const years = fs.readdirSync(gigsDir).filter(item => 
    fs.statSync(path.join(gigsDir, item)).isDirectory()
  );

  for (const year of years) {
    const yearPath = path.join(gigsDir, year);
    const months = fs.readdirSync(yearPath).filter(item => 
      fs.statSync(path.join(yearPath, item)).isDirectory()
    );

    for (const month of months) {
      const monthPath = path.join(yearPath, month);
      const days = fs.readdirSync(monthPath).filter(item => 
        fs.statSync(path.join(monthPath, item)).isDirectory()
      );

      for (const day of days) {
        const dayPath = path.join(monthPath, day);
        const gigDirs = fs.readdirSync(dayPath).filter(item => 
          fs.statSync(path.join(dayPath, item)).isDirectory()
        );

        for (const gigDir of gigDirs) {
          const gigFile = path.join(dayPath, gigDir, 'gig.json');
          if (fs.existsSync(gigFile)) {
            try {
              const gig = JSON.parse(fs.readFileSync(gigFile, 'utf-8'));
              gig._filePath = gigFile; // Store file path for updates
              gigs.push(gig);
            } catch (error) {
              console.warn(`Warning: Could not parse gig file ${gigFile}`);
            }
          }
        }
      }
    }
  }

  return gigs;
}

async function loadAllGigRequests() {
  // Simplified - implement based on your gig request storage structure
  return [];
}

async function loadAllGigApplications() {
  // Simplified - implement based on your gig application storage structure
  return [];
}

async function saveGig(gig) {
  if (gig._filePath) {
    const { _filePath, ...gigData } = gig;
    fs.writeFileSync(_filePath, JSON.stringify(gigData, null, 2));
  } else {
    throw new Error('Gig file path not found');
  }
}

// Run the script
main().catch(console.error);

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Helper function to read JSON files safely
function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
    return null;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

// Helper function to find gig by project ID or other criteria
function findMatchingGig(project, gigsData) {
  // Try to find gig by project ID first
  const gigByProjectId = gigsData.find(gig => gig.projectId === project.projectId);
  if (gigByProjectId) return gigByProjectId;

  // Try to find by title match
  const gigByTitle = gigsData.find(gig =>
    gig.title && project.title &&
    gig.title.toLowerCase() === project.title.toLowerCase()
  );
  if (gigByTitle) return gigByTitle;

  // Try to find by description similarity (basic check)
  const gigByDescription = gigsData.find(gig =>
    gig.description && project.description &&
    gig.description.toLowerCase().includes(project.description.toLowerCase().substring(0, 50))
  );
  if (gigByDescription) return gigByDescription;

  return null;
}

// Helper function to find gig application trail
function findGigApplicationTrail(project, applicationsData, gigsData) {
  // Find applications for matching gig
  const matchingGig = findMatchingGig(project, gigsData);
  if (!matchingGig) return null;

  // Find applications for this gig that were accepted
  const acceptedApplications = applicationsData.filter(app =>
    app.gigId === matchingGig.id &&
    app.status === 'accepted' &&
    app.freelancerId === project.freelancerId
  );

  return acceptedApplications.length > 0 ? acceptedApplications[0] : null;
}

// Helper function to find gig request trail
function findGigRequestTrail(project, requestsData) {
  // Find requests that match this project
  const matchingRequests = requestsData.filter(req =>
    req.projectId === project.projectId ||
    (req.freelancerId === project.freelancerId &&
     req.commissionerId === project.commissionerId &&
     req.status === 'Accepted')
  );

  return matchingRequests.length > 0 ? matchingRequests[0] : null;
}

// Helper function to check if project has valid trail
function hasValidTrail(project, gigsData, applicationsData, requestsData) {
  // Check for gig + application trail
  const gigTrail = findGigApplicationTrail(project, applicationsData, gigsData);
  if (gigTrail) return { type: 'gig_application', trail: gigTrail };

  // Check for gig request trail
  const requestTrail = findGigRequestTrail(project, requestsData);
  if (requestTrail) return { type: 'gig_request', trail: requestTrail };

  // Check if project has gigId reference
  if (project.gigId) {
    const referencedGig = gigsData.find(gig => gig.id === project.gigId);
    if (referencedGig) return { type: 'gig_reference', trail: referencedGig };
  }

  return null;
}

// Load all gigs data by scanning the directory structure
function loadAllGigs() {
  const allGigs = [];

  // Scan the gigs directory structure
  const gigsBasePath = 'data/gigs';

  try {
    const years = fs.readdirSync(gigsBasePath).filter(item =>
      fs.statSync(path.join(gigsBasePath, item)).isDirectory() &&
      !isNaN(parseInt(item))
    );

    for (const year of years) {
      const yearPath = path.join(gigsBasePath, year);
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
          const gigIds = fs.readdirSync(dayPath).filter(item =>
            fs.statSync(path.join(dayPath, item)).isDirectory()
          );

          for (const gigId of gigIds) {
            const gigPath = path.join(dayPath, gigId, 'gig.json');
            const gig = readJsonFile(gigPath);

            if (gig) {
              gig.gigId = parseInt(gigId);
              gig.filePath = gigPath;
              allGigs.push(gig);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error scanning gigs directory:', error.message);
  }

  return allGigs;
}

// Load all projects by scanning directory structure
function loadAllProjects() {
  const allProjects = [];
  const projectsBasePath = 'data/projects';

  try {
    const years = fs.readdirSync(projectsBasePath).filter(item =>
      fs.statSync(path.join(projectsBasePath, item)).isDirectory() &&
      !isNaN(parseInt(item))
    );

    for (const year of years) {
      const yearPath = path.join(projectsBasePath, year);
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
          const projectIds = fs.readdirSync(dayPath).filter(item =>
            fs.statSync(path.join(dayPath, item)).isDirectory()
          );

          for (const projectId of projectIds) {
            const projectPath = path.join(dayPath, projectId, 'project.json');
            const project = readJsonFile(projectPath);

            if (project) {
              project.filePath = projectPath;
              allProjects.push(project);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error scanning projects directory:', error.message);
  }

  return allProjects;
}

// Load all gig applications
function loadAllGigApplications() {
  const allApplications = [];
  const applicationsBasePath = 'data/gigs/gig-applications';

  try {
    const years = fs.readdirSync(applicationsBasePath).filter(item =>
      fs.statSync(path.join(applicationsBasePath, item)).isDirectory() &&
      !isNaN(parseInt(item))
    );

    for (const year of years) {
      const yearPath = path.join(applicationsBasePath, year);
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
          const applicationFiles = fs.readdirSync(dayPath).filter(item =>
            item.endsWith('.json')
          );

          for (const appFile of applicationFiles) {
            const appPath = path.join(dayPath, appFile);
            const application = readJsonFile(appPath);

            if (application) {
              application.filePath = appPath;
              allApplications.push(application);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error scanning gig applications directory:', error.message);
  }

  return allApplications;
}

// Load all gig requests
function loadAllGigRequests() {
  const allRequests = [];
  const requestsBasePath = 'data/gigs/gig-requests';

  try {
    const years = fs.readdirSync(requestsBasePath).filter(item =>
      fs.statSync(path.join(requestsBasePath, item)).isDirectory() &&
      !isNaN(parseInt(item))
    );

    for (const year of years) {
      const yearPath = path.join(requestsBasePath, year);
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
          const requestFiles = fs.readdirSync(dayPath).filter(item =>
            item.endsWith('.json')
          );

          for (const reqFile of requestFiles) {
            const reqPath = path.join(dayPath, reqFile);
            const requestData = readJsonFile(reqPath);

            if (requestData) {
              if (Array.isArray(requestData)) {
                requestData.forEach(req => {
                  req.filePath = reqPath;
                  allRequests.push(req);
                });
              } else {
                requestData.filePath = reqPath;
                allRequests.push(requestData);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error scanning gig requests directory:', error.message);
  }

  return allRequests;
}

// Main audit function
function auditProjectMonetaryValues() {
  console.log('🔍 Starting Project Monetary Value Audit\n');

  const allProjects = loadAllProjects();
  const allGigs = loadAllGigs();
  const allApplications = loadAllGigApplications();
  const allRequests = loadAllGigRequests();

  console.log(`📊 Loaded ${allProjects.length} projects for analysis`);
  console.log(`📊 Loaded ${allGigs.length} gigs for comparison`);
  console.log(`📊 Loaded ${allApplications.length} gig applications`);
  console.log(`📊 Loaded ${allRequests.length} gig requests\n`);
  
  const auditResults = {
    totalProjects: allProjects.length,
    projectsWithBudget: 0,
    projectsWithoutBudget: 0,
    projectsWithMatchingGig: 0,
    projectsWithoutMatchingGig: 0,
    projectsWithGigButNoRate: 0,
    projectsWithBudgetAndGigRate: 0,
    budgetTypes: { range: 0, fixed: 0 },
    gigRateTypes: { hourly: 0, fixed: 0, budget: 0 },
    issues: [],
    projectsWithoutMonetaryValue: [],
    potentialTestProjects: [],
    projectsWithoutTrail: [],
    projectsWithTrail: [],
    trailTypes: { gig_application: 0, gig_request: 0, gig_reference: 0 }
  };

  for (const project of allProjects) {
    const projectId = project.projectId;

    // Check for valid trail (gig application, gig request, or gig reference)
    const trailCheck = hasValidTrail(project, allGigs, allApplications, allRequests);

    if (trailCheck) {
      auditResults.projectsWithTrail.push({
        projectId: projectId,
        title: project.title,
        trailType: trailCheck.type,
        trail: trailCheck.trail
      });
      auditResults.trailTypes[trailCheck.type]++;
    } else {
      auditResults.projectsWithoutTrail.push({
        projectId: projectId,
        title: project.title,
        description: project.description,
        status: project.status,
        freelancerId: project.freelancerId,
        commissionerId: project.commissionerId,
        projectPath: project.filePath,
        invoicingMethod: project.invoicingMethod,
        budget: project.budget,
        createdAt: project.createdAt
      });
    }
    
    // Check for budget in project
    const hasBudget = project.budget && 
                     (project.budget.lower || project.budget.upper || project.budget.fixed);
    
    if (hasBudget) {
      auditResults.projectsWithBudget++;

      // Categorize budget type
      if (project.budget.fixed) {
        auditResults.budgetTypes.fixed++;
      } else if (project.budget.lower || project.budget.upper) {
        auditResults.budgetTypes.range++;
      }
    } else {
      auditResults.projectsWithoutBudget++;
    }
    
    // Find matching gig
    const matchingGig = findMatchingGig(project, allGigs);
    
    if (matchingGig) {
      auditResults.projectsWithMatchingGig++;
      
      // Check if gig has rate information
      const hasGigRate = matchingGig.rate ||
                        matchingGig.hourlyRateMin ||
                        matchingGig.hourlyRateMax ||
                        matchingGig.fixedRate ||
                        (matchingGig.budget && (matchingGig.budget.lower || matchingGig.budget.upper || matchingGig.budget.fixed));
      
      if (hasGigRate && hasBudget) {
        auditResults.projectsWithBudgetAndGigRate++;

        // Categorize gig rate type
        if (matchingGig.hourlyRateMin || matchingGig.hourlyRateMax) {
          auditResults.gigRateTypes.hourly++;
        } else if (matchingGig.fixedRate) {
          auditResults.gigRateTypes.fixed++;
        } else if (matchingGig.budget) {
          auditResults.gigRateTypes.budget++;
        }
      } else if (!hasGigRate) {
        auditResults.projectsWithGigButNoRate++;
        auditResults.issues.push({
          projectId: projectId,
          issue: 'Has matching gig but gig has no rate information',
          projectPath: project.filePath,
          gigPath: matchingGig.filePath,
          severity: 'warning'
        });
      }
    } else {
      auditResults.projectsWithoutMatchingGig++;
    }
    
    // Identify projects with no monetary value at all
    const hasAnyMonetaryValue = hasBudget || (matchingGig && hasGigRate);

    if (!hasAnyMonetaryValue) {
      auditResults.projectsWithoutMonetaryValue.push({
        projectId: projectId,
        title: project.title,
        description: project.description,
        projectPath: project.filePath,
        gigPath: matchingGig?.filePath,
        invoicingMethod: project.invoicingMethod,
        status: project.status
      });
    }

    // Identify potential test projects based on patterns
    const testKeywords = ['test', 'demo', 'sample', 'example', 'prototype', 'mock'];
    const isLikelyTestProject = testKeywords.some(keyword =>
      project.title?.toLowerCase().includes(keyword) ||
      project.description?.toLowerCase().includes(keyword)
    ) ||
    (project.budget && project.budget.lower === 1000 && project.budget.upper === 5000) || // Common test budget range
    project.totalTasks <= 2; // Very simple projects

    if (isLikelyTestProject) {
      auditResults.potentialTestProjects.push({
        projectId: projectId,
        title: project.title,
        description: project.description?.substring(0, 100),
        budget: project.budget,
        totalTasks: project.totalTasks,
        status: project.status,
        reason: testKeywords.find(keyword =>
          project.title?.toLowerCase().includes(keyword) ||
          project.description?.toLowerCase().includes(keyword)
        ) ? 'Contains test keywords' :
        (project.budget && project.budget.lower === 1000 && project.budget.upper === 5000) ? 'Standard test budget range' :
        'Simple project (≤2 tasks)'
      });
    }

    if (!hasBudget && !matchingGig) {
      auditResults.issues.push({
        projectId: projectId,
        issue: 'No budget in project and no matching gig found',
        projectPath: project.filePath,
        severity: 'high',
        title: project.title,
        description: project.description?.substring(0, 100) + '...'
      });
    } else if (!hasBudget && matchingGig && !hasGigRate) {
      auditResults.issues.push({
        projectId: projectId,
        issue: 'No budget in project and matching gig has no rate',
        projectPath: project.filePath,
        gigPath: matchingGig.filePath,
        severity: 'high',
        title: project.title
      });
    } else if (!hasBudget) {
      auditResults.issues.push({
        projectId: projectId,
        issue: 'No budget in project (but has matching gig with rate)',
        projectPath: project.filePath,
        gigPath: matchingGig?.filePath,
        severity: 'medium',
        title: project.title
      });
    }
  }
  
  // Print summary
  console.log('📈 AUDIT SUMMARY');
  console.log('================');
  console.log(`Total Projects: ${auditResults.totalProjects}`);
  console.log(`Projects with Budget: ${auditResults.projectsWithBudget}`);
  console.log(`Projects without Budget: ${auditResults.projectsWithoutBudget}`);
  console.log(`Projects with Matching Gig: ${auditResults.projectsWithMatchingGig}`);
  console.log(`Projects without Matching Gig: ${auditResults.projectsWithoutMatchingGig}`);
  console.log(`Projects with Gig but No Rate: ${auditResults.projectsWithGigButNoRate}`);
  console.log(`Projects with Both Budget and Gig Rate: ${auditResults.projectsWithBudgetAndGigRate}`);
  console.log('');
  
  // Group issues by severity
  const issuesBySeverity = auditResults.issues.reduce((acc, issue) => {
    if (!acc[issue.severity]) acc[issue.severity] = [];
    acc[issue.severity].push(issue);
    return acc;
  }, {});
  
  // Print issues
  for (const [severity, issues] of Object.entries(issuesBySeverity)) {
    const emoji = severity === 'error' ? '❌' : severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '⚠️';
    console.log(`${emoji} ${severity.toUpperCase()} ISSUES (${issues.length})`);
    console.log('='.repeat(30));
    
    issues.forEach(issue => {
      console.log(`Project ID: ${issue.projectId}`);
      if (issue.title) console.log(`Title: ${issue.title}`);
      console.log(`Issue: ${issue.issue}`);
      console.log(`Project Path: ${issue.projectPath}`);
      if (issue.gigPath) console.log(`Gig Path: ${issue.gigPath}`);
      if (issue.description) console.log(`Description: ${issue.description}`);
      console.log('---');
    });
    console.log('');
  }
  
  // Calculate percentages
  const budgetPercentage = ((auditResults.projectsWithBudget / auditResults.totalProjects) * 100).toFixed(1);
  const gigMatchPercentage = ((auditResults.projectsWithMatchingGig / auditResults.totalProjects) * 100).toFixed(1);
  const completeMonetaryDataPercentage = ((auditResults.projectsWithBudgetAndGigRate / auditResults.totalProjects) * 100).toFixed(1);
  
  console.log('📊 KEY METRICS');
  console.log('==============');
  console.log(`Projects with Budget: ${budgetPercentage}%`);
  console.log(`Projects with Matching Gig: ${gigMatchPercentage}%`);
  console.log(`Projects with Complete Monetary Data: ${completeMonetaryDataPercentage}%`);
  console.log(`Projects with NO Monetary Value: ${auditResults.projectsWithoutMonetaryValue.length}`);
  console.log(`Projects with Valid Trail: ${auditResults.projectsWithTrail.length}`);
  console.log(`Projects WITHOUT Valid Trail: ${auditResults.projectsWithoutTrail.length}`);
  console.log('');

  console.log('💰 BUDGET TYPE BREAKDOWN');
  console.log('========================');
  console.log(`Range Budgets (lower/upper): ${auditResults.budgetTypes.range}`);
  console.log(`Fixed Budgets: ${auditResults.budgetTypes.fixed}`);
  console.log('');

  console.log('💼 GIG RATE TYPE BREAKDOWN');
  console.log('==========================');
  console.log(`Hourly Rates: ${auditResults.gigRateTypes.hourly}`);
  console.log(`Fixed Rates: ${auditResults.gigRateTypes.fixed}`);
  console.log(`Budget-based: ${auditResults.gigRateTypes.budget}`);
  console.log('');

  console.log('🔗 PROJECT TRAIL TYPE BREAKDOWN');
  console.log('================================');
  console.log(`Gig Application Trail: ${auditResults.trailTypes.gig_application}`);
  console.log(`Gig Request Trail: ${auditResults.trailTypes.gig_request}`);
  console.log(`Gig Reference Trail: ${auditResults.trailTypes.gig_reference}`);
  console.log('');

  if (auditResults.projectsWithoutMonetaryValue.length > 0) {
    console.log('🚨 PROJECTS WITH NO DECLARED MONETARY VALUE');
    console.log('============================================');
    auditResults.projectsWithoutMonetaryValue.forEach(project => {
      console.log(`Project ID: ${project.projectId}`);
      console.log(`Title: ${project.title}`);
      console.log(`Status: ${project.status}`);
      console.log(`Invoicing Method: ${project.invoicingMethod}`);
      console.log(`Description: ${project.description?.substring(0, 150)}...`);
      console.log(`Project Path: ${project.projectPath}`);
      if (project.gigPath) console.log(`Gig Path: ${project.gigPath}`);
      console.log('---');
    });
  }

  if (auditResults.projectsWithoutTrail.length > 0) {
    console.log('🚨 PROJECTS WITHOUT VALID TRAIL (LOGICAL IMPOSSIBILITIES)');
    console.log('==========================================================');
    auditResults.projectsWithoutTrail.forEach(project => {
      console.log(`Project ID: ${project.projectId}`);
      console.log(`Title: ${project.title}`);
      console.log(`Status: ${project.status}`);
      console.log(`Freelancer ID: ${project.freelancerId}`);
      console.log(`Commissioner ID: ${project.commissionerId}`);
      console.log(`Invoicing Method: ${project.invoicingMethod}`);
      console.log(`Budget: ${JSON.stringify(project.budget)}`);
      console.log(`Created At: ${project.createdAt}`);
      console.log(`Project Path: ${project.projectPath}`);
      console.log(`Description: ${project.description?.substring(0, 100)}...`);
      console.log('---');
    });
  }

  if (auditResults.potentialTestProjects.length > 0) {
    console.log('🧪 POTENTIAL TEST/DEMO PROJECTS');
    console.log('================================');
    auditResults.potentialTestProjects.forEach(project => {
      console.log(`Project ID: ${project.projectId}`);
      console.log(`Title: ${project.title}`);
      console.log(`Status: ${project.status}`);
      console.log(`Total Tasks: ${project.totalTasks}`);
      console.log(`Budget: ${JSON.stringify(project.budget)}`);
      console.log(`Reason: ${project.reason}`);
      console.log(`Description: ${project.description}...`);
      console.log('---');
    });
  }

  return auditResults;
}

// Run the audit
if (require.main === module) {
  auditResults = auditProjectMonetaryValues();
}

module.exports = { auditProjectMonetaryValues };

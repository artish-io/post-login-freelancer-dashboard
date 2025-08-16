const fs = require('fs');
const path = require('path');

// Utility functions
function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.json')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

// Data collection functions
function collectAllProjects() {
  const projects = [];
  const projectFiles = getAllFiles('data/projects');
  
  projectFiles.forEach(file => {
    if (file.endsWith('project.json')) {
      const project = readJsonFile(file);
      if (project) {
        project._filePath = file;
        projects.push(project);
      }
    }
  });
  
  return projects;
}

function collectAllProjectTasks() {
  const tasks = [];
  const taskFiles = getAllFiles('data/project-tasks');
  
  taskFiles.forEach(file => {
    if (file.endsWith('-task.json')) {
      const task = readJsonFile(file);
      if (task) {
        task._filePath = file;
        tasks.push(task);
      }
    }
  });
  
  return tasks;
}

function collectAllInvoices() {
  const invoices = [];
  const invoiceFiles = getAllFiles('data/invoices');
  
  invoiceFiles.forEach(file => {
    if (file.endsWith('invoice.json')) {
      const invoice = readJsonFile(file);
      if (invoice) {
        invoice._filePath = file;
        invoices.push(invoice);
      }
    }
  });
  
  return invoices;
}

function collectAllGigApplications() {
  const applications = [];

  // Check both locations for gig applications
  const appFiles1 = getAllFiles('data/gig-applications');
  const appFiles2 = getAllFiles('data/gigs/gig-applications');
  const allAppFiles = [...appFiles1, ...appFiles2];

  allAppFiles.forEach(file => {
    if (file.endsWith('.json') && !file.includes('index')) {
      const app = readJsonFile(file);
      if (app) {
        app._filePath = file;
        applications.push(app);
      }
    }
  });

  return applications;
}

function collectAllGigs() {
  const gigs = [];
  const gigFiles = getAllFiles('data/gigs');
  
  gigFiles.forEach(file => {
    if (file.endsWith('.json') && !file.includes('index') && !file.includes('categories') && !file.includes('tools')) {
      const gig = readJsonFile(file);
      if (gig) {
        gig._filePath = file;
        gigs.push(gig);
      }
    }
  });
  
  return gigs;
}

// Analysis functions
function analyzeProjectInvoiceConsistency(projects, tasks, invoices) {
  const issues = [];
  
  projects.forEach(project => {
    const projectTasks = tasks.filter(task => task.projectId === project.projectId);
    const projectInvoices = invoices.filter(invoice => invoice.projectId === project.projectId);
    
    // Check completed projects without invoices
    if (project.status === 'completed') {
      if (projectInvoices.length === 0) {
        issues.push({
          type: 'completed_project_no_invoices',
          projectId: project.projectId,
          project: project,
          tasks: projectTasks,
          message: `Project ${project.projectId} is completed but has no invoices`
        });
      }
    }
    
    // Check approved tasks without invoices
    const approvedTasks = projectTasks.filter(task => 
      task.status === 'Approved' && task.completed === true
    );
    
    approvedTasks.forEach(task => {
      const taskInvoices = projectInvoices.filter(invoice => 
        invoice.milestones && invoice.milestones.some(m => m.taskId === task.taskId)
      );
      
      if (taskInvoices.length === 0) {
        issues.push({
          type: 'approved_task_no_invoice',
          projectId: project.projectId,
          taskId: task.taskId,
          project: project,
          task: task,
          message: `Task ${task.taskId} in project ${project.projectId} is approved but has no invoice`
        });
      }
    });
    
    // Check completion-based projects
    if (project.invoicingMethod === 'completion') {
      const upfrontInvoice = projectInvoices.find(inv => inv.invoiceType === 'upfront');
      const completionInvoice = projectInvoices.find(inv => inv.invoiceType === 'completion');
      
      if (project.status === 'completed' && (!upfrontInvoice || !completionInvoice)) {
        issues.push({
          type: 'completion_project_missing_invoices',
          projectId: project.projectId,
          project: project,
          hasUpfront: !!upfrontInvoice,
          hasCompletion: !!completionInvoice,
          message: `Completion-based project ${project.projectId} is completed but missing ${!upfrontInvoice ? 'upfront' : ''} ${!completionInvoice ? 'completion' : ''} invoice(s)`
        });
      }
    }
  });
  
  return issues;
}

function analyzeGigApplicationConsistency(applications, projects, gigs) {
  const issues = [];

  applications.forEach(app => {
    if (app.status === 'accepted' || app.status === 'matched') {
      // Check if there's a corresponding project
      const matchingProject = projects.find(project =>
        project.freelancerId === app.freelancerId &&
        (project.gigId === app.gigId ||
         project.title === app.gigTitle ||
         // Check if project was created around the same time as application
         Math.abs(new Date(project.createdAt) - new Date(app.submittedAt)) < 24 * 60 * 60 * 1000)
      );

      // Find the corresponding gig for more context
      const correspondingGig = gigs.find(gig => gig.id === app.gigId);

      if (!matchingProject) {
        issues.push({
          type: 'accepted_application_no_project',
          applicationId: app.id,
          gigId: app.gigId,
          freelancerId: app.freelancerId,
          application: app,
          gig: correspondingGig,
          message: `Gig application ${app.id} is accepted/matched but has no corresponding project`
        });
      }
    }
  });

  return issues;
}

// Correction functions
function correctProjectStatus(project) {
  if (project.status === 'completed') {
    const filePath = project._filePath;
    // Remove _filePath before writing to avoid schema validation issues
    const cleanProject = { ...project };
    delete cleanProject._filePath;

    cleanProject.status = 'ongoing';
    cleanProject.updatedAt = new Date().toISOString();
    return writeJsonFile(filePath, cleanProject);
  }
  return false;
}

function correctTaskStatus(task) {
  if (task.status === 'Approved' && task.completed === true) {
    const filePath = task._filePath;
    // Remove _filePath before writing to avoid schema validation issues
    const cleanTask = { ...task };
    delete cleanTask._filePath;

    cleanTask.status = 'Ongoing';
    cleanTask.completed = false;
    cleanTask.lastModified = new Date().toISOString();
    return writeJsonFile(filePath, cleanTask);
  }
  return false;
}

function correctGigApplicationStatus(application) {
  if (application.status === 'accepted' || application.status === 'matched') {
    const filePath = application._filePath;
    // Remove _filePath before writing to avoid schema validation issues
    const cleanApplication = { ...application };
    delete cleanApplication._filePath;

    cleanApplication.status = 'pending';
    return writeJsonFile(filePath, cleanApplication);
  }
  return false;
}

// Main audit function
async function runDataAudit(performCorrections = false) {
  console.log('🔍 Starting Data Audit...\n');

  // Collect all data
  console.log('📊 Collecting data...');
  const projects = collectAllProjects();
  const tasks = collectAllProjectTasks();
  const invoices = collectAllInvoices();
  const applications = collectAllGigApplications();
  const gigs = collectAllGigs();

  console.log(`Found ${projects.length} projects, ${tasks.length} tasks, ${invoices.length} invoices, ${applications.length} applications`);

  // Analyze inconsistencies
  console.log('\n🔍 Analyzing inconsistencies...');
  const projectInvoiceIssues = analyzeProjectInvoiceConsistency(projects, tasks, invoices);
  const gigApplicationIssues = analyzeGigApplicationConsistency(applications, projects, gigs);

  const allIssues = [...projectInvoiceIssues, ...gigApplicationIssues];

  console.log(`\n📋 Found ${allIssues.length} issues:`);
  allIssues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.type}: ${issue.message}`);
  });

  // Perform corrections if requested
  const corrections = [];
  if (performCorrections) {
    console.log('\n🔧 Performing corrections...');

    allIssues.forEach(issue => {
      switch (issue.type) {
        case 'completed_project_no_invoices':
        case 'completion_project_missing_invoices':
          if (correctProjectStatus(issue.project)) {
            corrections.push({
              type: 'project_status_corrected',
              projectId: issue.projectId,
              message: `Project ${issue.projectId} status changed from completed to ongoing`
            });
          }
          break;

        case 'approved_task_no_invoice':
          if (correctTaskStatus(issue.task)) {
            corrections.push({
              type: 'task_status_corrected',
              taskId: issue.taskId,
              projectId: issue.projectId,
              message: `Task ${issue.taskId} status changed from approved to ongoing`
            });
          }
          break;

        case 'accepted_application_no_project':
          if (correctGigApplicationStatus(issue.application)) {
            corrections.push({
              type: 'application_status_corrected',
              applicationId: issue.applicationId,
              message: `Application ${issue.applicationId} status changed from accepted to pending`
            });
          }
          break;
      }
    });

    console.log(`\n✅ Applied ${corrections.length} corrections`);
  }

  return {
    projects,
    tasks,
    invoices,
    applications,
    gigs,
    issues: allIssues,
    corrections: corrections || []
  };
}

module.exports = {
  runDataAudit,
  analyzeProjectInvoiceConsistency,
  analyzeGigApplicationConsistency,
  collectAllProjects,
  collectAllProjectTasks,
  collectAllInvoices,
  collectAllGigApplications,
  collectAllGigs
};

if (require.main === module) {
  runDataAudit().then(result => {
    console.log('\n✅ Audit complete!');
  }).catch(error => {
    console.error('❌ Audit failed:', error);
  });
}

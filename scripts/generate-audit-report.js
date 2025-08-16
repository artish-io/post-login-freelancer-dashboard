const fs = require('fs');
const path = require('path');
const { runDataAudit } = require('./data-audit');

function generateMarkdownReport(auditResults) {
  const { projects, tasks, invoices, applications, gigs, issues, corrections } = auditResults;
  
  let report = `# Data Audit and Correction Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  // Summary section
  report += `## Executive Summary\n\n`;
  report += `This audit examined the consistency between projects, tasks, invoices, and gig applications in the Artish platform data.\n\n`;
  report += `### Data Overview\n`;
  report += `- **Projects:** ${projects.length}\n`;
  report += `- **Tasks:** ${tasks.length}\n`;
  report += `- **Invoices:** ${invoices.length}\n`;
  report += `- **Gig Applications:** ${applications.length}\n`;
  report += `- **Gigs:** ${gigs.length}\n\n`;
  
  report += `### Issues Found\n`;
  report += `- **Total Issues:** ${issues.length}\n`;
  report += `- **Corrections Applied:** ${corrections.length}\n\n`;
  
  // Issues breakdown
  const issuesByType = {};
  issues.forEach(issue => {
    if (!issuesByType[issue.type]) {
      issuesByType[issue.type] = [];
    }
    issuesByType[issue.type].push(issue);
  });
  
  report += `## Issues Breakdown\n\n`;
  
  Object.keys(issuesByType).forEach(type => {
    const typeIssues = issuesByType[type];
    report += `### ${type.replace(/_/g, ' ').toUpperCase()}\n`;
    report += `**Count:** ${typeIssues.length}\n\n`;
    
    switch (type) {
      case 'completed_project_no_invoices':
        report += `These are projects marked as completed but have no corresponding invoices. This is a logical impossibility as completed projects should have been invoiced.\n\n`;
        break;
      case 'approved_task_no_invoice':
        report += `These are individual tasks marked as approved and completed but have no corresponding invoices. Approved tasks should generate invoices.\n\n`;
        break;
      case 'completion_project_missing_invoices':
        report += `These are completion-based projects that are marked as completed but are missing either upfront or completion invoices (or both).\n\n`;
        break;
      case 'accepted_application_no_project':
        report += `These are gig applications marked as accepted/matched but have no corresponding project data. Accepted applications should create projects.\n\n`;
        break;
    }
    
    report += `#### Affected Items:\n`;
    typeIssues.forEach((issue, index) => {
      report += `${index + 1}. `;
      switch (type) {
        case 'completed_project_no_invoices':
        case 'completion_project_missing_invoices':
          report += `Project ID: ${issue.projectId} - "${issue.project.title}"\n`;
          report += `   - Status: ${issue.project.status}\n`;
          report += `   - Invoicing Method: ${issue.project.invoicingMethod}\n`;
          report += `   - Commissioner ID: ${issue.project.commissionerId}\n`;
          report += `   - Freelancer ID: ${issue.project.freelancerId}\n`;
          break;
        case 'approved_task_no_invoice':
          report += `Task ID: ${issue.taskId} in Project ${issue.projectId}\n`;
          report += `   - Task Title: "${issue.task.title}"\n`;
          report += `   - Status: ${issue.task.status}\n`;
          report += `   - Completed: ${issue.task.completed}\n`;
          report += `   - Approved Date: ${issue.task.approvedDate}\n`;
          break;
        case 'accepted_application_no_project':
          report += `Application ID: ${issue.applicationId} for Gig ${issue.gigId}\n`;
          report += `   - Freelancer ID: ${issue.freelancerId}\n`;
          report += `   - Status: ${issue.application.status}\n`;
          report += `   - Submitted At: ${issue.application.submittedAt}\n`;
          report += `   - Gig Title: "${issue.gig?.title || 'Unknown'}"\n`;
          report += `   - Gig Status: ${issue.gig?.status || 'Unknown'}\n`;
          report += `   - Pitch: "${issue.application.pitch?.substring(0, 100)}${issue.application.pitch?.length > 100 ? '...' : ''}"\n`;
          report += `   - Skills: [${issue.application.skills?.join(', ') || 'None'}]\n`;
          report += `   - Tools: [${issue.application.tools?.join(', ') || 'None'}]\n`;
          break;
      }
      report += `\n`;
    });
    report += `\n`;
  });
  
  // Corrections section
  if (corrections.length > 0) {
    report += `## Corrections Applied\n\n`;
    
    const correctionsByType = {};
    corrections.forEach(correction => {
      if (!correctionsByType[correction.type]) {
        correctionsByType[correction.type] = [];
      }
      correctionsByType[correction.type].push(correction);
    });
    
    Object.keys(correctionsByType).forEach(type => {
      const typeCorrections = correctionsByType[type];
      report += `### ${type.replace(/_/g, ' ').toUpperCase()}\n`;
      report += `**Count:** ${typeCorrections.length}\n\n`;
      
      typeCorrections.forEach((correction, index) => {
        report += `${index + 1}. ${correction.message}\n`;
      });
      report += `\n`;
    });
  }
  
  // Recommendations section
  report += `## Recommendations\n\n`;
  report += `1. **Implement Data Validation:** Add validation rules to prevent projects from being marked as completed without corresponding invoices.\n\n`;
  report += `2. **Automated Invoice Generation:** Ensure that approved tasks automatically trigger invoice generation.\n\n`;
  report += `3. **Gig Application Workflow:** Implement proper workflow to ensure accepted gig applications always create corresponding projects.\n\n`;
  report += `4. **Regular Audits:** Schedule regular data consistency audits to catch and correct issues early.\n\n`;
  report += `5. **Transaction Integrity:** Implement database-level constraints or application-level checks to maintain referential integrity.\n\n`;
  
  // Technical details
  report += `## Technical Details\n\n`;
  report += `### Audit Methodology\n`;
  report += `1. Collected all projects, tasks, invoices, and gig applications from hierarchical storage\n`;
  report += `2. Cross-referenced data to identify logical inconsistencies\n`;
  report += `3. Applied corrections by reverting invalid states to valid ones\n`;
  report += `4. Generated this report with detailed findings\n\n`;
  
  report += `### Data Paths Examined\n`;
  report += `- Projects: \`data/projects/\`\n`;
  report += `- Tasks: \`data/project-tasks/\`\n`;
  report += `- Invoices: \`data/invoices/\`\n`;
  report += `- Gig Applications: \`data/gig-applications/\`\n`;
  report += `- Gigs: \`data/gigs/\`\n\n`;
  
  report += `---\n`;
  report += `*Report generated by Artish Data Audit System*\n`;
  
  return report;
}

async function main() {
  try {
    console.log('🔍 Running data audit...');
    const auditResults = await runDataAudit(true); // true = perform corrections
    
    console.log('📝 Generating report...');
    const report = generateMarkdownReport(auditResults);
    
    const reportPath = 'data-audit-report.md';
    fs.writeFileSync(reportPath, report);
    
    console.log(`✅ Report generated: ${reportPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`- Issues found: ${auditResults.issues.length}`);
    console.log(`- Corrections applied: ${auditResults.corrections.length}`);
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateMarkdownReport };

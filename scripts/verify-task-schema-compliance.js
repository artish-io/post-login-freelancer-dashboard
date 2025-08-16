const fs = require('fs');
const path = require('path');

// Verify all task files are schema compliant
async function verifyTaskSchemaCompliance() {
  console.log('🔍 Verifying Task Schema Compliance...\n');

  try {
    // Find all task files
    const taskFiles = getAllFiles('data/project-tasks');
    let totalTasks = 0;
    let validTasks = 0;
    let invalidTasks = 0;
    const issues = [];

    console.log(`📊 Scanning ${taskFiles.length} task files...`);

    // Valid task status values according to schema
    const validStatuses = ['Ongoing', 'Submitted', 'In review', 'review', 'Rejected', 'Approved', 'done', 'in_progress'];
    
    // Required fields according to schema
    const requiredFields = ['taskId', 'projectId', 'projectTitle', 'title', 'status', 'completed', 'order'];

    for (const file of taskFiles) {
      if (file.endsWith('-task.json')) {
        try {
          const task = JSON.parse(fs.readFileSync(file, 'utf8'));
          totalTasks++;

          const taskIssues = [];

          // Check for _filePath property (should not exist)
          if (task.hasOwnProperty('_filePath')) {
            taskIssues.push('Contains _filePath property (schema violation)');
          }

          // Check required fields
          for (const field of requiredFields) {
            if (!task.hasOwnProperty(field)) {
              taskIssues.push(`Missing required field: ${field}`);
            }
          }

          // Check status value
          if (task.status && !validStatuses.includes(task.status)) {
            taskIssues.push(`Invalid status: "${task.status}" (valid: ${validStatuses.join(', ')})`);
          }

          // Check data types
          if (task.taskId && typeof task.taskId !== 'number') {
            taskIssues.push(`taskId should be number, got ${typeof task.taskId}`);
          }

          if (task.completed && typeof task.completed !== 'boolean') {
            taskIssues.push(`completed should be boolean, got ${typeof task.completed}`);
          }

          if (task.order && typeof task.order !== 'number') {
            taskIssues.push(`order should be number, got ${typeof task.order}`);
          }

          if (taskIssues.length > 0) {
            invalidTasks++;
            issues.push({
              file,
              taskId: task.taskId,
              projectId: task.projectId,
              title: task.title,
              issues: taskIssues
            });
          } else {
            validTasks++;
          }

        } catch (error) {
          invalidTasks++;
          issues.push({
            file,
            taskId: 'unknown',
            projectId: 'unknown',
            title: 'unknown',
            issues: [`JSON parsing error: ${error.message}`]
          });
        }
      }
    }

    console.log(`\n📋 Schema Compliance Summary:`);
    console.log(`   Total tasks scanned: ${totalTasks}`);
    console.log(`   Valid tasks: ${validTasks} (${((validTasks/totalTasks)*100).toFixed(1)}%)`);
    console.log(`   Invalid tasks: ${invalidTasks} (${((invalidTasks/totalTasks)*100).toFixed(1)}%)`);

    if (invalidTasks > 0) {
      console.log(`\n❌ Schema Compliance Issues Found:`);
      issues.forEach((issue, index) => {
        console.log(`\n   ${index + 1}. Task ${issue.taskId} (Project ${issue.projectId})`);
        console.log(`      File: ${issue.file}`);
        console.log(`      Title: "${issue.title}"`);
        console.log(`      Issues:`);
        issue.issues.forEach(iss => {
          console.log(`        - ${iss}`);
        });
      });
    } else {
      console.log(`\n✅ All task files are schema compliant!`);
    }

    // Status distribution
    console.log(`\n📊 Task Status Distribution:`);
    const statusCounts = {};
    
    for (const file of taskFiles) {
      if (file.endsWith('-task.json')) {
        try {
          const task = JSON.parse(fs.readFileSync(file, 'utf8'));
          const status = task.status || 'undefined';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        } catch (error) {
          statusCounts['parse_error'] = (statusCounts['parse_error'] || 0) + 1;
        }
      }
    }

    Object.entries(statusCounts).forEach(([status, count]) => {
      const isValid = validStatuses.includes(status);
      const indicator = isValid ? '✅' : '❌';
      console.log(`   ${indicator} ${status}: ${count} tasks`);
    });

    return {
      totalTasks,
      validTasks,
      invalidTasks,
      issues,
      statusCounts,
      complianceRate: (validTasks/totalTasks)*100
    };

  } catch (error) {
    console.error('❌ Error verifying task schema compliance:', error);
    throw error;
  }
}

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

if (require.main === module) {
  verifyTaskSchemaCompliance().then(result => {
    console.log('\n🎉 Task schema compliance verification completed');
    
    if (result.complianceRate === 100) {
      console.log(`\n✅ PERFECT COMPLIANCE: All ${result.totalTasks} task files pass schema validation`);
      console.log(`   - No _filePath properties found`);
      console.log(`   - All required fields present`);
      console.log(`   - All status values valid`);
      console.log(`   - All data types correct`);
      console.log(`\n🚀 UnifiedStorageService should now work without validation errors`);
    } else {
      console.log(`\n⚠️ COMPLIANCE ISSUES: ${result.invalidTasks} tasks need attention`);
      console.log(`   Compliance rate: ${result.complianceRate.toFixed(1)}%`);
    }
    
  }).catch(error => {
    console.error('\n💥 Schema compliance verification failed:', error);
    process.exit(1);
  });
}

module.exports = { verifyTaskSchemaCompliance };

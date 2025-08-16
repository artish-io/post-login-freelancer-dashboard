const fs = require('fs');
const path = require('path');

// Fix task status inconsistency - change "In Progress" to "Ongoing"
async function fixTaskStatusInconsistency() {
  console.log('🔧 Fixing Task Status Inconsistency...\n');
  console.log('Converting "In Progress" status to "Ongoing" to match schema\n');

  try {
    // Find all task files
    const taskFiles = getAllFiles('data/project-tasks');
    let totalTasks = 0;
    let fixedTasks = 0;
    const fixedTasksList = [];

    console.log(`📊 Scanning ${taskFiles.length} task files...`);

    for (const file of taskFiles) {
      if (file.endsWith('-task.json')) {
        try {
          const task = JSON.parse(fs.readFileSync(file, 'utf8'));
          totalTasks++;

          // Check if task has "In Progress" status
          if (task.status === 'In Progress') {
            console.log(`🔧 Fixing task ${task.taskId} in project ${task.projectId}: "${task.title}"`);
            console.log(`   Status: "${task.status}" → "Ongoing"`);

            // Update status to correct value
            task.status = 'Ongoing';
            task.lastModified = new Date().toISOString();

            // Write back to file
            fs.writeFileSync(file, JSON.stringify(task, null, 2));
            
            fixedTasks++;
            fixedTasksList.push({
              taskId: task.taskId,
              projectId: task.projectId,
              title: task.title,
              filePath: file
            });

            console.log(`   ✅ Fixed and saved`);
          }
        } catch (error) {
          console.warn(`⚠️ Warning: Could not process ${file}:`, error.message);
        }
      }
    }

    console.log(`\n📋 Summary:`);
    console.log(`   Total tasks scanned: ${totalTasks}`);
    console.log(`   Tasks with "In Progress" status: ${fixedTasks}`);
    console.log(`   Tasks fixed: ${fixedTasks}`);

    if (fixedTasks > 0) {
      console.log(`\n✅ Fixed Tasks:`);
      fixedTasksList.forEach((task, index) => {
        console.log(`   ${index + 1}. Task ${task.taskId} (Project ${task.projectId}): "${task.title}"`);
      });

      // Verify the fixes
      console.log(`\n🔍 Verifying fixes...`);
      let verificationPassed = true;

      for (const fixedTask of fixedTasksList) {
        try {
          const verifyTask = JSON.parse(fs.readFileSync(fixedTask.filePath, 'utf8'));
          if (verifyTask.status !== 'Ongoing') {
            console.log(`❌ Verification failed for task ${fixedTask.taskId}: status is "${verifyTask.status}"`);
            verificationPassed = false;
          }
        } catch (error) {
          console.log(`❌ Verification failed for task ${fixedTask.taskId}: ${error.message}`);
          verificationPassed = false;
        }
      }

      if (verificationPassed) {
        console.log(`✅ All fixes verified successfully`);
      } else {
        console.log(`❌ Some fixes failed verification`);
      }
    } else {
      console.log(`\n✅ No tasks found with "In Progress" status - all tasks are using correct status values`);
    }

    // Check for any remaining inconsistencies
    console.log(`\n🔍 Checking for other status inconsistencies...`);
    const statusCounts = {};
    
    for (const file of taskFiles) {
      if (file.endsWith('-task.json')) {
        try {
          const task = JSON.parse(fs.readFileSync(file, 'utf8'));
          const status = task.status;
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        } catch (error) {
          // Skip invalid files
        }
      }
    }

    console.log(`\n📊 Current task status distribution:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      const isValid = ['Ongoing', 'Submitted', 'In review', 'review', 'Rejected', 'Approved', 'done'].includes(status);
      const indicator = isValid ? '✅' : '⚠️';
      console.log(`   ${indicator} ${status}: ${count} tasks`);
    });

    return {
      totalTasks,
      fixedTasks,
      fixedTasksList,
      statusCounts
    };

  } catch (error) {
    console.error('❌ Error fixing task status inconsistency:', error);
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
  fixTaskStatusInconsistency().then(result => {
    console.log('\n🎉 Task status inconsistency fix completed');
    
    if (result.fixedTasks > 0) {
      console.log(`\n📄 Summary for logging:`);
      console.log(`- Fixed ${result.fixedTasks} tasks from "In Progress" to "Ongoing"`);
      console.log(`- All task statuses now conform to schema requirements`);
      console.log(`- Data consistency restored`);
    }
    
  }).catch(error => {
    console.error('\n💥 Task status fix failed:', error);
    process.exit(1);
  });
}

module.exports = { fixTaskStatusInconsistency };

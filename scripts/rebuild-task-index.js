#!/usr/bin/env node

/**
 * Rebuild Task Index Script
 * 
 * Rebuilds the tasks-index.json file by scanning all hierarchical task files.
 * This is needed after storage migration to make task lookup work properly.
 */

const fs = require('fs').promises;
const path = require('path');

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function scanTaskFiles(baseDir) {
  const tasks = [];
  
  try {
    const years = await fs.readdir(baseDir);
    
    for (const year of years) {
      if (!/^\d{4}$/.test(year)) continue; // Skip non-year directories
      
      const yearPath = path.join(baseDir, year);
      const months = await fs.readdir(yearPath);
      
      for (const month of months) {
        if (!/^\d{2}$/.test(month)) continue; // Skip non-month directories
        
        const monthPath = path.join(yearPath, month);
        const days = await fs.readdir(monthPath);
        
        for (const day of days) {
          if (!/^\d{2}$/.test(day)) continue; // Skip non-day directories
          
          const dayPath = path.join(monthPath, day);
          const projects = await fs.readdir(dayPath);
          
          for (const projectId of projects) {
            const projectPath = path.join(dayPath, projectId);
            const stat = await fs.stat(projectPath);
            
            if (stat.isDirectory()) {
              const files = await fs.readdir(projectPath);
              
              for (const file of files) {
                if (file.endsWith('-task.json')) {
                  const taskPath = path.join(projectPath, file);
                  
                  try {
                    const taskData = await fs.readFile(taskPath, 'utf-8');
                    const task = JSON.parse(taskData);
                    
                    if (task.taskId && task.projectId && task.createdDate) {
                      tasks.push({
                        taskId: task.taskId,
                        projectId: task.projectId,
                        createdAt: task.createdDate,
                        filePath: taskPath
                      });
                    } else {
                      console.warn(`⚠️  Task file missing required fields: ${taskPath}`);
                    }
                  } catch (error) {
                    console.error(`❌ Error reading task file ${taskPath}:`, error.message);
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error scanning task files:', error);
  }
  
  return tasks;
}

async function rebuildTaskIndex() {
  console.log('🔄 Rebuilding task index...');
  
  const projectTasksDir = path.join(process.cwd(), 'data', 'project-tasks');
  
  if (!(await fileExists(projectTasksDir))) {
    console.log('📁 No project-tasks directory found. Nothing to index.');
    return;
  }
  
  // Scan all task files
  console.log('🔍 Scanning hierarchical task files...');
  const tasks = await scanTaskFiles(projectTasksDir);
  
  console.log(`📊 Found ${tasks.length} task files`);
  
  // Build the index
  const index = {};
  let duplicates = 0;
  
  for (const task of tasks) {
    const taskIdStr = task.taskId.toString();
    
    if (index[taskIdStr]) {
      console.warn(`⚠️  Duplicate task ID ${task.taskId} found:`, {
        existing: index[taskIdStr],
        new: { projectId: task.projectId, createdAt: task.createdAt }
      });
      duplicates++;
      continue;
    }
    
    index[taskIdStr] = {
      projectId: task.projectId,
      createdAt: task.createdAt
    };
  }
  
  // Write the index file
  const indexPath = path.join(projectTasksDir, 'metadata', 'tasks-index.json');
  await ensureDir(path.dirname(indexPath));
  
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  
  console.log(`✅ Task index rebuilt successfully!`);
  console.log(`📝 Index file: ${indexPath}`);
  console.log(`📊 Indexed ${Object.keys(index).length} tasks`);
  
  if (duplicates > 0) {
    console.warn(`⚠️  Found ${duplicates} duplicate task IDs (skipped)`);
  }
  
  // Verify a few random tasks can be found
  console.log('\n🧪 Testing index...');
  const taskIds = Object.keys(index).slice(0, 3);
  
  for (const taskId of taskIds) {
    const taskInfo = index[taskId];
    const taskPath = path.join(
      projectTasksDir,
      new Date(taskInfo.createdAt).getUTCFullYear().toString(),
      String(new Date(taskInfo.createdAt).getUTCMonth() + 1).padStart(2, '0'),
      String(new Date(taskInfo.createdAt).getUTCDate()).padStart(2, '0'),
      taskInfo.projectId.toString(),
      `${taskId}-task.json`
    );
    
    if (await fileExists(taskPath)) {
      console.log(`✅ Task ${taskId} can be found via index`);
    } else {
      console.error(`❌ Task ${taskId} indexed but file not found: ${taskPath}`);
    }
  }
  
  console.log('\n🎉 Task index rebuild complete!');
}

// Run the script
if (require.main === module) {
  rebuildTaskIndex().catch(error => {
    console.error('❌ Failed to rebuild task index:', error);
    process.exit(1);
  });
}

module.exports = { rebuildTaskIndex };

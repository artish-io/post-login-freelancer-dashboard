#!/usr/bin/env node

/**
 * Script to run systematic data cleanup directly
 *
 * This script implements the cleanup logic directly without server-only dependencies.
 */

const fs = require('fs').promises;
const path = require('path');

const CUTOFF_DATE = new Date('2025-08-25T00:00:00Z');
const DATA_ROOT = path.join(process.cwd(), 'data');

/**
 * Check if a date string is before the cutoff date (August 25, 2025)
 */
function isBeforeCutoff(dateString) {
  try {
    let date;

    if (dateString.includes('-')) {
      date = new Date(dateString);
    } else if (dateString.length === 8) {
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      date = new Date(`${year}-${month}-${day}`);
    } else {
      date = new Date(dateString);
    }

    return date < CUTOFF_DATE;
  } catch {
    return false;
  }
}

/**
 * Safely remove a file or directory
 */
async function safeRemove(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await fs.rmdir(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }
    return true;
  } catch (error) {
    console.warn(`Failed to remove ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Write JSON file atomically
 */
async function writeJsonAtomic(filePath, data) {
  const dirPath = path.dirname(filePath);
  await fs.mkdir(dirPath, { recursive: true });

  const tempPath = `${filePath}.tmp`;
  try {
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
    await fs.rename(tempPath, filePath);
  } catch (error) {
    try {
      await fs.unlink(tempPath);
    } catch {}
    throw error;
  }
}

/**
 * Read JSON file with fallback
 */
async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Clean up index files that reference deleted data
 */
async function cleanupIndexes(removedProjectIds, removedTaskIds, removedGigIds) {
  console.log('\n🔍 Cleaning up index files...');

  // Clean up projects index
  try {
    const projectsIndexPath = path.join(DATA_ROOT, 'projects', 'metadata', 'projects-index.json');
    const projectsIndex = await readJson(projectsIndexPath, {});
    let projectIndexUpdated = false;

    for (const projectId of removedProjectIds) {
      if (projectsIndex[projectId]) {
        delete projectsIndex[projectId];
        projectIndexUpdated = true;
        console.log(`  🗑️ Removed ${projectId} from projects index`);
      }
    }

    if (projectIndexUpdated) {
      await writeJsonAtomic(projectsIndexPath, projectsIndex);
      console.log(`✅ Updated projects-index.json`);
    }
  } catch (error) {
    console.warn(`Failed to update projects index: ${error.message}`);
  }

  // Clean up projects metadata index
  try {
    const projectsMetadataIndexPath = path.join(DATA_ROOT, 'projects', 'metadata', 'projects-metadata-index.json');
    const projectsMetadataIndex = await readJson(projectsMetadataIndexPath, {});
    let metadataIndexUpdated = false;

    for (const projectId of removedProjectIds) {
      if (projectsMetadataIndex[projectId]) {
        delete projectsMetadataIndex[projectId];
        metadataIndexUpdated = true;
        console.log(`  🗑️ Removed ${projectId} from projects metadata index`);
      }
    }

    if (metadataIndexUpdated) {
      await writeJsonAtomic(projectsMetadataIndexPath, projectsMetadataIndex);
      console.log(`✅ Updated projects-metadata-index.json`);
    }
  } catch (error) {
    console.warn(`Failed to update projects metadata index: ${error.message}`);
  }

  // Clean up tasks index
  try {
    const tasksIndexPath = path.join(DATA_ROOT, 'project-tasks', 'metadata', 'tasks-index.json');
    const tasksIndex = await readJson(tasksIndexPath, {});
    let tasksIndexUpdated = false;

    for (const taskId of removedTaskIds) {
      if (tasksIndex[taskId.toString()]) {
        delete tasksIndex[taskId.toString()];
        tasksIndexUpdated = true;
        console.log(`  🗑️ Removed task ${taskId} from tasks index`);
      }
    }

    if (tasksIndexUpdated) {
      await writeJsonAtomic(tasksIndexPath, tasksIndex);
      console.log(`✅ Updated tasks-index.json`);
    }
  } catch (error) {
    console.warn(`Failed to update tasks index: ${error.message}`);
  }

  // Clean up gig applications index
  try {
    const appsIndexPath = path.join(DATA_ROOT, 'gigs', 'gig-applications', 'applications-index.json');
    const appsIndex = await readJson(appsIndexPath, {});
    let appsIndexUpdated = false;

    // Remove applications that reference deleted gigs or have dates before cutoff
    for (const [appId, appData] of Object.entries(appsIndex)) {
      if (appData.submittedAt && isBeforeCutoff(appData.submittedAt)) {
        delete appsIndex[appId];
        appsIndexUpdated = true;
        console.log(`  🗑️ Removed application ${appId} from applications index`);
      }
    }

    if (appsIndexUpdated) {
      await writeJsonAtomic(appsIndexPath, appsIndex);
      console.log(`✅ Updated applications-index.json`);
    }
  } catch (error) {
    console.warn(`Failed to update applications index: ${error.message}`);
  }
}

async function main() {
  try {
    console.log('🧹 Starting systematic data cleanup...');
    console.log('📅 Removing all data created before August 25, 2025');

    const startTime = Date.now();
    let totalItemsFound = 0;
    let totalItemsRemoved = 0;
    const errors = [];

    // Track removed IDs for index cleanup
    const removedProjectIds = [];
    const removedTaskIds = [];
    const removedGigIds = [];

    // Clean up gigs
    console.log('\n🔍 Cleaning up gigs...');
    const gigsPath = path.join(DATA_ROOT, 'gigs');
    let gigsRemoved = 0;

    try {
      const years = await fs.readdir(gigsPath);

      for (const year of years) {
        if (parseInt(year) !== 2025) continue;

        const yearPath = path.join(gigsPath, year);
        const months = await fs.readdir(yearPath);

        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const days = await fs.readdir(monthPath);

          for (const day of days) {
            const dayPath = path.join(monthPath, day);

            const monthNum = month === 'August' ? '08' :
                            month === 'July' ? '07' :
                            month === 'June' ? '06' :
                            month === 'May' ? '05' :
                            month === 'April' ? '04' :
                            month === 'March' ? '03' :
                            month === 'February' ? '02' :
                            month === 'January' ? '01' : month;

            const dateStr = `${year}-${monthNum.padStart(2, '0')}-${day.padStart(2, '0')}`;

            if (isBeforeCutoff(dateStr)) {
              console.log(`🗑️ Removing gigs from ${dateStr}...`);

              try {
                const gigIds = await fs.readdir(dayPath);

                for (const gigId of gigIds) {
                  totalItemsFound++;
                  const gigDirPath = path.join(dayPath, gigId);
                  const removed = await safeRemove(gigDirPath);
                  if (removed) {
                    totalItemsRemoved++;
                    gigsRemoved++;
                    removedGigIds.push(parseInt(gigId));
                    console.log(`  ✅ Removed gig ${gigId}`);
                  }
                }

                // Remove empty day directory
                try {
                  const remainingFiles = await fs.readdir(dayPath);
                  if (remainingFiles.length === 0) {
                    await fs.rmdir(dayPath);
                  }
                } catch {}
              } catch (error) {
                errors.push(`Error processing day ${dateStr}: ${error.message}`);
              }
            }
          }
        }
      }
    } catch (error) {
      errors.push(`Error cleaning gigs: ${error.message}`);
    }

    // Clean up projects (hierarchical structure)
    console.log('\n🔍 Cleaning up projects...');
    const projectsBasePath = path.join(DATA_ROOT, 'projects');
    let projectsRemoved = 0;

    try {
      const years = await fs.readdir(projectsBasePath);

      for (const year of years) {
        if (parseInt(year) !== 2025) continue;

        const yearPath = path.join(projectsBasePath, year);
        const months = await fs.readdir(yearPath);

        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const days = await fs.readdir(monthPath);

          for (const day of days) {
            const dayPath = path.join(monthPath, day);

            const monthNum = month === 'August' ? '08' :
                            month === 'July' ? '07' :
                            month === 'June' ? '06' :
                            month === 'May' ? '05' :
                            month === 'April' ? '04' :
                            month === 'March' ? '03' :
                            month === 'February' ? '02' :
                            month === 'January' ? '01' : month;

            const dateStr = `${year}-${monthNum.padStart(2, '0')}-${day.padStart(2, '0')}`;

            if (isBeforeCutoff(dateStr)) {
              console.log(`🗑️ Removing projects from ${dateStr}...`);

              try {
                const projectIds = await fs.readdir(dayPath);

                for (const projectId of projectIds) {
                  const projectDirPath = path.join(dayPath, projectId);
                  const projectJsonPath = path.join(projectDirPath, 'project.json');

                  try {
                    // Check if project.json exists
                    await fs.access(projectJsonPath);
                    totalItemsFound++;

                    const removed = await safeRemove(projectDirPath);
                    if (removed) {
                      totalItemsRemoved++;
                      projectsRemoved++;
                      removedProjectIds.push(projectId);
                      console.log(`  ✅ Removed project ${projectId}`);
                    }
                  } catch {
                    // project.json doesn't exist, skip
                  }
                }

                // Remove empty day directory
                try {
                  const remainingFiles = await fs.readdir(dayPath);
                  if (remainingFiles.length === 0) {
                    await fs.rmdir(dayPath);
                  }
                } catch {}
              } catch (error) {
                errors.push(`Error processing projects day ${dateStr}: ${error.message}`);
              }
            }
          }
        }
      }
    } catch (error) {
      errors.push(`Error cleaning projects: ${error.message}`);
    }

    // Clean up tasks (hierarchical structure)
    console.log('\n🔍 Cleaning up tasks...');
    const tasksBasePath = path.join(DATA_ROOT, 'project-tasks');
    let tasksRemoved = 0;

    try {
      const years = await fs.readdir(tasksBasePath);

      for (const year of years) {
        if (parseInt(year) !== 2025) continue;

        const yearPath = path.join(tasksBasePath, year);
        const months = await fs.readdir(yearPath);

        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const days = await fs.readdir(monthPath);

          for (const day of days) {
            const dayPath = path.join(monthPath, day);

            const monthNum = month === 'August' ? '08' :
                            month === 'July' ? '07' :
                            month === 'June' ? '06' :
                            month === 'May' ? '05' :
                            month === 'April' ? '04' :
                            month === 'March' ? '03' :
                            month === 'February' ? '02' :
                            month === 'January' ? '01' : month;

            const dateStr = `${year}-${monthNum.padStart(2, '0')}-${day.padStart(2, '0')}`;

            if (isBeforeCutoff(dateStr)) {
              console.log(`🗑️ Removing tasks from ${dateStr}...`);

              try {
                const projectIds = await fs.readdir(dayPath);

                for (const projectId of projectIds) {
                  const projectTasksPath = path.join(dayPath, projectId);

                  try {
                    const taskFiles = await fs.readdir(projectTasksPath);

                    for (const taskFile of taskFiles) {
                      if (taskFile.endsWith('-task.json')) {
                        totalItemsFound++;

                        const taskFilePath = path.join(projectTasksPath, taskFile);
                        const removed = await safeRemove(taskFilePath);
                        if (removed) {
                          totalItemsRemoved++;
                          tasksRemoved++;
                          // Extract task ID from filename (e.g., "1755414226149-task.json" -> 1755414226149)
                          const taskId = taskFile.replace('-task.json', '');
                          removedTaskIds.push(parseInt(taskId));
                          console.log(`  ✅ Removed task ${taskFile} from project ${projectId}`);
                        }
                      }
                    }

                    // Remove empty project directory
                    try {
                      const remainingFiles = await fs.readdir(projectTasksPath);
                      if (remainingFiles.length === 0) {
                        await fs.rmdir(projectTasksPath);
                      }
                    } catch {}
                  } catch {
                    // Project directory doesn't exist or is empty
                  }
                }

                // Remove empty day directory
                try {
                  const remainingFiles = await fs.readdir(dayPath);
                  if (remainingFiles.length === 0) {
                    await fs.rmdir(dayPath);
                  }
                } catch {}
              } catch (error) {
                errors.push(`Error processing tasks day ${dateStr}: ${error.message}`);
              }
            }
          }
        }
      }
    } catch (error) {
      errors.push(`Error cleaning tasks: ${error.message}`);
    }

    // Clean up invoices (hierarchical structure)
    console.log('\n🔍 Cleaning up invoices...');
    const invoicesBasePath = path.join(DATA_ROOT, 'invoices');
    let invoicesRemoved = 0;

    try {
      const years = await fs.readdir(invoicesBasePath);

      for (const year of years) {
        if (parseInt(year) !== 2025) continue;

        const yearPath = path.join(invoicesBasePath, year);
        const months = await fs.readdir(yearPath);

        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const days = await fs.readdir(monthPath);

          for (const day of days) {
            const dayPath = path.join(monthPath, day);

            const monthNum = month === 'August' ? '08' :
                            month === 'July' ? '07' :
                            month === 'June' ? '06' :
                            month === 'May' ? '05' :
                            month === 'April' ? '04' :
                            month === 'March' ? '03' :
                            month === 'February' ? '02' :
                            month === 'January' ? '01' : month;

            const dateStr = `${year}-${monthNum.padStart(2, '0')}-${day.padStart(2, '0')}`;

            if (isBeforeCutoff(dateStr)) {
              console.log(`🗑️ Removing invoices from ${dateStr}...`);

              try {
                const projectIds = await fs.readdir(dayPath);

                for (const projectId of projectIds) {
                  const projectInvoicesPath = path.join(dayPath, projectId);

                  try {
                    const invoiceFiles = await fs.readdir(projectInvoicesPath);

                    for (const invoiceFile of invoiceFiles) {
                      if (invoiceFile.endsWith('.json')) {
                        totalItemsFound++;

                        const invoiceFilePath = path.join(projectInvoicesPath, invoiceFile);
                        const removed = await safeRemove(invoiceFilePath);
                        if (removed) {
                          totalItemsRemoved++;
                          invoicesRemoved++;
                          console.log(`  ✅ Removed invoice ${invoiceFile} from project ${projectId}`);
                        }
                      }
                    }

                    // Remove empty project directory
                    try {
                      const remainingFiles = await fs.readdir(projectInvoicesPath);
                      if (remainingFiles.length === 0) {
                        await fs.rmdir(projectInvoicesPath);
                      }
                    } catch {}
                  } catch {
                    // Project directory doesn't exist or is empty
                  }
                }

                // Remove empty day directory
                try {
                  const remainingFiles = await fs.readdir(dayPath);
                  if (remainingFiles.length === 0) {
                    await fs.rmdir(dayPath);
                  }
                } catch {}
              } catch (error) {
                errors.push(`Error processing invoices day ${dateStr}: ${error.message}`);
              }
            }
          }
        }
      }
    } catch (error) {
      errors.push(`Error cleaning invoices: ${error.message}`);
    }

    // Clean up index files
    await cleanupIndexes(removedProjectIds, removedTaskIds, removedGigIds);

    const duration = Date.now() - startTime;

    console.log('\n📊 Cleanup Results:');
    console.log(`✅ Total items found: ${totalItemsFound}`);
    console.log(`🗑️ Total items removed: ${totalItemsRemoved}`);
    console.log(`⏱️ Duration: ${duration}ms`);
    console.log(`📁 Gigs removed: ${gigsRemoved}`);
    console.log(`📋 Projects removed: ${projectsRemoved}`);
    console.log(`📝 Tasks removed: ${tasksRemoved}`);
    console.log(`🧾 Invoices removed: ${invoicesRemoved}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log('\n🎉 Systematic cleanup completed!');

    process.exit(errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };

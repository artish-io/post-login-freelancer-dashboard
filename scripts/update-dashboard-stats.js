#!/usr/bin/env node

/**
 * Dashboard Stats Generator
 * 
 * This script calculates accurate dashboard statistics from project-tasks.json and projects.json
 * and updates dashboard-stats.json with the computed values.
 */

const fs = require('fs');
const path = require('path');

// File paths
const PROJECTS_FILE = path.join(__dirname, '../data/projects.json');
const PROJECT_TASKS_FILE = path.join(__dirname, '../data/project-tasks.json');
const DASHBOARD_STATS_FILE = path.join(__dirname, '../data/dashboard-stats.json');

/**
 * Load JSON data from file
 */
function loadJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Save JSON data to file
 */
function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Updated ${filePath}`);
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
  }
}

/**
 * Check if a date is within the next 3 days (for "tasks today")
 */
function isWithinThreeDays(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0); // Start of the task date

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Within 3 days: today (0), tomorrow (1), day after (2), day after that (3)
  return diffDays >= 0 && diffDays <= 3;
}

/**
 * Check if a date is overdue or upcoming (for deadlines)
 */
function isUpcomingOrOverdue(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0); // Start of the deadline date

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Overdue (negative days) or upcoming within 7 days
  return diffDays <= 7;
}

/**
 * Check if a date is overdue (past due)
 */
function isOverdue(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0); // Start of the deadline date

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Only overdue (past due)
  return diffDays < 0;
}

/**
 * Check if a project is active (ongoing)
 */
function isActiveProject(status) {
  const activeStatuses = ['Ongoing', 'In Progress', 'Active', 'Started', 'Delayed'];
  const inactiveStatuses = ['Completed', 'Cancelled', 'Paused', 'On Hold', 'Suspended'];

  // Case-insensitive check
  const normalizedStatus = status.toLowerCase();

  // Check if it's explicitly inactive
  if (inactiveStatuses.some(inactive => normalizedStatus.includes(inactive.toLowerCase()))) {
    return false;
  }

  // Check if it's explicitly active or assume active if not in inactive list
  return activeStatuses.some(active => normalizedStatus.includes(active.toLowerCase())) ||
         !inactiveStatuses.some(inactive => normalizedStatus.includes(inactive.toLowerCase()));
}

/**
 * Calculate dashboard stats for a specific user
 */
function calculateUserStats(userId, projects, projectTasks) {
  console.log(`📊 Calculating stats for user ${userId}...`);

  // Get user's projects
  const userProjects = projects.filter(project =>
    String(project.freelancerId) === String(userId)
  );

  console.log(`   Found ${userProjects.length} total projects for user ${userId}`);

  // Count ongoing projects (only active projects)
  const ongoingProjects = userProjects.filter(project =>
    isActiveProject(project.status)
  ).length;

  console.log(`   Active project statuses: ${userProjects.map(p => p.status).join(', ')}`);

  // Get all tasks for user's projects
  let tasksToday = 0;
  let upcomingDeadlines = 0;
  let overdueDeadlines = 0;
  let totalTasks = 0;
  let completedTasks = 0;

  // Check project-level deadlines first
  userProjects.forEach(project => {
    if (project.dueDate && isActiveProject(project.status)) {
      if (isOverdue(project.dueDate)) {
        overdueDeadlines++;
        console.log(`   🔴 Project OVERDUE: "${project.title}" due ${project.dueDate} (${project.status})`);
      }
      if (isUpcomingOrOverdue(project.dueDate)) {
        upcomingDeadlines++;
        console.log(`   📅 Project deadline: "${project.title}" due ${project.dueDate} (${project.status})`);
      }
    }
  });

  // Check task-level deadlines
  userProjects.forEach(project => {
    const projectTaskData = projectTasks.find(pt => pt.projectId === project.projectId);

    if (projectTaskData && projectTaskData.tasks) {
      projectTaskData.tasks.forEach(task => {
        totalTasks++;

        if (task.completed) {
          completedTasks++;
        }

        // Count tasks due within 3 days that are not completed
        if (task.dueDate && isWithinThreeDays(task.dueDate) && !task.completed) {
          tasksToday++;
          console.log(`   📋 Task within 3 days: "${task.title}" due ${task.dueDate}`);
        }

        // Count upcoming/overdue deadlines (tasks not completed)
        if (task.dueDate && !task.completed) {
          if (isOverdue(task.dueDate)) {
            overdueDeadlines++;
            console.log(`   🔴 Task OVERDUE: "${task.title}" due ${task.dueDate} (${task.status})`);
          }
          if (isUpcomingOrOverdue(task.dueDate)) {
            upcomingDeadlines++;
            console.log(`   ⏰ Task deadline: "${task.title}" due ${task.dueDate} (${task.status})`);
          }
        }
      });
    }
  });

  console.log(`   📋 Tasks within 3 days: ${tasksToday}`);
  console.log(`   🏗️ Ongoing projects: ${ongoingProjects}`);
  console.log(`   ⏰ Upcoming/overdue deadlines: ${upcomingDeadlines}`);
  console.log(`   🔴 Past due deadlines: ${overdueDeadlines}`);
  console.log(`   📊 Task completion: ${completedTasks}/${totalTasks} tasks completed`);

  return {
    userId: String(userId),
    tasksToday,
    ongoingProjects,
    upcomingDeadlines,
    overdueDeadlines
  };
}

/**
 * Main function to update dashboard stats
 */
function updateDashboardStats() {
  console.log('🚀 Starting dashboard stats update...\n');
  
  // Load data files
  const projects = loadJsonFile(PROJECTS_FILE);
  const projectTasks = loadJsonFile(PROJECT_TASKS_FILE);
  
  if (!projects || !projectTasks) {
    console.error('❌ Failed to load required data files');
    return;
  }
  
  console.log(`📁 Loaded ${projects.length} projects`);
  console.log(`📁 Loaded ${projectTasks.length} project task groups\n`);
  
  // Get unique user IDs from projects
  const userIds = [...new Set(projects.map(p => p.freelancerId))].filter(Boolean);
  console.log(`👥 Found ${userIds.length} unique users: ${userIds.join(', ')}\n`);
  
  // Calculate stats for each user
  const dashboardStats = userIds.map(userId => 
    calculateUserStats(userId, projects, projectTasks)
  );
  
  // Save updated stats
  saveJsonFile(DASHBOARD_STATS_FILE, dashboardStats);
  
  console.log('\n✨ Dashboard stats update completed!');
  console.log('\n📊 Summary:');
  dashboardStats.forEach(stats => {
    console.log(`   User ${stats.userId}: ${stats.tasksToday} tasks today, ${stats.ongoingProjects} ongoing projects, ${stats.upcomingDeadlines} upcoming deadlines (${stats.overdueDeadlines} past due)`);
  });
}

// Run the update
if (require.main === module) {
  updateDashboardStats();
}

module.exports = { updateDashboardStats, calculateUserStats };

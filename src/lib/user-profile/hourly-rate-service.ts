/**
 * Hourly Rate Management Service
 * 
 * Handles hourly rate editing restrictions and 60-day cooldown logic
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export interface HourlyRateEditAttempt {
  userId: number;
  previousRate: string;
  newRate: string;
  attemptedAt: string;
  allowed: boolean;
  reason?: string;
  daysRemaining?: number;
}

export interface HourlyRateHistory {
  userId: number;
  rateChanges: Array<{
    previousRate: string;
    newRate: string;
    changedAt: string;
    reason?: string;
  }>;
  lastEditDate?: string;
}

const RATE_EDIT_COOLDOWN_DAYS = 60;
const RATE_HISTORY_PATH = path.join(process.cwd(), 'data', 'user-rate-history.json');

/**
 * Check if user can edit their hourly rate (60-day cooldown)
 */
export async function canEditHourlyRate(userId: number): Promise<{
  canEdit: boolean;
  daysRemaining: number;
  lastEditDate?: string;
  message: string;
}> {
  try {
    const rateHistory = await getRateHistory(userId);
    
    if (!rateHistory.lastEditDate) {
      return {
        canEdit: true,
        daysRemaining: 0,
        message: 'You can edit your hourly rate'
      };
    }

    const lastEditDate = new Date(rateHistory.lastEditDate);
    const now = new Date();
    const daysSinceLastEdit = Math.floor((now.getTime() - lastEditDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastEdit >= RATE_EDIT_COOLDOWN_DAYS) {
      return {
        canEdit: true,
        daysRemaining: 0,
        lastEditDate: rateHistory.lastEditDate,
        message: 'You can edit your hourly rate'
      };
    }

    const daysRemaining = RATE_EDIT_COOLDOWN_DAYS - daysSinceLastEdit;
    
    return {
      canEdit: false,
      daysRemaining,
      lastEditDate: rateHistory.lastEditDate,
      message: `You can edit your hourly rate in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
    };

  } catch (error) {
    console.error('Error checking rate edit eligibility:', error);
    // Default to allowing edit if we can't check history
    return {
      canEdit: true,
      daysRemaining: 0,
      message: 'You can edit your hourly rate'
    };
  }
}

/**
 * Attempt to update user's hourly rate with cooldown validation
 */
export async function updateHourlyRate(
  userId: number, 
  newRate: string, 
  currentRate?: string
): Promise<HourlyRateEditAttempt> {
  try {
    const eligibilityCheck = await canEditHourlyRate(userId);
    
    if (!eligibilityCheck.canEdit) {
      return {
        userId,
        previousRate: currentRate || 'unknown',
        newRate,
        attemptedAt: new Date().toISOString(),
        allowed: false,
        reason: `Rate editing is on cooldown. ${eligibilityCheck.message}`,
        daysRemaining: eligibilityCheck.daysRemaining
      };
    }

    // Update the user's rate in the main users data
    await updateUserRateInDatabase(userId, newRate, currentRate);
    
    // Record the rate change in history
    await recordRateChange(userId, currentRate || 'unknown', newRate);

    return {
      userId,
      previousRate: currentRate || 'unknown',
      newRate,
      attemptedAt: new Date().toISOString(),
      allowed: true,
      reason: 'Rate updated successfully'
    };

  } catch (error) {
    console.error('Error updating hourly rate:', error);
    return {
      userId,
      previousRate: currentRate || 'unknown',
      newRate,
      attemptedAt: new Date().toISOString(),
      allowed: false,
      reason: `Failed to update rate: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get rate change history for a user
 */
async function getRateHistory(userId: number): Promise<HourlyRateHistory> {
  try {
    const data = await readFile(RATE_HISTORY_PATH, 'utf-8');
    const allHistory = JSON.parse(data);
    
    return allHistory.find((h: HourlyRateHistory) => h.userId === userId) || {
      userId,
      rateChanges: []
    };
  } catch (error) {
    // File doesn't exist or is invalid, return empty history
    return {
      userId,
      rateChanges: []
    };
  }
}

/**
 * Record a rate change in the history
 */
async function recordRateChange(userId: number, previousRate: string, newRate: string): Promise<void> {
  try {
    let allHistory: HourlyRateHistory[] = [];
    
    try {
      const data = await readFile(RATE_HISTORY_PATH, 'utf-8');
      allHistory = JSON.parse(data);
    } catch {
      // File doesn't exist, start with empty array
    }

    const userHistoryIndex = allHistory.findIndex(h => h.userId === userId);
    const changeRecord = {
      previousRate,
      newRate,
      changedAt: new Date().toISOString()
    };

    if (userHistoryIndex >= 0) {
      // Update existing user history
      allHistory[userHistoryIndex].rateChanges.push(changeRecord);
      allHistory[userHistoryIndex].lastEditDate = changeRecord.changedAt;
    } else {
      // Create new user history
      allHistory.push({
        userId,
        rateChanges: [changeRecord],
        lastEditDate: changeRecord.changedAt
      });
    }

    // Ensure directory exists
    const dir = path.dirname(RATE_HISTORY_PATH);
    await ensureDirectoryExists(dir);
    
    await writeFile(RATE_HISTORY_PATH, JSON.stringify(allHistory, null, 2));
    
  } catch (error) {
    console.error('Error recording rate change:', error);
    throw error;
  }
}

/**
 * Update user's rate in the main database
 */
async function updateUserRateInDatabase(userId: number, newRate: string, previousRate?: string): Promise<void> {
  try {
    // Update in users.json
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const usersData = await readFile(usersPath, 'utf-8');
    const users = JSON.parse(usersData);
    
    const userIndex = users.findIndex((u: any) => u.id === userId);
    if (userIndex >= 0) {
      users[userIndex].rate = newRate;
      users[userIndex].updatedAt = new Date().toISOString();
      await writeFile(usersPath, JSON.stringify(users, null, 2));
    }

    // Also update in freelancers.json if exists
    try {
      const freelancersPath = path.join(process.cwd(), 'data', 'freelancers.json');
      const freelancersData = await readFile(freelancersPath, 'utf-8');
      const freelancers = JSON.parse(freelancersData);
      
      const freelancerIndex = freelancers.findIndex((f: any) => f.userId === userId);
      if (freelancerIndex >= 0) {
        freelancers[freelancerIndex].hourlyRate = newRate;
        freelancers[freelancerIndex].minRate = extractMinRate(newRate);
        freelancers[freelancerIndex].maxRate = extractMaxRate(newRate);
        freelancers[freelancerIndex].updatedAt = new Date().toISOString();
        await writeFile(freelancersPath, JSON.stringify(freelancers, null, 2));
      }
    } catch {
      // freelancers.json might not exist, that's okay
    }

  } catch (error) {
    console.error('Error updating user rate in database:', error);
    throw error;
  }
}

/**
 * Extract minimum rate from rate string (e.g., "$50 - $75/hr" -> 50)
 */
function extractMinRate(rateString: string): number {
  const match = rateString.match(/\$(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Extract maximum rate from rate string (e.g., "$50 - $75/hr" -> 75)
 */
function extractMaxRate(rateString: string): number {
  const matches = rateString.match(/\$(\d+)/g);
  if (matches && matches.length >= 2) {
    return parseInt(matches[1].replace('$', ''));
  }
  return extractMinRate(rateString);
}

/**
 * Ensure directory exists
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    const { mkdir } = await import('fs/promises');
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's okay
  }
}

/**
 * Get user's current hourly rate
 */
export async function getCurrentHourlyRate(userId: number): Promise<string | null> {
  try {
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const usersData = await readFile(usersPath, 'utf-8');
    const users = JSON.parse(usersData);
    
    const user = users.find((u: any) => u.id === userId);
    return user?.rate || null;
  } catch (error) {
    console.error('Error getting current hourly rate:', error);
    return null;
  }
}

/**
 * Calculate project budget based on freelancer rate and project constraints
 */
export function calculateProjectBudget(
  freelancerRate: string,
  projectBudgetRange: { min?: number; max?: number },
  estimatedHours: number = 40
): {
  finalRate: number;
  totalBudget: number;
  rateSource: 'freelancer' | 'project_limit';
  explanation: string;
} {
  const freelancerMinRate = extractMinRate(freelancerRate);
  const freelancerMaxRate = extractMaxRate(freelancerRate);
  const freelancerAvgRate = (freelancerMinRate + freelancerMaxRate) / 2;
  
  const freelancerBudget = freelancerAvgRate * estimatedHours;
  const projectMaxBudget = projectBudgetRange.max || Infinity;
  
  if (freelancerBudget <= projectMaxBudget) {
    // Freelancer rate fits within project budget
    return {
      finalRate: freelancerAvgRate,
      totalBudget: freelancerBudget,
      rateSource: 'freelancer',
      explanation: `Using freelancer's rate of $${freelancerAvgRate}/hr for ${estimatedHours} hours`
    };
  } else {
    // Project budget limits the rate
    const limitedRate = projectMaxBudget / estimatedHours;
    return {
      finalRate: limitedRate,
      totalBudget: projectMaxBudget,
      rateSource: 'project_limit',
      explanation: `Project budget limits rate to $${limitedRate.toFixed(2)}/hr (freelancer requested $${freelancerAvgRate}/hr)`
    };
  }
}

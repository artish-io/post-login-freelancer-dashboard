/**
 * Commissioner Cumulative Totals Service
 * 
 * Provides comprehensive commissioner spending calculation and backfill functionality.
 * Ensures all commissioners have accurate cumulative totals derived from executed payments.
 */

import { getAllInvoices, type Invoice } from './invoice-storage';
import { UnifiedStorageService } from './storage/unified-storage-service';
import { getAllUsers, getAllOrganizations } from './storage/unified-storage-service';
import { writeJsonAtomic } from './fs-json';
import path from 'path';

export interface CommissionerTotal {
  commissionerId: number;
  organizationId?: number;
  totalSpent: number;
  projectsCount: number;
  lastActivityAt: string;
  calculatedAt: string;
}

export interface CommissionerTotalsIndex {
  [commissionerId: string]: CommissionerTotal;
}

const TOTALS_INDEX_PATH = path.join(process.cwd(), 'data', 'commissioner-totals.json');

/**
 * Calculate comprehensive commissioner totals from executed payments
 */
export async function calculateCommissionerTotals(commissionerId: number): Promise<CommissionerTotal> {
  try {
    // Get all invoices for this commissioner
    const allInvoices = await getAllInvoices({ commissionerId });
    
    // Filter to only paid invoices (executed payments)
    const paidInvoices = allInvoices.filter(invoice => 
      invoice.status === 'paid' && 
      invoice.commissionerId === commissionerId
    );

    // Calculate total spent from executed payments
    const totalSpent = paidInvoices.reduce((sum, invoice) => {
      return sum + (invoice.totalAmount || 0);
    }, 0);

    // Count unique projects
    const uniqueProjectIds = new Set(paidInvoices.map(invoice => invoice.projectId));
    const projectsCount = uniqueProjectIds.size;

    // Find last activity date
    const lastActivityAt = paidInvoices.length > 0
      ? paidInvoices
          .map(invoice => invoice.paymentDetails?.processedAt || invoice.paidDate || invoice.sentDate || (invoice as any).generatedAt)
          .filter(date => date)
          .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || new Date().toISOString()
      : new Date().toISOString();

    // Find organization ID for this commissioner
    const organizations = await getAllOrganizations();
    const organization = organizations.find((org: any) =>
      org.contactPersonId === commissionerId ||
      org.firstCommissionerId === commissionerId ||
      org.associatedCommissioners?.includes(commissionerId)
    );

    return {
      commissionerId,
      organizationId: organization?.id,
      totalSpent: Number(totalSpent.toFixed(2)),
      projectsCount,
      lastActivityAt,
      calculatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error calculating totals for commissioner ${commissionerId}:`, error);
    return {
      commissionerId,
      totalSpent: 0,
      projectsCount: 0,
      lastActivityAt: new Date().toISOString(),
      calculatedAt: new Date().toISOString()
    };
  }
}

/**
 * Backfill commissioner totals for all commissioners
 */
export async function backfillAllCommissionerTotals(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  try {
    // Get all users who are commissioners
    const allUsers = await getAllUsers();
    const commissioners = allUsers.filter((user: any) => user.type === 'commissioner');

    console.log(`🔄 Backfilling totals for ${commissioners.length} commissioners...`);

    // Load existing totals index
    let existingTotals: CommissionerTotalsIndex = {};
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(TOTALS_INDEX_PATH, 'utf-8');
      existingTotals = JSON.parse(data);
    } catch {
      // File doesn't exist yet, start fresh
      console.log('📝 Creating new commissioner totals index...');
    }

    // Calculate totals for each commissioner
    for (const commissioner of commissioners) {
      try {
        console.log(`📊 Calculating totals for commissioner ${commissioner.id}...`);
        
        const totals = await calculateCommissionerTotals(commissioner.id);
        existingTotals[commissioner.id.toString()] = totals;
        updated++;

        console.log(`✅ Commissioner ${commissioner.id}: $${totals.totalSpent} across ${totals.projectsCount} projects`);
      } catch (error) {
        const errorMsg = `Failed to calculate totals for commissioner ${commissioner.id}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Save updated totals index
    await writeJsonAtomic(TOTALS_INDEX_PATH, existingTotals);
    console.log(`💾 Saved commissioner totals to ${TOTALS_INDEX_PATH}`);

    return { updated, errors };
  } catch (error) {
    const errorMsg = `Failed to backfill commissioner totals: ${error}`;
    console.error(errorMsg);
    return { updated, errors: [errorMsg] };
  }
}

/**
 * Get commissioner totals from index (with fallback calculation)
 */
export async function getCommissionerTotals(commissionerId: number): Promise<CommissionerTotal> {
  try {
    // Try to read from index first
    const fs = await import('fs/promises');
    const data = await fs.readFile(TOTALS_INDEX_PATH, 'utf-8');
    const totalsIndex: CommissionerTotalsIndex = JSON.parse(data);
    
    const cached = totalsIndex[commissionerId.toString()];
    if (cached) {
      return cached;
    }
  } catch {
    // Index doesn't exist or is corrupted, fall back to calculation
  }

  // Fallback: calculate on demand
  console.log(`🔄 Calculating totals on demand for commissioner ${commissionerId}...`);
  return await calculateCommissionerTotals(commissionerId);
}

/**
 * Recalculate totals for a specific commissioner (idempotent)
 */
export async function recalculateCommissionerTotals(commissionerId: number): Promise<CommissionerTotal> {
  try {
    // Calculate fresh totals
    const totals = await calculateCommissionerTotals(commissionerId);

    // Update index
    let existingTotals: CommissionerTotalsIndex = {};
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(TOTALS_INDEX_PATH, 'utf-8');
      existingTotals = JSON.parse(data);
    } catch {
      // Index doesn't exist, create new one
    }

    existingTotals[commissionerId.toString()] = totals;
    await writeJsonAtomic(TOTALS_INDEX_PATH, existingTotals);

    console.log(`✅ Recalculated totals for commissioner ${commissionerId}: $${totals.totalSpent}`);
    return totals;
  } catch (error) {
    console.error(`Error recalculating totals for commissioner ${commissionerId}:`, error);
    throw error;
  }
}

/**
 * Get all commissioner totals from index
 */
export async function getAllCommissionerTotals(): Promise<CommissionerTotalsIndex> {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(TOTALS_INDEX_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

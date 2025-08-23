import { NextResponse, NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err } from '@/lib/http/envelope';
import { getAllInvoices } from '@/lib/invoice-storage';

/**
 * Sync project paidToDate field with actual paid invoices
 * This route ensures that project.paidToDate accurately reflects the total amount paid
 * from all paid invoices, regardless of whether the field was properly updated before.
 * 
 * POST /api/projects/sync-paid-to-date
 * Body: { projectId: string } or { syncAll: true }
 */
export async function POST(req: NextRequest) {
  try {
    console.log(`[SYNC_DEBUG] Route called`);

    const body = await req.json();
    console.log(`[SYNC_DEBUG] Body parsed:`, body);

    const { projectId, syncAll } = sanitizeApiInput(body);
    console.log(`[SYNC_DEBUG] Sanitized input:`, { projectId, syncAll });

    if (!projectId && !syncAll) {
      return NextResponse.json({ error: 'Either projectId or syncAll must be provided' }, { status: 400 });
    }

    if (syncAll) {
      // Sync all completion-based projects
      const results = await syncAllProjectsPaidToDate();
      return NextResponse.json({
        success: true,
        message: `Synced paidToDate for ${results.updated} projects`,
        results
      });
    } else {
      // Sync specific project
      console.log(`[SYNC_DEBUG] Starting sync for project ${projectId}`);
      const result = await syncProjectPaidToDate(projectId);
      console.log(`[SYNC_DEBUG] Sync result:`, result);

      if (!result.found) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `Project ${projectId} paidToDate synced`,
        result
      });
    }
  } catch (error) {
    console.error(`[SYNC_DEBUG] Route error:`, error);
    return NextResponse.json({
      error: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

/**
 * Sync paidToDate for a specific project
 */
async function syncProjectPaidToDate(projectId: string): Promise<{
  found: boolean;
  updated: boolean;
  oldPaidToDate: number;
  newPaidToDate: number;
  totalPaidFromInvoices: number;
}> {
  try {
    // Read project using hierarchical storage
    const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
    const project = await UnifiedStorageService.readProject(projectId);
    
    if (!project) {
      return {
        found: false,
        updated: false,
        oldPaidToDate: 0,
        newPaidToDate: 0,
        totalPaidFromInvoices: 0
      };
    }
    
    // Calculate total paid from all paid invoices
    const totalPaidFromInvoices = await calculateTotalPaidFromInvoices(projectId);
    
    const oldPaidToDate = project.paidToDate || 0;
    const needsUpdate = Math.abs(oldPaidToDate - totalPaidFromInvoices) > 0.01; // Allow for small rounding differences
    
    if (needsUpdate) {
      // Update project with correct paidToDate
      const updatedProject = {
        ...project,
        paidToDate: totalPaidFromInvoices,
        updatedAt: new Date().toISOString()
      };
      
      await UnifiedStorageService.writeProject(updatedProject);
      
      console.log(`[SYNC_PAID_TO_DATE] Updated project ${projectId}: ${oldPaidToDate} -> ${totalPaidFromInvoices}`);
    }
    
    return {
      found: true,
      updated: needsUpdate,
      oldPaidToDate,
      newPaidToDate: totalPaidFromInvoices,
      totalPaidFromInvoices
    };
  } catch (error) {
    console.error(`[SYNC_PAID_TO_DATE] Error syncing project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Sync paidToDate for all completion-based projects
 */
async function syncAllProjectsPaidToDate(): Promise<{
  total: number;
  updated: number;
  errors: string[];
  details: Array<{
    projectId: string;
    oldPaidToDate: number;
    newPaidToDate: number;
    updated: boolean;
  }>;
}> {
  try {
    // Get all projects
    const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
    const allProjects = await UnifiedStorageService.getAllProjects();
    
    // Filter to completion-based projects only
    const completionProjects = allProjects.filter(project => 
      project.invoicingMethod === 'completion'
    );
    
    const results = {
      total: completionProjects.length,
      updated: 0,
      errors: [] as string[],
      details: [] as Array<{
        projectId: string;
        oldPaidToDate: number;
        newPaidToDate: number;
        updated: boolean;
      }>
    };
    
    for (const project of completionProjects) {
      try {
        const syncResult = await syncProjectPaidToDate(project.projectId);
        
        if (syncResult.found) {
          results.details.push({
            projectId: project.projectId,
            oldPaidToDate: syncResult.oldPaidToDate,
            newPaidToDate: syncResult.newPaidToDate,
            updated: syncResult.updated
          });
          
          if (syncResult.updated) {
            results.updated++;
          }
        }
      } catch (error) {
        const errorMsg = `Failed to sync project ${project.projectId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(`[SYNC_PAID_TO_DATE] ${errorMsg}`);
      }
    }
    
    return results;
  } catch (error) {
    console.error('[SYNC_PAID_TO_DATE] Error syncing all projects:', error);
    throw error;
  }
}

/**
 * Calculate total paid amount from all paid invoices for a project
 */
async function calculateTotalPaidFromInvoices(projectId: string): Promise<number> {
  try {
    // Get all invoices for this project
    const allInvoices = await getAllInvoices({ projectId });
    
    // Calculate total paid amount from all paid invoices
    const totalPaidAmount = allInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
    
    return Math.round(totalPaidAmount * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error(`[SYNC_PAID_TO_DATE] Error calculating total paid for project ${projectId}:`, error);
    return 0;
  }
}

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { sumPaidInvoicesByProject } from '@/lib/storage/invoices-hierarchical';

/**
 * Reconcile project paidToDate from actual paid invoices
 * POST /api/projects/reconcile/paid-to-date
 * Body: { projectId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
    }
    
    // Read current project
    const project = await UnifiedStorageService.readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Only reconcile completion projects
    if (project.invoicingMethod !== 'completion') {
      return NextResponse.json({ 
        error: 'Reconciliation only supported for completion projects',
        projectId,
        invoicingMethod: project.invoicingMethod
      }, { status: 400 });
    }
    
    // Sum all paid invoices for this project
    const paidSummary = await sumPaidInvoicesByProject(projectId);
    
    // Update project with reconciled paidToDate
    const updatedProject = {
      ...project,
      paidToDate: paidSummary.totalPaid,
      lastReconciled: new Date().toISOString()
    };
    
    await UnifiedStorageService.writeProject(updatedProject as any);
    
    return NextResponse.json({
      success: true,
      projectId,
      reconciliation: {
        previousPaidToDate: project.paidToDate || 0,
        newPaidToDate: paidSummary.totalPaid,
        difference: paidSummary.totalPaid - (project.paidToDate || 0),
        invoiceCount: paidSummary.invoiceCount,
        invoices: paidSummary.invoices
      }
    });
    
  } catch (error) {
    console.error('Error reconciling paid-to-date:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get reconciliation status for a project
 * GET /api/projects/reconcile/paid-to-date?projectId=Z-007
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'projectId parameter required' }, { status: 400 });
    }
    
    // Read current project
    const project = await UnifiedStorageService.readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Get paid invoice summary
    const paidSummary = await sumPaidInvoicesByProject(projectId);
    
    return NextResponse.json({
      projectId,
      invoicingMethod: project.invoicingMethod,
      currentPaidToDate: project.paidToDate || 0,
      actualPaidTotal: paidSummary.totalPaid,
      needsReconciliation: (project.paidToDate || 0) !== paidSummary.totalPaid,
      difference: paidSummary.totalPaid - (project.paidToDate || 0),
      lastReconciled: project.lastReconciled || null,
      paidInvoices: paidSummary.invoices
    });
    
  } catch (error) {
    console.error('Error getting reconciliation status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

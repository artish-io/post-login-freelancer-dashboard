import { NextRequest, NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { getAllInvoices } from '@/lib/invoice-storage';

/**
 * Fix paidToDate for completion projects
 * POST /api/projects/fix-paid-to-date
 * Body: { projectId: string } or { all: true }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, all } = body;
    
    if (!projectId && !all) {
      return NextResponse.json({ error: 'Provide projectId or set all: true' }, { status: 400 });
    }
    
    const results = [];
    
    if (projectId) {
      // Fix single project
      const result = await fixProjectPaidToDate(projectId);
      results.push(result);
    } else if (all) {
      // Fix all completion projects (for testing)
      const projectIds = ['Z-007']; // Add more as needed
      for (const id of projectIds) {
        const result = await fixProjectPaidToDate(id);
        results.push(result);
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    });
    
  } catch (error) {
    console.error('Error fixing paidToDate:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function fixProjectPaidToDate(projectId: string) {
  try {
    // Read project
    const project = await UnifiedStorageService.readProject(projectId);
    if (!project) {
      return { projectId, error: 'Project not found' };
    }
    
    // Only fix completion projects
    if (project.invoicingMethod !== 'completion') {
      return { projectId, skipped: 'Not a completion project' };
    }
    
    // Get all paid invoices for this project
    const allInvoices = await getAllInvoices({ projectId });
    const paidInvoices = allInvoices.filter(inv => inv.status === 'paid');
    
    // Calculate total paid amount
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    const oldPaidToDate = project.paidToDate || 0;
    
    // Update project
    await UnifiedStorageService.writeProject(projectId, {
      ...project,
      paidToDate: totalPaid,
      updatedAt: new Date().toISOString()
    });
    
    return {
      projectId,
      fixed: true,
      oldPaidToDate,
      newPaidToDate: totalPaid,
      difference: totalPaid - oldPaidToDate,
      paidInvoices: paidInvoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        amount: inv.totalAmount,
        type: inv.invoiceType || 'manual'
      }))
    };
    
  } catch (error) {
    return { 
      projectId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

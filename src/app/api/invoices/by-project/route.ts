import { NextRequest, NextResponse } from 'next/server';
import { getAllInvoices } from '@/lib/invoice-storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    // Get all invoices and filter by project ID
    const allInvoices = await getAllInvoices();
    const projectInvoices = allInvoices.filter(invoice => 
      invoice.projectId?.toString() === projectId.toString()
    );
    
    return NextResponse.json(projectInvoices);
  } catch (error) {
    console.error('Error fetching invoices by project:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

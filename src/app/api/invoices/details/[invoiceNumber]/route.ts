import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { getAllInvoices } from '../../../../../lib/invoice-storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  const { invoiceNumber } = await params;

  try {
    const [invoices, users, organizations] = await Promise.all([
      getAllInvoices(), // Use hierarchical storage for invoices
      import('@/lib/storage/unified-storage-service').then(m => m.getAllUsers()),
      import('@/lib/storage/unified-storage-service').then(m => m.getAllOrganizations())
    ]);

    // invoices, users, and organizations are already parsed from hierarchical storage

    // Find the invoice by invoice number
    const invoice = invoices.find((inv: any) => inv.invoiceNumber === invoiceNumber);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Enhance invoice with freelancer and commissioner details
    const freelancer = users.find((user: any) => user.id === invoice.freelancerId);
    const commissioner = users.find((user: any) => user.id === invoice.commissionerId);

    let organization = null;
    if (commissioner?.organizationId) {
      organization = organizations.find((org: any) => org.id === commissioner.organizationId);
    }

    const enhancedInvoice = {
      ...invoice,
      freelancer: freelancer ? {
        id: freelancer.id,
        name: freelancer.name,
        email: freelancer.email,
        avatar: freelancer.avatar,
        title: freelancer.title,
        address: freelancer.address || '133 Grey Fox Farm Road, Hidden Leaf village, Land of fire.'
      } : null,
      commissioner: commissioner ? {
        id: commissioner.id,
        name: commissioner.name,
        email: commissioner.email,
        organizationId: commissioner.organizationId,
        organization: organization ? {
          name: organization.name,
          logo: organization.logo,
          address: organization.address
        } : null
      } : null
    };

    return NextResponse.json(enhancedInvoice);
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

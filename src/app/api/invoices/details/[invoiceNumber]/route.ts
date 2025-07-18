import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(
  request: Request,
  { params }: { params: { invoiceNumber: string } }
) {
  const { invoiceNumber } = params;

  try {
    const invoicesPath = path.join(process.cwd(), 'data/invoices.json');
    const usersPath = path.join(process.cwd(), 'data/users.json');
    const organizationsPath = path.join(process.cwd(), 'data/organizations.json');

    const [invoicesData, usersData, organizationsData] = await Promise.all([
      fs.readFile(invoicesPath, 'utf-8'),
      fs.readFile(usersPath, 'utf-8'),
      fs.readFile(organizationsPath, 'utf-8')
    ]);

    const invoices = JSON.parse(invoicesData);
    const users = JSON.parse(usersData);
    const organizations = JSON.parse(organizationsData);

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

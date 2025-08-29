// src/app/api/dashboard/invoices/create/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { saveInvoice, getAllInvoices, updateInvoice } from '../../../../lib/invoice-storage';
import { readProject } from '../../../../lib/projects-utils';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

const ALLOWED_STATUSES = ['draft', 'sent', 'paid'];
const ALLOWED_EXECUTION_MODES = ['milestone', 'completion'];

export async function POST(request: Request) {
  try {
    // 🔒 SECURITY: Verify session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const {
      freelancerId,
      projectId,
      client,
      projectTitle,
      issueDate,
      dueDate,
      milestones,
      totalAmount,
      status,
      executionMode,
    } = body;

    const sessionUserId = parseInt(session.user.id);

    if (
      !freelancerId ||
      !projectId ||
      !client ||
      !projectTitle ||
      !issueDate ||
      !executionMode ||
      !ALLOWED_EXECUTION_MODES.includes(executionMode) ||
      !Array.isArray(milestones) ||
      milestones.length === 0 ||
      typeof totalAmount !== 'number' ||
      (status && !ALLOWED_STATUSES.includes(status))
    ) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // 🔒 SECURITY: Verify freelancer can only create invoices for their own projects
    if (freelancerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: You can only create invoices for your own projects'
      }, { status: 403 });
    }

    // 🔒 SECURITY: Verify project exists and freelancer is assigned to it
    const project = await readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.freelancerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: You are not assigned to this project'
      }, { status: 403 });
    }

    for (const milestone of milestones) {
      if (!milestone.title || typeof milestone.amount !== 'number') {
        return NextResponse.json({ error: 'Invalid milestone data' }, { status: 400 });
      }
    }

    // Generate proper invoice number using the modern system
    let invoiceNumber: string;
    try {
      // Get freelancer name for invoice number generation
      const freelancer = await UnifiedStorageService.getUserById(freelancerId);
      const freelancerName = freelancer?.name || 'Generic User';

      // Generate invoice number using freelancer initials (always TB-001, TB-002, etc.)
      // Invoice numbers always use freelancer initials, regardless of project type
      const prefix = getInitials(freelancerName);
      const existingInvoices = await getAllInvoices();
      const existingNumbers = new Set(existingInvoices.map((inv: any) => inv.invoiceNumber));

      let maxCounter = 0;
      const pattern = new RegExp(`^${prefix}-(\\d+)$`);

      for (const existingNumber of existingNumbers) {
        const match = existingNumber.match(pattern);
        if (match) {
          const counter = parseInt(match[1], 10);
          if (counter > maxCounter) {
            maxCounter = counter;
          }
        }
      }

      const nextCounter = maxCounter + 1;
      const paddedCounter = nextCounter.toString().padStart(3, '0');
      invoiceNumber = `${prefix}-${paddedCounter}`;
    } catch (error) {
      console.error('Failed to generate modern invoice number, using fallback:', error);
      const newInvoiceId = Math.floor(100000 + Math.random() * 900000);
      invoiceNumber = `INV-${newInvoiceId}`;
    }

    const newInvoice = {
      invoiceNumber,
      freelancerId,
      projectId,
      commissionerId: client,
      projectTitle,
      issueDate,
      dueDate,
      totalAmount,
      status: status || 'draft',
      invoiceType: 'manual' as const, // Mark as manually created
      milestones,
      isManualInvoice: true, // Flag for manual invoices
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Helper function for initials (same as in generate-number route)
    function getInitials(name: string) {
      const parts = name.trim().split(' ');
      const initials = parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
      return initials || 'XX';
    }

    await saveInvoice(newInvoice);

    return NextResponse.json(
      {
        message: 'Invoice created successfully',
        invoiceNumber: newInvoice.invoiceNumber,
        invoiceId: newInvoice.invoiceNumber // For backward compatibility
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const {
      id,
      freelancerId,
      projectId,
      projectTitle,
      issueDate,
      dueDate,
      milestones,
      totalAmount,
      status,
    } = body;

    if (!id || (status && !ALLOWED_STATUSES.includes(status))) {
      return NextResponse.json({ error: 'Missing invoice ID or invalid status' }, { status: 400 });
    }

    if (milestones && Array.isArray(milestones)) {
      for (const milestone of milestones) {
        if (!milestone.title || typeof milestone.amount !== 'number') {
          return NextResponse.json({ error: 'Invalid milestone data' }, { status: 400 });
        }
      }
    }

    // Use hierarchical storage to get all invoices
    const invoices = await getAllInvoices();

    const index = invoices.findIndex((inv: any) => inv.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    invoices[index] = {
      ...invoices[index],
      freelancerId,
      projectId,
      projectTitle,
      issueDate,
      dueDate, // OK to update
      milestones,
      totalAmount,
      status,
      updatedAt: new Date().toISOString()
    };

    // Use hierarchical storage to update the invoice
    await updateInvoice(invoices[index].invoiceNumber, invoices[index]);

    return NextResponse.json({ message: 'Invoice updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
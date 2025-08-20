// src/app/api/dashboard/invoices/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { getAllInvoices } from '../../../../lib/invoice-storage';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const userId = Number(userIdParam);

  try {
    const [invoices, users] = await Promise.all([
      getAllInvoices(), // Use hierarchical storage for invoices
      import('@/lib/storage/unified-storage-service').then(m => m.getAllUsers())
    ]);

    // invoices and users are already parsed from hierarchical storage

    // Filter by freelancerId and sort by creation date (newest first)
    const userInvoices = invoices
      .filter((inv: any) => inv.freelancerId === userId)
      .map((inv: any) => {
        const client = users.find((u: any) => u.id === inv.commissionerId);

        return {
          id: inv.invoiceNumber,
          invoiceNumber: inv.invoiceNumber, // Include for React keys
          client: {
            name: client?.name || 'Unknown Client',
            title: client?.title || 'Client',
            avatar: client?.avatar || '/default-avatar.png'
          },
          status: inv.status,
          issueDate: inv.issueDate,
          totalAmount: inv.totalAmount,
          projectTitle: inv.projectTitle,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt
        };
      })
      .sort((a: any, b: any) => {
        // Sort by creation date (newest first)
        // Prioritize createdAt, then updatedAt, then issueDate as fallback
        const aTimestamp = a.createdAt || a.updatedAt || a.issueDate;
        const bTimestamp = b.createdAt || b.updatedAt || b.issueDate;
        const aDate = aTimestamp ? new Date(aTimestamp).getTime() : 0;
        const bDate = bTimestamp ? new Date(bTimestamp).getTime() : 0;
        return bDate - aDate; // Most recent first
      });

    return NextResponse.json(userInvoices);
  } catch (err) {
    console.error('[invoices] Failed to load data:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
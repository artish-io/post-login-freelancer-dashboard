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
    const [invoices, userData] = await Promise.all([
      getAllInvoices(), // Use hierarchical storage for invoices
      fs.readFile(path.join(process.cwd(), 'data/users.json'), 'utf-8')
    ]);

    // invoices is already parsed from hierarchical storage
    const users = JSON.parse(userData);

    // Filter by freelancerId
    const userInvoices = invoices
      .filter((inv: any) => inv.freelancerId === userId)
      .map((inv: any) => {
        const client = users.find((u: any) => u.id === inv.commissionerId);

        return {
          id: inv.invoiceNumber,
          client: {
            name: client?.name || 'Unknown Client',
            title: client?.title || 'Client',
            avatar: client?.avatar || '/default-avatar.png'
          },
          status: inv.status
        };
      });

    return NextResponse.json(userInvoices);
  } catch (err) {
    console.error('[invoices] Failed to load data:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
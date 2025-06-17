// src/app/api/dashboard/invoices/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const userId = Number(userIdParam);

  try {
    const [invoiceData, userData] = await Promise.all([
      fs.readFile(path.join(process.cwd(), 'data/invoices.json'), 'utf-8'),
      fs.readFile(path.join(process.cwd(), 'data/users.json'), 'utf-8')
    ]);

    const invoices = JSON.parse(invoiceData);
    const users = JSON.parse(userData);

    // Filter by freelancerId
    const userInvoices = invoices
      .filter((inv: any) => inv.freelancerId === userId)
      .map((inv: any) => {
        const sender = users.find((u: any) => u.id === userId);

        return {
          ...inv,
          sender: {
            name: sender?.name,
            title: sender?.title,
            avatar: sender?.avatar
          }
        };
      });

    return NextResponse.json(userInvoices);
  } catch (err) {
    console.error('[invoices] Failed to load data:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
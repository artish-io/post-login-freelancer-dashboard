import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getAllInvoices } from '../../../../lib/invoice-storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  console.log('🔍 Earnings API | Received userId:', userId);

  if (!userId) {
    console.log('❌ No userId in query');
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  try {
    // Get all invoices from the new storage system
    const invoices = await getAllInvoices();

    console.log('📦 Loaded invoices for earnings calculation');

    // Find freelancer ID from user ID
    // For now, we'll use the user ID directly as freelancer ID since they should match
    // This avoids the legacy file access issue
    const freelancerId = parseInt(userId);

    if (!freelancerId) {
      console.log('❌ Invalid userId:', userId);
      return NextResponse.json({ amount: 0, currency: 'USD', lastUpdated: null });
    }

    console.log('🎯 Found freelancerId:', freelancerId);

    // Calculate total earnings from paid invoices
    const paidInvoices = invoices.filter((invoice: any) =>
      invoice.freelancerId === freelancerId && invoice.status === 'paid'
    );

    console.log('💰 Found paid invoices:', paidInvoices.length);

    const totalAmount = paidInvoices.reduce((sum: number, invoice: any) => {
      // Use freelancerAmount if available (after platform fees), otherwise use totalAmount
      const amount = invoice.paymentDetails?.freelancerAmount || invoice.totalAmount;
      return sum + amount;
    }, 0);

    // Get the most recent payment date
    const lastUpdated = paidInvoices.length > 0
      ? paidInvoices
          .map((inv: any) => inv.paidDate || inv.paymentDetails?.processedAt)
          .filter(Boolean)
          .sort()
          .pop()
      : null;

    const userEarnings = {
      amount: totalAmount,
      currency: 'USD',
      lastUpdated
    };

    console.log('✅ Calculated earnings for freelancer:', userEarnings);

    return NextResponse.json(userEarnings);
  } catch (err) {
    console.error('🔥 Earnings fetch error:', err);
    return NextResponse.json({ error: 'Failed to load earnings' }, { status: 500 });
  }
}
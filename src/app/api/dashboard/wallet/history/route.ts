import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllInvoices } from '../../../../lib/invoice-storage';

const HISTORY_PATH = path.join(process.cwd(), 'data/wallet/wallet-history.json');
const PURCHASES_PATH = path.join(process.cwd(), 'data/storefront/purchases.json');
const FREELANCERS_PATH = path.join(process.cwd(), 'data/freelancers.json');

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;
    const userIdNum = parseInt(userId);

    // Get freelancer ID from user ID
    const freelancersData = await readFile(FREELANCERS_PATH, 'utf-8');
    const freelancers = JSON.parse(freelancersData);
    const freelancer = freelancers.find((f: any) => f.userId === userIdNum);
    const freelancerId = freelancer?.id;

    if (!freelancerId) {
      console.log(`No freelancer found for userId: ${userId}`);
      return NextResponse.json([]);
    }

    // Build comprehensive transaction history from multiple sources
    const transactions = [];

    // 1. Project earnings from invoices (credits)
    const invoices = await getAllInvoices();
    const paidInvoices = invoices.filter((inv: any) =>
      inv.freelancerId === freelancerId && inv.status === 'paid'
    );

    for (const invoice of paidInvoices) {
      const amount = invoice.paymentDetails?.freelancerAmount || invoice.totalAmount;
      transactions.push({
        id: `invoice-${invoice.invoiceNumber}`,
        userId: userIdNum,
        commissionerId: invoice.commissionerId,
        organizationId: null, // Could be derived from projects if needed
        projectId: invoice.projectId,
        type: 'credit',
        amount: amount,
        currency: 'USD',
        date: invoice.paidDate || invoice.paymentDetails?.processedAt || invoice.issueDate,
        source: 'project_payment',
        description: `Payment for ${invoice.projectTitle}`
      });
    }

    // 2. Storefront sales (credits)
    const purchasesData = await readFile(PURCHASES_PATH, 'utf-8');
    const purchases = JSON.parse(purchasesData);
    const userSales = purchases.filter((purchase: any) =>
      purchase.sellerId === freelancerId && purchase.status === 'delivered'
    );

    for (const sale of userSales) {
      transactions.push({
        id: `sale-${sale.id}`,
        userId: userIdNum,
        commissionerId: null,
        organizationId: null,
        projectId: null,
        type: 'credit',
        amount: sale.sellerAmount,
        currency: 'USD',
        date: sale.purchaseDate,
        source: 'storefront_sale',
        description: `Sale of ${sale.productTitle}`
      });
    }

    // 3. Withdrawals from existing wallet history (debits)
    const historyData = await readFile(HISTORY_PATH, 'utf-8');
    const existingHistory = JSON.parse(historyData);
    const userWithdrawals = existingHistory.filter((item: any) =>
      item.userId === userIdNum && item.type === 'debit'
    );

    for (const withdrawal of userWithdrawals) {
      transactions.push({
        ...withdrawal,
        source: 'withdrawal',
        description: 'Withdrawal to bank account'
      });
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`Wallet history API: Built ${transactions.length} transactions for user ${userId}`);
    console.log(`- Project payments: ${paidInvoices.length}`);
    console.log(`- Storefront sales: ${userSales.length}`);
    console.log(`- Withdrawals: ${userWithdrawals.length}`);

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error loading wallet history:', error);
    return NextResponse.json({ error: 'Failed to load wallet history' }, { status: 500 });
  }
}
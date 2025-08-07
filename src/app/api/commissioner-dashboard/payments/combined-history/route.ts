import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSpendingTransactionsForHistory } from '@/lib/commissioner-spending-service';

const UNIT_SALES_PATH = path.join(process.cwd(), 'data/storefront/unit-sales.json');
const PRODUCTS_PATH = path.join(process.cwd(), 'data/storefront/products.json');

type SalesTransaction = {
  productId: string;
  date: string;
  amount: number;
};

type SalesTransaction = {
  productId: string;
  date: string;
  amount: number;
};

type CombinedTransaction = {
  id: string;
  type: 'spending' | 'earning';
  category: 'freelancer_payout' | 'withdrawal' | 'product_sale';
  amount: number;
  currency: string;
  date: string;
  description: string;
  metadata?: {
    freelancerId?: number;
    projectId?: number;
    projectName?: string;
    productId?: string;
    productName?: string;
  };
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commissionerId = parseInt(session.user.id);
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Get spending history from unified service
    const userSpending = await getSpendingTransactionsForHistory(commissionerId, limit);

    // Read storefront data for earnings
    let userEarnings: SalesTransaction[] = [];
    try {
      const productsRaw = await readFile(PRODUCTS_PATH, 'utf-8');
      const products = JSON.parse(productsRaw);
      
      // Get user's product IDs
      const userProductIds = products
        .filter((product: any) => product.authorId === commissionerId)
        .map((product: any) => product.id);

      if (userProductIds.length > 0) {
        const salesRaw = await readFile(UNIT_SALES_PATH, 'utf-8');
        const sales = JSON.parse(salesRaw);
        
        userEarnings = sales.filter((sale: any) => 
          userProductIds.includes(sale.productId)
        );
      }
    } catch (error) {
      console.log('No storefront data found, skipping earnings');
    }

    // Combine and transform transactions
    const combinedTransactions: CombinedTransaction[] = [
      // Add spending transactions
      ...userSpending.map(tx => ({
        id: `spending-${tx.id}`,
        type: 'spending' as const,
        category: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        date: tx.date,
        description: tx.description,
        metadata: {
          freelancerId: tx.freelancerId,
          projectId: tx.projectId,
          projectName: tx.projectName,
        }
      })),
      // Add earnings transactions
      ...userEarnings.map(tx => ({
        id: `earning-${tx.productId}-${tx.date}`,
        type: 'earning' as const,
        category: 'product_sale' as const,
        amount: tx.amount,
        currency: 'USD',
        date: tx.date + 'T12:00:00Z', // Add time component
        description: `Digital product sale`,
        metadata: {
          productId: tx.productId,
        }
      }))
    ];

    // Sort by date (newest first) and limit results
    const sortedTransactions = combinedTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return NextResponse.json(sortedTransactions);
  } catch (error) {
    console.error('Error loading combined history:', error);
    return NextResponse.json(
      { error: 'Failed to load transaction history' },
      { status: 500 }
    );
  }
}

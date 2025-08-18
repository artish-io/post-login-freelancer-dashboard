import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session-guard';
import { getAllInvoices } from '@/lib/invoice-storage';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSession(request);
    const url = new URL(request.url);
    const requestedUserId = url.searchParams.get('userId');
    
    // Users can only access their own transaction data
    if (requestedUserId && parseInt(requestedUserId) !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const targetUserId = requestedUserId ? parseInt(requestedUserId) : userId;
    
    // Get query parameters for filtering
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const type = url.searchParams.get('type') as 'credit' | 'debit' | undefined;
    
    console.log(`🔍 Fetching transactions for user ${targetUserId}`);
    
    // Get all invoices and filter for this user's paid invoices
    const invoices = await getAllInvoices();
    const userInvoices = invoices.filter((invoice: any) => 
      invoice.freelancerId === targetUserId && invoice.status === 'paid'
    );
    
    console.log(`💰 Found ${userInvoices.length} paid invoices for user ${targetUserId}`);
    
    // Transform invoices to transaction format
    const transactions = userInvoices.map((invoice: any, index: number) => {
      const amount = invoice.paymentDetails?.freelancerAmount || invoice.totalAmount;
      const timestamp = invoice.paidDate || invoice.paymentDetails?.processedAt || invoice.sentDate;
      
      return {
        transactionId: `TXN-${invoice.invoiceNumber}`,
        type: 'credit',
        amount: amount,
        status: 'completed',
        timestamp: timestamp,
        currency: 'USD',
        metadata: {
          projectTitle: invoice.projectTitle || `Project ${invoice.projectId}`,
          invoiceNumber: invoice.invoiceNumber,
          cardUsed: {
            last4: '4242',
            type: 'visa'
          }
        }
      };
    });
    
    // Sort by timestamp (newest first)
    transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply limit
    const limitedTransactions = transactions.slice(0, limit);
    
    console.log(`✅ Returning ${limitedTransactions.length} transactions for user ${targetUserId}`);
    
    return NextResponse.json({
      success: true,
      transactions: limitedTransactions,
      total: limitedTransactions.length,
      hasMore: transactions.length > limit
    });
    
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch transactions',
      transactions: []
    }, { status: 500 });
  }
}

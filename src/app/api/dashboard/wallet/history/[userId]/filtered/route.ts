import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { parseISO, isAfter, isBefore } from 'date-fns';

const WALLET_HISTORY_PATH = path.join(process.cwd(), 'data/wallet/wallet-history.json');

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { searchParams } = new URL(req.url);
  const userId = params.userId;

  const projectId = searchParams.get('projectId');
  const organizationId = searchParams.get('organizationId');
  const type = searchParams.get('type'); // 'credit' or 'debit'
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const raw = await readFile(WALLET_HISTORY_PATH, 'utf-8');
    const allTransactions = JSON.parse(raw);

    const filtered = allTransactions.filter((tx: any) => {
      const txDate = parseISO(tx.date);

      return (
        tx.userId === userId &&
        (!projectId || String(tx.projectId) === projectId) &&
        (!organizationId || String(tx.organizationId) === organizationId) &&
        (!type || tx.type === type) &&
        (!startDate || isAfter(txDate, parseISO(startDate))) &&
        (!endDate || isBefore(txDate, parseISO(endDate)))
      );
    });

    const totalAmount = filtered.reduce((sum: number, tx: any) => sum + tx.amount, 0);

    return NextResponse.json({
      totalAmount: Number(totalAmount.toFixed(2)),
      transactions: filtered
    });
  } catch (error) {
    console.error('Failed to load filtered wallet history:', error);
    return NextResponse.json({ error: 'Could not load transactions' }, { status: 500 });
  }
}
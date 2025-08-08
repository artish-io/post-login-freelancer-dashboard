

type PaymentPhase = 'trigger' | 'execute';

interface MockInvoice {
  invoiceNumber: string;
  projectId: number;
  freelancerId: number;
  commissionerId: number;
  totalAmount: number;
}

interface MockTransaction {
  transactionId: string;
  invoiceNumber: string;
  projectId: number;
  freelancerId: number;
  commissionerId: number;
  amount: number;
  status: 'processing' | 'paid';
  integration: 'mock';
  timestamp: string;
}

export async function processMockPayment(
  invoice: MockInvoice,
  phase: PaymentPhase
): Promise<MockTransaction> {
  const transactionId = `TXN-${invoice.invoiceNumber}`;
  const timestamp = new Date().toISOString();

  return {
    transactionId,
    invoiceNumber: invoice.invoiceNumber,
    projectId: invoice.projectId,
    freelancerId: invoice.freelancerId,
    commissionerId: invoice.commissionerId,
    amount: invoice.totalAmount,
    status: phase === 'trigger' ? 'processing' : 'paid',
    integration: 'mock',
    timestamp
  };
}
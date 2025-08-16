
import fs from 'fs/promises';
import path from 'path';

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
  cardUsed?: {
    id: string;
    last4: string;
    type: string;
  };
}

export async function processMockPayment(
  invoice: MockInvoice,
  phase: PaymentPhase = 'execute'
): Promise<MockTransaction> {
  const transactionId = `TXN-${invoice.invoiceNumber}`;
  const timestamp = new Date().toISOString();

  // Get commissioner's default card for transaction metadata and balance deduction
  let cardInfo = null;
  try {
    cardInfo = await getDefaultCard(invoice.commissionerId);
  } catch (error) {
    console.warn('No card found for commissioner, proceeding with mock payment');
  }

  // Simulate processing delay (only in execute phase)
  if (phase === 'execute') {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Simulate 95% success rate for realistic testing
  const shouldSucceed = Math.random() > 0.05;

  if (!shouldSucceed) {
    throw new Error('Mock payment failed - simulated gateway error');
  }

  // Actually deduct from card balance if card exists
  if (cardInfo && phase === 'execute') {
    await deductFromCard(cardInfo.id, invoice.totalAmount, {
      invoiceNumber: invoice.invoiceNumber,
      projectId: String(invoice.projectId),
      freelancerId: invoice.freelancerId,
      description: `Payment for invoice ${invoice.invoiceNumber}`
    });
  }

  return {
    transactionId,
    invoiceNumber: invoice.invoiceNumber,
    projectId: invoice.projectId,
    freelancerId: invoice.freelancerId,
    commissionerId: invoice.commissionerId,
    amount: invoice.totalAmount,
    status: phase === 'trigger' ? 'processing' : 'paid',
    integration: 'mock',
    timestamp,
    cardUsed: cardInfo ? {
      id: cardInfo.id,
      last4: cardInfo.last4,
      type: cardInfo.type
    } : undefined
  };
}

// Helper function to get default card (integrates with our card data)
async function getDefaultCard(commissionerId: number) {
  try {
    const cardsPath = path.join(process.cwd(), 'data/commissioner-payments/test-cards.json');
    const cardsData = await fs.readFile(cardsPath, 'utf-8');
    const cards = JSON.parse(cardsData);

    return cards.find((card: any) =>
      card.commissionerId === commissionerId && card.isDefault
    );
  } catch (error) {
    console.warn('Could not load commissioner cards:', error);
    return null;
  }
}

// Helper function to deduct amount from card balance and track transaction
async function deductFromCard(cardId: string, amount: number, transactionDetails: {
  invoiceNumber: string;
  projectId: string;
  freelancerId: number;
  description: string;
}) {
  try {
    const cardsPath = path.join(process.cwd(), 'data/commissioner-payments/test-cards.json');
    const cardsData = await fs.readFile(cardsPath, 'utf-8');
    const cards = JSON.parse(cardsData);

    const cardIndex = cards.findIndex((card: any) => card.id === cardId);
    if (cardIndex === -1) {
      throw new Error(`Card ${cardId} not found`);
    }

    const card = cards[cardIndex];

    // Check if sufficient balance
    if (card.availableBalance < amount) {
      throw new Error(`Insufficient balance. Available: $${card.availableBalance}, Required: $${amount}`);
    }

    // Deduct amount
    card.availableBalance -= amount;
    card.updatedAt = new Date().toISOString();

    // Add transaction to history
    const transaction = {
      transactionId: `TXN-${Date.now()}`,
      amount: -amount, // Negative for deduction
      type: 'payment',
      description: transactionDetails.description,
      invoiceNumber: transactionDetails.invoiceNumber,
      projectId: transactionDetails.projectId,
      freelancerId: transactionDetails.freelancerId,
      timestamp: new Date().toISOString(),
      balanceAfter: card.availableBalance
    };

    card.transactionHistory.push(transaction);

    // Update the card in the array
    cards[cardIndex] = card;

    // Write back to file
    await fs.writeFile(cardsPath, JSON.stringify(cards, null, 2));

    console.log(`💳 Card ${cardId} charged $${amount}. New balance: $${card.availableBalance}`);

    return transaction;
  } catch (error) {
    console.error('Error deducting from card:', error);
    throw error;
  }
}

// Add withdrawal processing function for test gateway
export async function processMockWithdrawal(
  withdrawalData: {
    withdrawalId: string;
    userId: number;
    amount: number;
    currency: string;
    withdrawalMethodId?: string;
  }
): Promise<{
  transactionId: string;
  status: 'processing' | 'completed' | 'failed';
  estimatedCompletion?: string;
  withdrawalMethod?: any;
}> {
  const transactionId = `WD-${withdrawalData.withdrawalId}`;

  // Get withdrawal method details
  let withdrawalMethod = null;
  try {
    withdrawalMethod = await getWithdrawalMethod(withdrawalData.userId, withdrawalData.withdrawalMethodId);
  } catch (error) {
    console.warn('No withdrawal method found, using default processing');
  }

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Simulate 98% success rate for withdrawals
  const shouldSucceed = Math.random() > 0.02;

  if (!shouldSucceed) {
    throw new Error('Mock withdrawal failed - simulated gateway error');
  }

  return {
    transactionId,
    status: 'processing', // Will be updated to 'completed' by execute endpoint
    estimatedCompletion: withdrawalMethod?.type === 'paypal' ? '1-2 hours' : '1-3 business days',
    withdrawalMethod: withdrawalMethod ? {
      type: withdrawalMethod.type,
      last4: withdrawalMethod.accountLast4,
      email: withdrawalMethod.email,
      bankName: withdrawalMethod.bankName
    } : null
  };
}

// Helper function to get withdrawal method
async function getWithdrawalMethod(userId: number, methodId?: string) {
  try {
    const methodsPath = path.join(process.cwd(), 'data/freelancer-payments/withdrawal-methods.json');
    const methodsData = await fs.readFile(methodsPath, 'utf-8');
    const methods = JSON.parse(methodsData);

    if (methodId) {
      return methods.find((method: any) =>
        method.id === methodId && method.freelancerId === userId
      );
    } else {
      // Return default method
      return methods.find((method: any) =>
        method.freelancerId === userId && method.isDefault
      );
    }
  } catch (error) {
    console.warn('Could not load withdrawal methods:', error);
    return null;
  }
}
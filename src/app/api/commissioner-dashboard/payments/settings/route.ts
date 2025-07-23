import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const PAYMENT_METHODS_PATH = path.join(process.cwd(), 'data/commissioner-payments/payment-methods.json');
const WITHDRAWAL_METHODS_PATH = path.join(process.cwd(), 'data/commissioner-payments/withdrawal-methods.json');

type PaymentMethod = {
  id: number;
  commissionerId: number;
  type: 'credit_card';
  provider: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type WithdrawalMethod = {
  id: number;
  commissionerId: number;
  type: 'bank_transfer' | 'paypal';
  bankName?: string;
  accountType?: string;
  accountLast4?: string;
  routingNumber?: string;
  email?: string;
  holderName?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commissionerId = parseInt(session.user.id);

    // Read payment methods
    const paymentMethodsRaw = await readFile(PAYMENT_METHODS_PATH, 'utf-8');
    const allPaymentMethods: PaymentMethod[] = JSON.parse(paymentMethodsRaw);
    const paymentMethods = allPaymentMethods.filter(method => method.commissionerId === commissionerId);

    // Read withdrawal methods
    const withdrawalMethodsRaw = await readFile(WITHDRAWAL_METHODS_PATH, 'utf-8');
    const allWithdrawalMethods: WithdrawalMethod[] = JSON.parse(withdrawalMethodsRaw);
    const withdrawalMethods = allWithdrawalMethods.filter(method => method.commissionerId === commissionerId);

    return NextResponse.json({
      paymentMethods,
      withdrawalMethods
    });
  } catch (error) {
    console.error('Error loading payment settings:', error);
    return NextResponse.json(
      { error: 'Failed to load payment settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commissionerId = parseInt(session.user.id);
    const { type, methodType, data } = await req.json();

    if (type === 'payment_method') {
      // Add new payment method
      const paymentMethodsRaw = await readFile(PAYMENT_METHODS_PATH, 'utf-8');
      const paymentMethods: PaymentMethod[] = JSON.parse(paymentMethodsRaw);
      
      const newMethod: PaymentMethod = {
        id: Math.max(...paymentMethods.map(m => m.id), 0) + 1,
        commissionerId,
        type: 'credit_card',
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      paymentMethods.push(newMethod);
      await writeFile(PAYMENT_METHODS_PATH, JSON.stringify(paymentMethods, null, 2));
      
      return NextResponse.json({ success: true, method: newMethod });
    } else if (type === 'withdrawal_method') {
      // Add new withdrawal method
      const withdrawalMethodsRaw = await readFile(WITHDRAWAL_METHODS_PATH, 'utf-8');
      const withdrawalMethods: WithdrawalMethod[] = JSON.parse(withdrawalMethodsRaw);
      
      const newMethod: WithdrawalMethod = {
        id: Math.max(...withdrawalMethods.map(m => m.id), 0) + 1,
        commissionerId,
        type: methodType,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      withdrawalMethods.push(newMethod);
      await writeFile(WITHDRAWAL_METHODS_PATH, JSON.stringify(withdrawalMethods, null, 2));
      
      return NextResponse.json({ success: true, method: newMethod });
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
  } catch (error) {
    console.error('Error saving payment settings:', error);
    return NextResponse.json(
      { error: 'Failed to save payment settings' },
      { status: 500 }
    );
  }
}

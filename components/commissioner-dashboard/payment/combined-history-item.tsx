'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { ArrowUpLeft, ArrowDownRight, ShoppingBag, CreditCard, Banknote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

type Props = {
  transaction: CombinedTransaction;
};

export default function CombinedHistoryItem({ transaction }: Props) {
  const isEarning = transaction.type === 'earning';
  const isSpending = transaction.type === 'spending';
  
  const getIcon = () => {
    switch (transaction.category) {
      case 'freelancer_payout':
        return <ArrowDownRight className="w-5 h-5" />;
      case 'withdrawal':
        return <Banknote className="w-5 h-5" />;
      case 'product_sale':
        return <ShoppingBag className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getIconColor = () => {
    if (isEarning) return 'text-green-600 bg-green-50';
    return 'text-red-600 bg-red-50';
  };

  const getAmountColor = () => {
    if (isEarning) return 'text-green-600';
    return 'text-red-600';
  };

  const getSign = () => {
    if (isEarning) return '+';
    return '−';
  };

  const getTitle = () => {
    switch (transaction.category) {
      case 'freelancer_payout':
        return transaction.metadata?.projectName || 'Freelancer Payment';
      case 'withdrawal':
        return 'Withdrawal';
      case 'product_sale':
        return 'Digital Product Sale';
      default:
        return transaction.description;
    }
  };

  const getSubtitle = () => {
    switch (transaction.category) {
      case 'freelancer_payout':
        return 'Freelancer payout';
      case 'withdrawal':
        return transaction.description;
      case 'product_sale':
        return `Product ID: ${transaction.metadata?.productId}`;
      default:
        return transaction.description;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: transaction.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
      {/* Icon */}
      <div className={clsx(
        'w-12 h-12 rounded-full flex items-center justify-center',
        getIconColor()
      )}>
        {getIcon()}
      </div>

      {/* Transaction Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-gray-900 truncate">
            {getTitle()}
          </h4>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{getSubtitle()}</span>
          <span>•</span>
          <span>{formatDate(transaction.date)}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <div className={clsx(
          'font-semibold',
          getAmountColor()
        )}>
          {getSign()}{formatCurrency(transaction.amount)}
        </div>
      </div>
    </div>
  );
}

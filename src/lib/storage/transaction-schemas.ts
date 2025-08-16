/**
 * Transaction Schemas for Hierarchical Payment System
 * 
 * Defines TypeScript interfaces and types for the new hierarchical
 * transaction storage system that replaces flat file storage.
 */

// Base transaction interface that all transactions extend
export interface BaseTransaction {
  transactionId: string;           // Format: TXN-{type}-{reference}-{timestamp}
  userId: number;                  // User involved in transaction (freelancer for payments, user for withdrawals)
  type: 'payment' | 'withdrawal';  // Transaction type
  amount: number;                  // Always positive amount
  currency: string;                // Currency code (default: 'USD')
  timestamp: string;               // ISO string when transaction occurred
  status: TransactionStatus;       // Current status of transaction
  createdAt: string;              // ISO string when record was created
  updatedAt: string;              // ISO string when record was last updated
  description?: string;           // Optional human-readable description
  metadata?: Record<string, any>; // Additional metadata for extensibility
}

// Transaction status enum
export type TransactionStatus = 
  | 'pending'     // Transaction initiated but not yet processed
  | 'processing'  // Transaction being processed by payment gateway
  | 'completed'   // Transaction successfully completed
  | 'failed'      // Transaction failed
  | 'cancelled'   // Transaction was cancelled
  | 'refunded';   // Transaction was refunded

// Payment transaction (money coming into freelancer wallet)
export interface PaymentTransaction extends BaseTransaction {
  type: 'payment';
  invoiceNumber: string;          // Associated invoice number
  projectId: string;              // Project this payment is for
  commissionerId: number;         // Commissioner who made the payment
  freelancerId: number;           // Freelancer receiving the payment
  source: PaymentSource;          // How this payment was triggered
  paymentMethod: PaymentMethod;   // Payment method used
  platformFee?: number;           // Platform fee deducted (if any)
  freelancerAmount?: number;      // Net amount to freelancer after fees
  gatewayTransactionId?: string;  // External payment gateway transaction ID
  gatewayResponse?: Record<string, any>; // Raw gateway response data
}

// Withdrawal transaction (money going out of freelancer wallet)
export interface WithdrawalTransaction extends BaseTransaction {
  type: 'withdrawal';
  withdrawalMethodId: string;     // ID of withdrawal method used
  withdrawalMethod: WithdrawalMethod; // Details of withdrawal method
  processingFee?: number;         // Fee charged for withdrawal
  netAmount?: number;             // Amount after fees
  estimatedCompletion?: string;   // Estimated completion date
  gatewayTransactionId?: string;  // External gateway transaction ID
  gatewayResponse?: Record<string, any>; // Raw gateway response data
}

// Payment source types
export type PaymentSource = 
  | 'auto_milestone'    // Automatic milestone payment
  | 'manual_payment'    // Manual payment by commissioner
  | 'completion_payment' // Project completion payment
  | 'bonus_payment'     // Bonus or tip payment
  | 'refund'           // Refund payment
  | 'migration';       // Migration from old system

// Payment method types
export type PaymentMethod = 
  | 'mock'      // Mock payment for testing
  | 'stripe'    // Stripe payment processor
  | 'paypal'    // PayPal payment processor
  | 'paystack'  // Paystack payment processor
  | 'bank_transfer' // Direct bank transfer
  | 'migration'; // Migration from old system

// Withdrawal method details
export interface WithdrawalMethod {
  id: string;
  type: WithdrawalMethodType;
  accountLast4?: string;    // Last 4 digits of account
  email?: string;           // Email for PayPal, etc.
  bankName?: string;        // Bank name for bank transfers
  accountName?: string;     // Account holder name
  isDefault: boolean;       // Whether this is the default method
}

// Withdrawal method types
export type WithdrawalMethodType = 
  | 'paypal'
  | 'bank_transfer'
  | 'stripe_express'
  | 'crypto_wallet';

// Transaction metadata for file storage
export interface TransactionMetadata {
  transactionId: string;
  filePath: string;         // Full path to transaction file
  directoryPath: string;    // Directory containing transaction
  createdAt: string;
  fileSize?: number;        // Size of transaction file in bytes
  checksum?: string;        // File integrity checksum
}

// Balance calculation result
export interface BalanceCalculation {
  userId: number;
  totalPayments: number;      // Sum of all payment transactions
  totalWithdrawals: number;   // Sum of all withdrawal transactions
  availableBalance: number;   // totalPayments - totalWithdrawals
  lifetimeEarnings: number;   // Same as totalPayments (for business logic clarity)
  pendingWithdrawals: number; // Sum of pending withdrawal transactions
  lastCalculated: string;     // ISO timestamp of calculation
  transactionCount: number;   // Total number of transactions processed
  lastTransactionDate?: string; // Date of most recent transaction
}

// Balance verification result
export interface BalanceVerification {
  userId: number;
  calculatedBalance: number;
  storedBalance?: number;     // Balance from old system (if any)
  isAccurate: boolean;        // Whether calculated matches stored
  discrepancy?: number;       // Difference if not accurate
  lastVerified: string;       // ISO timestamp of verification
  transactionsVerified: number; // Number of transactions checked
}

// Transaction query filters
export interface TransactionFilters {
  userId?: number;
  type?: 'payment' | 'withdrawal';
  status?: TransactionStatus;
  startDate?: string;         // ISO date string
  endDate?: string;           // ISO date string
  projectId?: string;
  invoiceNumber?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentMethod;
  source?: PaymentSource;
  limit?: number;             // Maximum number of results
  offset?: number;            // Pagination offset
}

// Transaction summary for reporting
export interface TransactionSummary {
  userId: number;
  period: {
    startDate: string;
    endDate: string;
  };
  payments: {
    count: number;
    totalAmount: number;
    averageAmount: number;
  };
  withdrawals: {
    count: number;
    totalAmount: number;
    averageAmount: number;
  };
  netChange: number;          // payments - withdrawals for period
  balanceAtStart: number;
  balanceAtEnd: number;
}

// Error types for transaction operations
export class TransactionError extends Error {
  constructor(
    message: string,
    public code: TransactionErrorCode,
    public transactionId?: string,
    public userId?: number
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export enum TransactionErrorCode {
  INVALID_TRANSACTION_DATA = 'INVALID_TRANSACTION_DATA',
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  STORAGE_ERROR = 'STORAGE_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

// Utility type for creating new transactions
export type CreatePaymentTransactionData = Omit<PaymentTransaction, 'transactionId' | 'createdAt' | 'updatedAt'>;
export type CreateWithdrawalTransactionData = Omit<WithdrawalTransaction, 'transactionId' | 'createdAt' | 'updatedAt'>;

// Type guards for transaction types
export function isPaymentTransaction(transaction: BaseTransaction): transaction is PaymentTransaction {
  return transaction.type === 'payment';
}

export function isWithdrawalTransaction(transaction: BaseTransaction): transaction is WithdrawalTransaction {
  return transaction.type === 'withdrawal';
}

// Validation functions
export function validateTransactionId(transactionId: string): boolean {
  // Format: TXN-{type}-{reference}-{timestamp}
  const pattern = /^TXN-(PAY|WD)-[A-Za-z0-9-]+-\d+$/;
  return pattern.test(transactionId);
}

export function validateAmount(amount: number): boolean {
  return typeof amount === 'number' && amount > 0 && Number.isFinite(amount);
}

export function validateCurrency(currency: string): boolean {
  // Basic currency code validation (3 letter codes)
  const pattern = /^[A-Z]{3}$/;
  return pattern.test(currency);
}

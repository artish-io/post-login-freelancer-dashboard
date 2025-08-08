export type SupportedGateway = 'stripe' | 'paystack' | 'paypal' | 'test';

export type PaymentMethod = 'completion' | 'milestone' | 'storefront';

export type CurrencyCode = 'USD' | 'CAD' | 'NGN' | string;

export interface PaymentIntent {
  invoiceNumber: string;
  projectId?: number;
  freelancerId: number;
  commissionerId?: number;
  amount: number;
  currency: CurrencyCode;
  method: PaymentMethod;
  gateway: SupportedGateway;
  metadata?: Record<string, any>;
}

export interface GatewayResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
  raw?: any;
}

export interface GatewayConfig {
  apiKey?: string;
  secret?: string;
  mode?: 'test' | 'live';
  callbackUrl?: string;
}

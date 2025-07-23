# Payment Gateway Integration Guide

This document outlines how to integrate real payment gateways (Stripe Connect, Paystack, etc.) with the current simulation system.

## Current Implementation

The system currently runs in **SIMULATION MODE** with the following features:
- ✅ Invoice creation and management
- ✅ Payment status tracking
- ✅ Notification system
- ✅ Platform fee calculation (5%)
- ✅ Freelancer payout simulation
- ✅ Complete UI/UX flow

## Integration Roadmap

### 1. Stripe Connect Integration

#### Setup Requirements
```bash
npm install stripe
```

#### Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### Implementation Steps

**A. Freelancer Onboarding**
```typescript
// Create Stripe Connect account for freelancer
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US', // or freelancer's country
  email: freelancer.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});

// Store account ID in user profile
freelancer.stripeAccountId = account.id;
```

**B. Payment Processing**
```typescript
// In /api/invoices/pay/route.ts
const paymentIntent = await stripe.paymentIntents.create({
  amount: invoice.totalAmount * 100, // Convert to cents
  currency: 'usd',
  payment_method: paymentMethodId,
  confirm: true,
  application_fee_amount: platformFee * 100,
  transfer_data: {
    destination: freelancer.stripeAccountId,
  },
  metadata: {
    invoiceNumber: invoiceNumber,
    projectId: invoice.projectId,
    freelancerId: freelancerId,
  },
});
```

**C. Webhook Handling**
```typescript
// /api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();
  
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Update invoice status to 'paid'
      break;
    case 'payment_intent.payment_failed':
      // Handle failed payment
      break;
  }
}
```

### 2. Paystack Integration

#### Setup Requirements
```bash
npm install paystack
```

#### Environment Variables
```env
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
```

#### Implementation Steps

**A. Subaccount Creation**
```typescript
// Create subaccount for freelancer
const subaccount = await paystack.subaccount.create({
  business_name: freelancer.name,
  settlement_bank: freelancer.bankCode,
  account_number: freelancer.accountNumber,
  percentage_charge: 95, // Freelancer gets 95%, platform keeps 5%
});
```

**B. Payment Processing**
```typescript
// Initialize transaction with split payment
const transaction = await paystack.transaction.initialize({
  email: commissioner.email,
  amount: invoice.totalAmount * 100, // Convert to kobo
  subaccount: freelancer.paystackSubaccountCode,
  bearer: 'subaccount', // Subaccount bears transaction charges
  metadata: {
    invoiceNumber: invoiceNumber,
    projectId: invoice.projectId,
  },
});
```

### 3. Database Schema Updates

#### Add Payment Gateway Fields
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN stripe_account_id VARCHAR(255);
ALTER TABLE users ADD COLUMN paystack_subaccount_code VARCHAR(255);
ALTER TABLE users ADD COLUMN bank_account_verified BOOLEAN DEFAULT FALSE;

-- Add to invoices table
ALTER TABLE invoices ADD COLUMN payment_gateway VARCHAR(50);
ALTER TABLE invoices ADD COLUMN gateway_transaction_id VARCHAR(255);
ALTER TABLE invoices ADD COLUMN payment_method_id VARCHAR(255);
ALTER TABLE invoices ADD COLUMN gateway_fee DECIMAL(10,2);
ALTER TABLE invoices ADD COLUMN net_amount DECIMAL(10,2);
```

### 4. Security Considerations

#### PCI Compliance
- Never store card details directly
- Use tokenized payment methods
- Implement proper SSL/TLS
- Regular security audits

#### Fraud Prevention
```typescript
// Add fraud detection
const riskAssessment = await stripe.radar.valueListItems.create({
  value_list: 'rsl_high_risk_emails',
  value: commissioner.email,
});
```

#### Idempotency
```typescript
// Prevent duplicate payments
const paymentIntent = await stripe.paymentIntents.create({
  // ... payment details
  idempotency_key: `invoice_${invoiceNumber}_${Date.now()}`,
});
```

### 5. Testing Strategy

#### Test Cards (Stripe)
```typescript
const testCards = {
  success: '4242424242424242',
  declined: '4000000000000002',
  requiresAuth: '4000002500003155',
  insufficientFunds: '4000000000009995',
};
```

#### Test Flow
1. Create test freelancer accounts
2. Test payment success scenarios
3. Test payment failure scenarios
4. Test webhook delivery
5. Test payout processing

### 6. Migration from Simulation

#### Phase 1: Parallel Running
- Keep simulation mode as fallback
- Add feature flag for payment gateway
- Test with small subset of users

#### Phase 2: Full Migration
- Update all invoice creation flows
- Migrate existing invoices
- Update notification templates
- Train support team

#### Phase 3: Cleanup
- Remove simulation code
- Update documentation
- Monitor performance

### 7. Monitoring and Analytics

#### Key Metrics
- Payment success rate
- Average processing time
- Failed payment reasons
- Platform fee collection
- Freelancer payout timing

#### Alerting
```typescript
// Set up alerts for critical events
if (paymentFailureRate > 0.05) {
  await sendAlert('High payment failure rate detected');
}
```

### 8. Compliance and Legal

#### Tax Reporting
- Generate 1099 forms for US freelancers
- Handle international tax requirements
- Maintain transaction records

#### Data Protection
- GDPR compliance for EU users
- PCI DSS compliance for payment data
- Regular data audits

## Files to Update for Integration

1. **API Routes**
   - `/api/invoices/send/route.ts` - Add gateway invoice creation
   - `/api/invoices/pay/route.ts` - Add real payment processing
   - `/api/webhooks/[gateway]/route.ts` - Handle gateway webhooks

2. **Components**
   - Payment form components
   - Bank account verification
   - Payment method management

3. **Database**
   - User payment profiles
   - Transaction logs
   - Audit trails

4. **Configuration**
   - Environment variables
   - Feature flags
   - Gateway settings

## Support and Maintenance

- Monitor gateway status pages
- Handle API version updates
- Maintain webhook endpoints
- Regular security updates
- Performance optimization

---

**Note**: This guide provides a comprehensive roadmap for payment gateway integration. Start with Stripe Connect for US/international markets and Paystack for African markets. Always test thoroughly in sandbox environments before going live.

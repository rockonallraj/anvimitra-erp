# Payment Gateway Integration

## Architecture
- Supported Providers: Razorpay, Cashfree, UPI Intent.
- Flow:
  1. Parent selects pending fee installment on Mobile App or Web Portal.
  2. Frontend requests `/api/payments/intent` with installment ID and amount.
  3. Server creates order with provider and records pending transaction in `online_payment_intents`.
  4. Client completes checkout using native SDK / checkout modal.
  5. Webhook or `/api/payments/verify` verifies cryptographic signature, records entry in `fee_ledger`, marks installment `paid`, and generates digital fee receipt in `fee_receipts`.

/**
 * Anvi Mitra ERP: Payment Gateway Integration Module
 */

const { authenticate } = require('./security');

function registerPaymentGatewayRoutes(app, pool) {
  app.post('/api/payments/intent', authenticate, async (req, res, next) => {
    try {
      const { installmentId, amount, currency = 'INR', provider = 'razorpay' } = req.body || {};
      if (!amount) return res.status(400).json({ error: 'amount is required' });

      const intentId = 'pay_intent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      if (!pool) {
        return res.json({ intentId, amount, currency, provider, status: 'created' });
      }

      const schoolId = req.auth.schoolId;
      const { rows } = await pool.query(
        `INSERT INTO online_payment_intents (school_id, user_id, installment_id, amount, currency, gateway_provider, gateway_order_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'created')
         RETURNING *`,
        [schoolId, req.auth.sub, installmentId || null, amount, currency, provider, intentId]
      );
      res.status(201).json({ intent: rows[0], providerOrder: { id: intentId, amount, currency } });
    } catch (err) { next(err); }
  });

  app.post('/api/payments/verify', authenticate, async (req, res, next) => {
    try {
      const { intentId, paymentId, signature } = req.body || {};
      if (!intentId) return res.status(400).json({ error: 'intentId is required' });

      if (!pool) {
        return res.json({ verified: true, message: 'Mock payment verified successfully' });
      }

      await pool.query(
        `UPDATE online_payment_intents SET gateway_payment_id = $1, status = 'captured', updated_at = now() WHERE gateway_order_id = $2`,
        [paymentId, intentId]
      );
      res.json({ verified: true, intentId, paymentId });
    } catch (err) { next(err); }
  });
}

module.exports = { registerPaymentGatewayRoutes };

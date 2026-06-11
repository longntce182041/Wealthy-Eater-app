/**
 * user.consultation.controller.js — Express handlers for the "Hire a Nutritionist" flow.
 *
 * All handlers follow the standard API response contract:
 *   { success: boolean, data: object|null, error: { code, message }|null }
 */

const consultationService = require('../services/user.consultation.service');

class UserConsultationController {
  /**
   * POST /api/user/consultations/hire
   *
   * Creates a PayOS checkout link for hiring a nutritionist.
   * Body: { nutritionist_id: String }
   */
  async hireNutritionist(req, res) {
    try {
      const userId = req.user.id;
      const { nutritionist_id, package_type = '1_month' } = req.body;

      const checkoutData = await consultationService.createHireCheckout(
        userId,
        nutritionist_id,
        package_type
      );

      return res.status(201).json({
        success: true,
        data: checkoutData,
        error: null
      });
    } catch (error) {
      console.error('UserConsultationController.hireNutritionist Error:', error.message);
      const statusCode = error.statusCode || error.status || 500;
      return res.status(statusCode).json({
        success: false,
        data: null,
        error: {
          code: statusCode === 409 ? 'DUPLICATE_CONTRACT' :
                statusCode === 404 ? 'NUTRITIONIST_NOT_FOUND' :
                statusCode === 400 ? 'VALIDATION_ERROR' :
                statusCode === 502 ? 'PAYMENT_GATEWAY_ERROR' :
                'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create hire checkout.'
        }
      });
    }
  }

  /**
   * GET /api/user/consultations/transactions/:id
   *
   * Returns a single transaction with full contract and nutritionist details.
   */
  async getTransactionDetail(req, res) {
    try {
      const userId = req.user.id;
      const transactionId = req.params.id;

      const transaction = await consultationService.getTransactionDetail(userId, transactionId);

      return res.status(200).json({
        success: true,
        data: transaction,
        error: null
      });
    } catch (error) {
      console.error('UserConsultationController.getTransactionDetail Error:', error.message);
      const statusCode = error.statusCode || error.status || 500;
      return res.status(statusCode).json({
        success: false,
        data: null,
        error: {
          code: statusCode === 404 ? 'TRANSACTION_NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch transaction detail.'
        }
      });
    }
  }

  /**
   * GET /api/user/consultations/active
   *
   * Returns the user's currently active consultation contract (if any).
   */
  async getActiveContract(req, res) {
    try {
      const userId = req.user.id;
      const activeContract = await consultationService.getActiveContract(userId);

      return res.status(200).json({
        success: true,
        data: activeContract, // Can be null if no active contract
        error: null
      });
    } catch (error) {
      console.error('UserConsultationController.getActiveContract Error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch active contract.'
        }
      });
    }
  }

  /**
   * GET /api/user/consultations/payos/urls
   *
   * Returns configured PayOS return and cancel URLs for WebView interception.
   */
  async getPayOSUrls(req, res) {
    try {
      const returnUrl = process.env.PAYOS_RETURN_URL;
      const cancelUrl = process.env.PAYOS_CANCEL_URL;

      if (!returnUrl || !cancelUrl) {
        throw new Error('Missing PAYOS_RETURN_URL or PAYOS_CANCEL_URL in environment');
      }

      return res.status(200).json({
        success: true,
        data: {
          returnUrl,
          cancelUrl
        },
        error: null
      });
    } catch (error) {
      console.error('UserConsultationController.getPayOSUrls Error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch PayOS URLs.'
        }
      });
    }
  }

  /**
   * POST /api/webhooks/payos
   *
   * PayOS webhook callback — unauthenticated, verified via HMAC signature.
   * Must always return 200 to PayOS to prevent retries (unless payload is invalid).
   */
  async handlePayOSWebhook(req, res) {
    try {
      let payload = req.body;

      // If body is a Buffer (from express.raw), parse it
      if (Buffer.isBuffer(payload)) {
        payload = JSON.parse(payload.toString('utf8'));
      }

      const result = await consultationService.handlePayOSWebhook(payload);

      return res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      console.error('UserConsultationController.handlePayOSWebhook Error:', error.message);

      // Still return 200 for known orders to prevent PayOS retries on non-retryable errors
      const statusCode = error.statusCode || 500;
      return res.status(statusCode >= 500 ? 500 : statusCode).json({
        success: false,
        data: null,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: error.message || 'Webhook processing failed.'
        }
      });
    }
  }

  /**
   * ALL /api/webhooks/payos/cancel
   *
   * Instant sync for when a user clicks cancel on the PayOS page
   */
  async handlePayOSCancel(req, res, next) {
    const orderCode = req.query.orderCode || req.body?.orderCode;
    if (orderCode) {
      // Fire and forget to update DB instantly
      consultationService.handlePayOSCancel(orderCode).catch(err => {
        console.error('handlePayOSCancel background error:', err.message);
      });
    }
    next();
  }

  /**
   * POST /api/user/consultations/verify-payment
   *
   * Manual fallback to verify payment status synchronously with PayOS
   * when local webhooks are blocked.
   */
  async verifyPayment(req, res) {
    try {
      const { order_code } = req.body;
      if (!order_code) {
        throw new Error('order_code is required');
      }

      const result = await consultationService.verifyPaymentSync(order_code);

      return res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      console.error('UserConsultationController.verifyPayment Error:', error.message);
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error.message || 'Failed to verify payment manually.'
        }
      });
    }
  }
}

module.exports = new UserConsultationController();

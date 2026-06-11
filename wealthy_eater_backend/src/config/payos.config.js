/**
 * payos.config.js — PayOS SDK initialization.
 *
 * Lazy-loads the @payos/node package so the backend can still boot
 * when the payment SDK is missing (e.g., in test or CI environments).
 *
 * Required environment variables:
 *   PAYOS_CLIENT_ID
 *   PAYOS_API_KEY
 *   PAYOS_CHECKSUM_KEY
 *   PAYOS_WEBHOOK_URL   (optional — auto-confirms webhook URL on boot)
 */

require('dotenv').config({ quiet: true });

/**
 * Creates a stub PayOS instance that throws descriptive errors
 * when any payment method is called. This prevents undefined crashes
 * and gives clear feedback about what's missing.
 */
function createUnavailablePayOS(reason) {
  const errorMessage =
    reason || 'PayOS is unavailable. Please install @payos/node and configure env vars.';

  return {
    createPaymentLink: async () => {
      throw new Error(errorMessage);
    },
    verifyPaymentWebhookData: (payload) => payload,
    confirmWebhook: async () => {
      throw new Error(errorMessage);
    },
  };
}

let payOS;

try {
  const PayOS = require('@payos/node');

  payOS = new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
  );

  // Auto-confirm webhook URL on boot (non-blocking)
  const webhookUrl = process.env.PAYOS_WEBHOOK_URL;
  if (webhookUrl && typeof payOS.confirmWebhook === 'function') {
    payOS
      .confirmWebhook(webhookUrl)
      .then(() => {
        console.log(`[PayOS] Webhook confirmed: ${webhookUrl}`);
      })
      .catch((error) => {
        console.error('[PayOS] Failed to confirm webhook URL:', error.message);
      });
  }

  console.log('[PayOS] SDK initialized successfully.');
} catch (error) {
  console.warn('[PayOS] SDK unavailable:', error.message);
  payOS = createUnavailablePayOS(
    'PayOS SDK unavailable. Install @payos/node to enable payment features.'
  );
}

module.exports = payOS;

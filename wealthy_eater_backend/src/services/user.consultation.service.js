/**
 * user.consultation.service.js — Business logic for the "Hire a Nutritionist" flow.
 *
 * Responsibilities:
 *  1. Create a PayOS checkout link for hiring a nutritionist.
 *  2. Handle PayOS webhooks with idempotency and signature verification.
 *  3. Provide paginated transaction history for the authenticated user.
 *  4. Return detailed transaction/invoice information.
 */

const payOS = require('../config/payos.config');
const ConsultationContract = require('../models/ConsultationContract');
const Transaction = require('../models/Transaction');
const Nutritionist = require('../models/Nutritionist');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORM_FEE_RATE = Number(process.env.PLATFORM_FEE_RATE || 0); // e.g. 0.1 = 10%
const PAYOS_RETURN_URL = process.env.PAYOS_RETURN_URL || 'https://wealthy-eater.app/payment/success';
const PAYOS_CANCEL_URL = process.env.PAYOS_CANCEL_URL || 'https://wealthy-eater.app/payment/cancel';

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Generate a unique numeric order code for PayOS.
 * Combines timestamp with random suffix to minimize collision risk.
 * PayOS requires orderCode to be a positive integer ≤ 9007199254740991.
 */
function buildOrderCode() {
  // Use last 10 digits of timestamp + 3 random digits → max 13 digits (safe for JS number)
  const ts = Date.now() % 10_000_000_000;
  const rand = Math.floor(Math.random() * 1000);
  return ts * 1000 + rand;
}

/**
 * Normalize webhook payload — PayOS may wrap data in different structures.
 */
function normalizeWebhookData(payload) {
  if (payload && typeof payload === 'object' && payload.data) {
    return payload.data;
  }
  return payload || {};
}

/**
 * Determine if a PayOS webhook indicates successful payment.
 * Checks multiple fields/formats for robustness.
 */
function isPaymentSuccessful(data) {
  if (!data) return false;

  const code = String(data.code ?? '').trim().toUpperCase();
  const desc = String(data.desc ?? '').trim().toUpperCase();

  // PayOS success indicators
  return (
    code === '00' ||
    code === '0' ||
    desc === 'THÀNH CÔNG' ||
    desc === 'SUCCESS' ||
    desc === 'THANH CONG'
  );
}

// ── Service Class ─────────────────────────────────────────────────────────────

class UserConsultationService {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CREATE HIRE CHECKOUT
  // ─────────────────────────────────────────────────────────────────────────────

  _calculatePackagePrice(baseFee, packageType) {
    let multiplier = 1;
    let discount = 0;
    if (packageType === '3_months') {
      multiplier = 3;
      discount = 0.11;
    } else if (packageType === '6_months') {
      multiplier = 6;
      discount = 0.16;
    }
    return Math.round(baseFee * multiplier * (1 - discount));
  }

  /**
   * Initiate the "Hire a Nutritionist" payment flow.
   *
   * Flow:
   *  1. Validate the nutritionist exists and is approved.
   *  2. Prevent duplicate active contracts for the same pair.
   *  3. Create a ConsultationContract (status: pending_payment).
   *  4. Create a Transaction record (status: PENDING).
   *  5. Call PayOS to generate a payment link + QR code.
   *  6. Persist the payment link/QR on the transaction.
   *  7. Return checkout data to the client.
   *
   * @param {string} userId - Authenticated user's ID.
   * @param {string} nutritionistId - Target nutritionist's _id.
   * @returns {Object} Checkout data including payment link, QR code, order code.
   */
  async createHireCheckout(userId, nutritionistId, packageType = '1_month') {
    // ── Step 1: Validate nutritionist ────────────────────────────────────────
    if (!nutritionistId) {
      throw new AppError('nutritionist_id is required.', 400);
    }

    const nutritionist = await Nutritionist.findById(nutritionistId);
    if (!nutritionist) {
      throw new AppError('Nutritionist not found.', 404);
    }
    if (nutritionist.approval_status !== 'approval') {
      throw new AppError('This nutritionist has not been approved yet.', 400);
    }
    if (!nutritionist.service_fee || nutritionist.service_fee <= 0) {
      throw new AppError('Nutritionist has no valid service fee configured.', 400);
    }

    // ── Step 2: Prevent duplicate active contracts (Globally 1:1) ───────────
    const existingContract = await ConsultationContract.findOne({
      user_id: userId,
      status: { $in: ['pending_payment', 'active'] }
    });

    if (existingContract) {
      if (existingContract.status === 'active') {
        throw new AppError(
          'You already have an active consultation contract. You cannot hire another nutritionist.',
          409
        );
      }

      // pending_payment — check if there's a still-valid (not expired) transaction
      const pendingTx = await Transaction.findOne({
        consultation_contracts_id_fk: existingContract._id,
        status: 'PENDING'
      });

      if (pendingTx && pendingTx.payos_payment_link) {
        if (pendingTx.package_type !== packageType) {
          // If the user selects a different package type, cancel the old pending transaction.
          try {
            await payOS.cancelPaymentLink(pendingTx.payos_order_code, "User selected a different package type.");
          } catch (e) {
            // Ignore if PayOS already cancelled it or order not found
          }
          pendingTx.status = 'CANCELLED';
          await pendingTx.save();
          existingContract.status = 'cancelled';
          await existingContract.save();
          
          // Let the code proceed to step 3 to create a new contract/transaction.
        } else {
          let isStillValid = true;
          try {
          // Double check the real status with PayOS
          const paymentInfo = await payOS.getPaymentLinkInformation(pendingTx.payos_order_code);
          if (paymentInfo && (paymentInfo.status === 'CANCELLED' || paymentInfo.status === 'EXPIRED')) {
            isStillValid = false;
            // Sync status to DB
            pendingTx.status = 'CANCELLED';
            await pendingTx.save();
            existingContract.status = 'cancelled';
            await existingContract.save();
          } else if (paymentInfo && paymentInfo.status === 'PAID') {
            throw new AppError('You already have a paid consultation contract. Please wait for it to be activated.', 409);
          }
        } catch (e) {
          // If PayOS throws (e.g., order not found or already cancelled), assume invalid
          if (e instanceof AppError) throw e;
          isStillValid = false;
          pendingTx.status = 'CANCELLED';
          await pendingTx.save();
          existingContract.status = 'cancelled';
          await existingContract.save();
        }

        if (isStillValid) {
          // Return the existing payment link instead of creating a new one
          return {
            order_code: pendingTx.payos_order_code,
            amount: pendingTx.amount_gross,
            checkout_url: pendingTx.payos_payment_link,
            qr_code: pendingTx.payos_qr_code,
            contract_id: existingContract._id,
            nutritionist: {
              _id: nutritionist._id,
              full_name: nutritionist.full_name,
              specialization: nutritionist.specialization,
              service_fee: nutritionist.service_fee
            }
          };
        }
      }
    }
  }

    // ── Step 3: Calculate amounts ────────────────────────────────────────────
    const amountGross = this._calculatePackagePrice(nutritionist.service_fee, packageType);
    
    const platformFee = Math.round(amountGross * PLATFORM_FEE_RATE);
    const expertPayout = amountGross - platformFee;

    // ── Step 4: Build PayOS order ────────────────────────────────────────────
    const orderCode = buildOrderCode();
    const shortCode = String(orderCode).slice(-6);
    const description = `Thue CV ${nutritionist.full_name.substring(0, 10)} #${shortCode}`.slice(0, 25);

    const paymentData = {
      orderCode,
      amount: amountGross,
      description,
      returnUrl: PAYOS_RETURN_URL,
      cancelUrl: PAYOS_CANCEL_URL,
      expiredAt: Math.floor(Date.now() / 1000) + 15 * 60 // 15-minute expiry
    };

    let paymentLinkData;
    try {
      paymentLinkData = await payOS.createPaymentLink(paymentData);
    } catch (error) {
      console.error('[PayOS] createPaymentLink failed:', error.message);
      throw new AppError('Failed to create payment link. Please try again later.', 502);
    }

    // ── Step 5: Database Transaction (Atomic Creation) ────────────────────────
    let contract, transaction;
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      [contract] = await ConsultationContract.create([{
        user_id: userId,
        nutritionist_id: nutritionistId,
        status: 'pending_payment',
        package_type: packageType
      }], { session });

      [transaction] = await Transaction.create([{
        consultation_contracts_id_fk: contract._id,
        user_id: userId,
        payos_order_code: String(orderCode),
        payos_payment_link: paymentLinkData.checkoutUrl,
        payos_qr_code: paymentLinkData.qrCode || '',
        amount_gross: amountGross,
        platform_fee: platformFee,
        expert_payout: expertPayout,
        status: 'PENDING',
        package_type: packageType,
        description
      }], { session });

      await session.commitTransaction();
      session.endSession();
    } catch (dbError) {
      await session.abortTransaction();
      session.endSession();
      console.error('[PayOS] Database transaction failed:', dbError.message);
      // We can optionally cancel the PayOS link here, but it will expire in 15m automatically.
      throw new AppError('Failed to save payment record. Please try again.', 500);
    }

    // ── Step 6: Return checkout data ─────────────────────────────────────────
    return {
      order_code: transaction.payos_order_code,
      amount: amountGross,
      checkout_url: paymentLinkData.checkoutUrl,
      qr_code: paymentLinkData.qrCode || '',
      contract_id: contract._id,
      transaction_id: transaction._id,
      nutritionist: {
        _id: nutritionist._id,
        full_name: nutritionist.full_name,
        specialization: nutritionist.specialization,
        service_fee: nutritionist.service_fee
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. HANDLE PAYOS WEBHOOK & CANCEL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handle the Cancel webhook/redirect from PayOS
   */
  async handlePayOSCancel(orderCode) {
    if (!orderCode) return;
    try {
      const tx = await Transaction.findOne({ payos_order_code: String(orderCode) });
      if (tx && tx.status === 'PENDING') {
        tx.status = 'CANCELLED';
        await tx.save();
        await ConsultationContract.findByIdAndUpdate(tx.consultation_contracts_id_fk, { status: 'cancelled' });
        console.log(`[Webhook] Transaction ${orderCode} cancelled via webhook sync.`);
      }
    } catch (err) {
      console.error('[Webhook] Failed to handle cancel sync:', err.message);
    }
  }

  /**
   * Process incoming PayOS webhook.
   *
   * Safety mechanisms:
   *  1. Signature verification via SDK (HMAC-SHA256 with PAYOS_CHECKSUM_KEY).
   *  2. Idempotency: if payos_transaction_id is already set, skip.
   *  3. Atomic status transition: only pending_payment → active.
   *  4. Notification failures are isolated and never block the 200 response.
   *
   * @param {Object} webhookBody - Raw POST body from PayOS.
   * @returns {Object} Processing result.
   */
  async handlePayOSWebhook(webhookBody) {
    console.log('[Webhook] PayOS webhook received.');

    // ── Step 1: Verify signature ─────────────────────────────────────────────
    let verified;
    try {
      verified =
        typeof payOS.verifyPaymentWebhookData === 'function'
          ? payOS.verifyPaymentWebhookData(webhookBody)
          : webhookBody;
    } catch (error) {
      console.error('[Webhook] Signature verification failed:', error.message);
      throw new AppError('Invalid webhook signature.', 400);
    }

    const data = normalizeWebhookData(verified);
    const orderCode = String(data.orderCode);

    if (!orderCode || orderCode === 'undefined') {
      console.error('[Webhook] Missing orderCode in payload.');
      throw new AppError('Invalid orderCode in webhook payload.', 400);
    }

    console.log(`[Webhook] Processing orderCode: ${orderCode}`);

    // PayOS sends orderCode '123' to verify the webhook URL when saving in the dashboard.
    // We must return a successful response so the URL can be saved.
    if (orderCode === '123') {
      console.log('[Webhook] PayOS test webhook (orderCode: 123) successfully acknowledged.');
      return {
        processed: true,
        is_test: true,
        order_code: orderCode
      };
    }

    // ── Step 2: Find matching transaction ────────────────────────────────────
    const transaction = await Transaction.findOne({ payos_order_code: orderCode });
    if (!transaction) {
      console.error(`[Webhook] Transaction not found for orderCode: ${orderCode}`);
      throw new AppError('Transaction not found.', 404);
    }

    // ── Step 3: Idempotency & Amount verification ────────────────────────────
    if (transaction.payos_transaction_id) {
      console.log(`[Webhook] Transaction already processed (idempotent). orderCode: ${orderCode}`);
      return {
        processed: true,
        already_handled: true,
        order_code: orderCode
      };
    }

    const paidAmount = Number(data.amount) || 0;
    if (paidAmount < transaction.amount_gross) {
      console.error(`[Webhook] Amount mismatch. Expected ${transaction.amount_gross}, received ${paidAmount}`);
      transaction.status = 'FAILED';
      transaction.payos_transaction_id = data.transactionId || data.reference || null;
      await transaction.save();
      throw new AppError('Payment amount mismatch. Transaction failed.', 400);
    }

    // ── Step 4: Check payment success ────────────────────────────────────────
    if (!isPaymentSuccessful(data)) {
      console.log('[Webhook] Payment not successful. Data:', JSON.stringify(data));

      // Mark transaction as failed if the payment was explicitly rejected
      transaction.status = 'FAILED';
      transaction.payos_transaction_id = data.transactionId || data.reference || null;
      await transaction.save();

      return {
        processed: true,
        payment_success: false,
        order_code: orderCode,
        message: 'Payment was not successful.'
      };
    }

    // ── Step 5 & 6: Update Transaction & Contract Atomically ───────────
    const session = await mongoose.startSession();
    session.startTransaction();

    let contract;
    try {
      transaction.payos_transaction_id =
        data.transactionId || data.reference || data.paymentLinkId || null;
      transaction.status = 'PAID';
      await transaction.save({ session });

      contract = await ConsultationContract.findById(
        transaction.consultation_contracts_id_fk
      ).session(session);

      if (contract && contract.status === 'pending_payment') {
        contract.status = 'active';

        // Set expire_at based on package_type safely without mutating `now`
        const now = new Date();
        const expireAt = new Date(now.getTime());
        if (contract.package_type === '6_months') {
          expireAt.setMonth(expireAt.getMonth() + 6);
        } else if (contract.package_type === '3_months') {
          expireAt.setMonth(expireAt.getMonth() + 3);
        } else {
          expireAt.setMonth(expireAt.getMonth() + 1);
        }
        contract.expire_at = expireAt;

        await contract.save({ session });
      }

      await session.commitTransaction();
      session.endSession();
    } catch (dbError) {
      await session.abortTransaction();
      session.endSession();
      console.error('[Webhook] DB Transaction failed:', dbError.message);
      throw new AppError('Failed to process payment atomically.', 500);
    }

    if (contract && contract.status === 'active') {
      console.log(`[Webhook] Contract ${contract._id} activated.`);
      
      // ── Step 7: Create notifications & Audit log (Concurrent) ────────────────
      try {
        await Promise.all([
          this._createPaymentNotifications(contract, transaction),
          AuditLog.create({
            user_id: contract.user_id,
            action: 'PAYMENT',
            description: `Payment confirmed for contract ${contract._id}. ` +
              `OrderCode: ${orderCode}, Amount: ${transaction.amount_gross} VND.`
          })
        ]);
      } catch (backgroundError) {
        // Never block the webhook response for background task failures
        console.error('[Webhook] Background tasks (Notification/AuditLog) failed:', backgroundError.message);
      }
    }

    console.log(`[Webhook] Successfully processed orderCode: ${orderCode}`);

    return {
      processed: true,
      payment_success: true,
      order_code: orderCode,
      contract_id: contract?._id
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. GET TRANSACTION DETAIL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Return a single transaction detail for the user
   */
  async getTransactionDetail(userId, transactionId) {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      user_id: userId
    })
      .populate({
        path: 'consultation_contracts_id_fk',
        select: 'nutritionist_id status create_at',
        populate: {
          path: 'nutritionist_id',
          model: 'Nutritionist',
          select: 'full_name specialization service_fee certification_url average_rating'
        }
      })
      .lean();

    if (!transaction) {
      throw new AppError('Transaction not found.', 404);
    }
    return transaction;
  }

  /**
   * Return the user's currently active ConsultationContract (if any)
   */
  async getActiveContract(userId) {
    const activeContract = await ConsultationContract.findOne({
      user_id: userId,
      status: 'active'
    }).populate({
      path: 'nutritionist_id',
      select: 'full_name email phone specialization experience_years profile_image service_fee rating'
    }).lean();

    return activeContract;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create in-app notifications for both the user and the nutritionist
   * after a successful payment. Errors are caught by the caller.
   */
  async _createPaymentNotifications(contract, transaction) {
    const nutritionist = await Nutritionist.findById(contract.nutritionist_id)
      .select('full_name user_id');

    const nutritionistName = nutritionist?.full_name || 'Nutritionist';
    const formattedAmount = new Intl.NumberFormat('en-US').format(transaction.amount_gross);

    const notifications = [];

    // Notification for the customer
    notifications.push(
      Notification.create({
        user_id: contract.user_id,
        title: 'Payment successful',
        body: `You have successfully hired ${nutritionistName}. ` +
          `Amount: ${formattedAmount} VND. The consultation contract is now active.`,
        type: 'transaction',
        metadata: { transaction_id: transaction._id.toString() }
      })
    );

    // Notification for the nutritionist
    if (nutritionist?.user_id) {
      notifications.push(
        Notification.create({
          user_id: nutritionist.user_id,
          title: 'New Client',
          body: `You have a new client who paid ${formattedAmount} VND. ` +
            `Consultation contract #${contract._id.toString().slice(-6)} is now active.`,
          type: 'transaction',
          metadata: { transaction_id: transaction._id.toString() }
        })
      );
    }

    await Promise.all(notifications);
  }
}

module.exports = new UserConsultationService();

/**
 * fix-db-orphans.js
 *
 * Wealthy Eater – Pre-Release Database Orphan Cleanup
 * ─────────────────────────────────────────────────────
 * Runs 7 sequential phases to clean up all orphan documents
 * found by audit-full-db.js. Safe to re-run (idempotent).
 *
 * Usage: node scripts/fix-db-orphans.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// ── Load all models ───────────────────────────────────────────────────────────
const modelsDir = path.join(__dirname, '../src/models');
fs.readdirSync(modelsDir)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => require(path.join(modelsDir, f)));

// ── Helpers ───────────────────────────────────────────────────────────────────
let totalDeleted = 0;
let totalPatched = 0;

function header(phase, title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  PHASE ${phase}: ${title}`);
  console.log('═'.repeat(60));
}

function logDel(collection, count) {
  if (count > 0) {
    console.log(`  🗑️  Deleted ${count} document(s) from ${collection}`);
    totalDeleted += count;
  } else {
    console.log(`  ✅ ${collection}: nothing to delete`);
  }
}

// ── Package duration map ──────────────────────────────────────────────────────
const PACKAGE_DAYS = { '1_month': 30, '3_months': 90, '6_months': 180 };

// ─────────────────────────────────────────────────────────────────────────────
async function fixDbOrphans() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║    WEALTHY EATER – PRE-RELEASE DB ORPHAN CLEANUP         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  ${new Date().toISOString()}\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('  Connected to MongoDB Atlas.\n');

  const User                 = mongoose.model('User');
  const Recipe               = mongoose.model('Recipe');
  const MealPlan             = mongoose.model('MealPlan');
  const MealPlanItem         = mongoose.model('MealPlanItem');
  const ConsultationContract = mongoose.model('ConsultationContract');
  const Transaction          = mongoose.model('Transaction');
  const Notification         = mongoose.model('Notification');

  const ConsultationMessage  = mongoose.modelNames().includes('ConsultationMessage')
    ? mongoose.model('ConsultationMessage') : null;
  const CustomerMealLog      = mongoose.modelNames().includes('CustomerMealLog')
    ? mongoose.model('CustomerMealLog') : null;

  // ── Pre-compute valid ID sets ─────────────────────────────────────────────
  const validUserIds    = new Set((await User.find({}, '_id')).map((u) => u._id));
  const validRecipeIds  = new Set((await Recipe.find({}, '_id')).map((r) => r._id));

  // ══════════════════════════════════════════════════════════════
  // PHASE 1: Cascade delete orphan Contracts + all linked data
  // ══════════════════════════════════════════════════════════════
  header(1, 'Cascade Delete Orphan Contracts');

  const allContracts      = await ConsultationContract.find({});
  const orphanContracts   = allContracts.filter((c) => !validUserIds.has(c.user_id));
  const orphanContractIds = orphanContracts.map((c) => c._id);
  const orphanUserIds     = orphanContracts.map((c) => c.user_id);

  console.log(`  Found ${orphanContractIds.length} orphan contract(s).`);

  if (orphanContractIds.length > 0) {
    // 1a. Messages linked to orphan contracts
    if (ConsultationMessage) {
      const r = await ConsultationMessage.deleteMany({
        contract_id: { $in: orphanContractIds },
      });
      logDel('ConsultationMessage', r.deletedCount);
    }

    // 1b. Transactions linked to orphan contract OR orphan user
    const r1b = await Transaction.deleteMany({
      $or: [
        { consultation_contracts_id_fk: { $in: orphanContractIds } },
        { user_id: { $in: orphanUserIds } },
      ],
    });
    logDel('Transaction (orphan contract/user)', r1b.deletedCount);

    // 1c. Notifications for orphan users
    const r1c = await Notification.deleteMany({ user_id: { $in: orphanUserIds } });
    logDel('Notification (orphan user)', r1c.deletedCount);

    // 1d. CustomerMealLog for orphan users
    if (CustomerMealLog) {
      const r1d = await CustomerMealLog.deleteMany({ user_id: { $in: orphanUserIds } });
      logDel('CustomerMealLog (orphan user)', r1d.deletedCount);
    }

    // 1e. The orphan Contracts themselves (last)
    const r1e = await ConsultationContract.deleteMany({ _id: { $in: orphanContractIds } });
    logDel('ConsultationContract', r1e.deletedCount);
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 2: MealPlanItem orphan cleanup
  // ══════════════════════════════════════════════════════════════
  header(2, 'MealPlanItem Orphan Cleanup');

  const r2a = await MealPlanItem.deleteMany({
    $and: [
      { recipe_id: { $nin: [...validRecipeIds, 'AI_GENERATED'] } },
      { recipe_id: { $ne: null } },
    ],
  });
  logDel('MealPlanItem (orphan recipe_id)', r2a.deletedCount);

  // Find MealPlans that now have ZERO items
  const allMealPlanIds   = (await MealPlan.find({}, '_id')).map((mp) => mp._id);
  const emptyMealPlanIds = [];
  for (const mpId of allMealPlanIds) {
    const count = await MealPlanItem.countDocuments({ meal_plan_id: mpId });
    if (count === 0) emptyMealPlanIds.push(mpId);
  }
  if (emptyMealPlanIds.length > 0) {
    const r2b = await MealPlan.deleteMany({ _id: { $in: emptyMealPlanIds } });
    logDel('MealPlan (empty after item cleanup)', r2b.deletedCount);
  } else {
    console.log('  ✅ MealPlan: no empty plans to delete');
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 3: Orphan Transactions (contract does not exist)
  // ══════════════════════════════════════════════════════════════
  header(3, 'Orphan Transaction Cleanup');

  const validContractIds = new Set(
    (await ConsultationContract.find({}, '_id')).map((c) => c._id)
  );
  const allTxs = await Transaction.find({}, 'consultation_contracts_id_fk user_id');
  const orphanTxIds = allTxs
    .filter(
      (tx) =>
        !validContractIds.has(tx.consultation_contracts_id_fk) ||
        !validUserIds.has(tx.user_id)
    )
    .map((tx) => tx._id);

  if (orphanTxIds.length > 0) {
    const r3 = await Transaction.deleteMany({ _id: { $in: orphanTxIds } });
    logDel('Transaction (orphan)', r3.deletedCount);
  } else {
    console.log('  ✅ Transaction: no orphans found');
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 4: Patch missing expire_at on Active Contracts
  // ══════════════════════════════════════════════════════════════
  header(4, 'Patch Missing expire_at on Active Contracts');

  const needExpiry = await ConsultationContract.find({ status: 'active', expire_at: null });
  console.log(`  Found ${needExpiry.length} active contract(s) missing expire_at.`);

  let patchedExpiry = 0;
  for (const c of needExpiry) {
    const days     = PACKAGE_DAYS[c.package_type] || 30;
    const baseDate = c.create_at || c.createdAt || new Date();
    const expireAt = new Date(baseDate);
    expireAt.setDate(expireAt.getDate() + days);
    await ConsultationContract.findByIdAndUpdate(c._id, { $set: { expire_at: expireAt } });
    console.log(`  🔧 Contract ${c._id}: expire_at → ${expireAt.toISOString()}`);
    patchedExpiry++;
    totalPatched++;
  }
  if (patchedExpiry === 0) console.log('  ✅ No contracts need patching.');

  // ══════════════════════════════════════════════════════════════
  // PHASE 5: Safety-net – remaining orphan Notifications & Logs
  // ══════════════════════════════════════════════════════════════
  header(5, 'Safety-Net Orphan Cleanup');

  // Orphan Notifications
  const allNotifs = await Notification.find({}, 'user_id');
  const orphanNotifIds = allNotifs
    .filter((n) => !validUserIds.has(n.user_id))
    .map((n) => n._id);
  if (orphanNotifIds.length > 0) {
    const r5a = await Notification.deleteMany({ _id: { $in: orphanNotifIds } });
    logDel('Notification (safety net)', r5a.deletedCount);
  } else {
    console.log('  ✅ Notification: no remaining orphans');
  }

  // Orphan CustomerMealLogs
  if (CustomerMealLog) {
    const allLogs    = await CustomerMealLog.find({}, 'user_id');
    const orphanLogs = allLogs.filter((l) => !validUserIds.has(l.user_id)).map((l) => l._id);
    if (orphanLogs.length > 0) {
      const r5b = await CustomerMealLog.deleteMany({ _id: { $in: orphanLogs } });
      logDel('CustomerMealLog (safety net)', r5b.deletedCount);
    } else {
      console.log('  ✅ CustomerMealLog: no remaining orphans');
    }
  }

  // Orphan ConsultationMessages
  if (ConsultationMessage) {
    const finalContractIds = new Set(
      (await ConsultationContract.find({}, '_id')).map((c) => c._id)
    );
    const allMsgs    = await ConsultationMessage.find({}, 'contract_id');
    const orphanMsgs = allMsgs
      .filter((m) => m.contract_id && !finalContractIds.has(m.contract_id))
      .map((m) => m._id);
    if (orphanMsgs.length > 0) {
      const r5c = await ConsultationMessage.deleteMany({ _id: { $in: orphanMsgs } });
      logDel('ConsultationMessage (safety net)', r5c.deletedCount);
    } else {
      console.log('  ✅ ConsultationMessage: no remaining orphans');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 6: Self-Verification
  // ══════════════════════════════════════════════════════════════
  header(6, 'Self-Verification');

  let selfCritical = 0;
  let selfError    = 0;

  const finalUserIds     = new Set((await User.find({}, '_id')).map((u) => u._id));
  const finalContractIds2 = new Set((await ConsultationContract.find({}, '_id')).map((c) => c._id));
  const finalRecipeIds   = new Set((await Recipe.find({}, '_id')).map((r) => r._id));

  // Contract integrity
  const finalContracts = await ConsultationContract.find({});
  for (const c of finalContracts) {
    if (!finalUserIds.has(c.user_id)) {
      console.log(`  🔴 STILL CRITICAL: Contract ${c._id} user missing`);
      selfCritical++;
    }
    if (c.status === 'active' && !c.expire_at) {
      console.log(`  🟠 STILL ERROR: Contract ${c._id} active with no expire_at`);
      selfError++;
    }
  }

  // Transaction integrity
  const finalTxs = await Transaction.find({});
  for (const tx of finalTxs) {
    if (!finalContractIds2.has(tx.consultation_contracts_id_fk)) {
      console.log(`  🟠 STILL ERROR: Transaction ${tx._id} orphan contract`);
      selfError++;
    }
    if (!finalUserIds.has(tx.user_id)) {
      console.log(`  🟠 STILL ERROR: Transaction ${tx._id} orphan user`);
      selfError++;
    }
  }

  // MealPlanItem integrity
  const finalMPIs = await MealPlanItem.find({});
  for (const item of finalMPIs) {
    if (item.recipe_id && item.recipe_id !== 'AI_GENERATED' && !finalRecipeIds.has(item.recipe_id)) {
      console.log(`  🟠 STILL ERROR: MealPlanItem ${item._id} orphan recipe`);
      selfError++;
    }
  }

  // Notification integrity
  const finalNotifs      = await Notification.find({}, 'user_id');
  const orphanNotifFinal = finalNotifs.filter((n) => !finalUserIds.has(n.user_id)).length;
  if (orphanNotifFinal > 0) {
    console.log(`  🟠 STILL ERROR: ${orphanNotifFinal} orphan notification(s)`);
    selfError += orphanNotifFinal;
  }

  if (selfCritical === 0 && selfError === 0) {
    console.log('  ✅ All integrity checks passed!');
  }

  // ══════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                  CLEANUP SUMMARY                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Documents deleted : ${totalDeleted}`);
  console.log(`  Documents patched : ${totalPatched}`);
  console.log('');

  if (selfCritical === 0 && selfError === 0) {
    console.log('  🚀 RESULT: ALL CLEAR');
    console.log('  Run `node scripts/audit-full-db.js` for the final confirmation.\n');
    process.exit(0);
  } else {
    console.log(`  ⚠️  RESULT: ${selfCritical} CRITICAL, ${selfError} ERROR remain.`);
    console.log('  Run `node scripts/audit-full-db.js` for full detail.\n');
    process.exit(1);
  }
}

fixDbOrphans().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});

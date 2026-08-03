/**
 * audit-full-db.js
 *
 * FULL DATABASE AUDIT – Wealthy Eater Pre-Release Checklist
 * ─────────────────────────────────────────────────────────
 * Kiểm tra toàn bộ database trước khi release production.
 * Phát hiện:
 *   [CRITICAL] – Lỗi nghiêm trọng sẽ gây crash hoặc data sai lệch
 *   [ERROR]    – Lỗi logic cần fix trước release
 *   [WARNING]  – Vấn đề cần lưu ý, không block release
 *   [INFO]     – Thông tin tổng quan
 *
 * Usage: node scripts/audit-full-db.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path     = require('path');
const fs       = require('fs');

// ─── Load Models ──────────────────────────────────────────────────────────────
const modelsDir = path.join(__dirname, '../src/models');
fs.readdirSync(modelsDir)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => require(path.join(modelsDir, f)));

// ─── Reporting helpers ────────────────────────────────────────────────────────
let criticalCount = 0;
let errorCount    = 0;
let warningCount  = 0;
const issues      = [];

function log(level, section, message) {
  const icons = { CRITICAL: '🔴', ERROR: '🟠', WARNING: '🟡', INFO: '✅', HEADER: '📋' };
  const icon = icons[level] || '•';
  const line = `  ${icon} [${level}] ${message}`;
  console.log(line);
  if (level === 'CRITICAL') { criticalCount++; issues.push({ level, section, message }); }
  if (level === 'ERROR')    { errorCount++;    issues.push({ level, section, message }); }
  if (level === 'WARNING')  { warningCount++;  issues.push({ level, section, message }); }
}

function header(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function subheader(title) {
  console.log(`\n  ─── ${title} ───────────────────────────────────────────`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function auditFullDatabase() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║      WEALTHY EATER – FULL DATABASE PRE-RELEASE AUDIT     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Time: ${new Date().toISOString()}\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('  Connected to MongoDB Atlas.\n');

  const models = {};
  for (const name of mongoose.modelNames()) {
    models[name] = mongoose.model(name);
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 0: COLLECTION OVERVIEW
  // ══════════════════════════════════════════════════════════════
  header('SECTION 0: COLLECTION OVERVIEW');
  const collectionStats = [];
  for (const [name, model] of Object.entries(models)) {
    try {
      const count = await model.countDocuments();
      collectionStats.push({ name, count });
      const status = count === 0 ? '⚠️  EMPTY' : `✅ ${count} docs`;
      console.log(`    ${name.padEnd(35)} ${status}`);
      if (count === 0) {
        log('WARNING', 'Overview', `Collection "${name}" is empty.`);
      }
    } catch (e) {
      log('ERROR', 'Overview', `Cannot count "${name}": ${e.message}`);
    }
  }
  const totalDocs = collectionStats.reduce((s, c) => s + c.count, 0);
  console.log(`\n    Total documents across all collections: ${totalDocs}`);

  // ══════════════════════════════════════════════════════════════
  // SECTION 1: USER INTEGRITY
  // ══════════════════════════════════════════════════════════════
  header('SECTION 1: USER INTEGRITY');

  const User        = models['User'];
  const UserProfile = models['UserProfile'];
  const UserDietary = models['UserDietary'];

  if (User && UserProfile) {
    subheader('User ↔ UserProfile');
    const customers   = await User.find({ role: 'customer' }, '_id email');
    const profileUserIds = (await UserProfile.find({}, 'user_id')).map((p) => p.user_id);
    const profileSet  = new Set(profileUserIds);

    let missingProfile = 0;
    for (const user of customers) {
      if (!profileSet.has(user._id)) {
        log('WARNING', 'User', `Customer ${user.email || user._id} has no UserProfile (onboarding incomplete).`);
        missingProfile++;
      }
    }
    if (missingProfile === 0) {
      log('INFO', 'User', `All ${customers.length} customers have a UserProfile.`);
    }

    // Check profiles pointing to non-existent users
    const userIdSet = new Set((await User.find({}, '_id')).map((u) => u._id));
    const orphanProfiles = profileUserIds.filter((id) => !userIdSet.has(id));
    if (orphanProfiles.length > 0) {
      log('CRITICAL', 'User', `${orphanProfiles.length} UserProfile(s) reference non-existent User IDs (orphan data).`);
    } else {
      log('INFO', 'User', 'No orphan UserProfiles found.');
    }

    // BMI/BMR/TDEE sanity check
    subheader('UserProfile BMI/BMR/TDEE sanity');
    const profiles = await UserProfile.find({});
    let bmiIssues = 0;
    for (const p of profiles) {
      if (p.height && p.weight) {
        const expectedBmi = p.weight / Math.pow(p.height / 100, 2);
        if (p.bmi && Math.abs(p.bmi - expectedBmi) > 2) {
          log('WARNING', 'UserProfile', `Profile ${p._id}: BMI stored=${p.bmi?.toFixed(1)}, calculated=${expectedBmi.toFixed(1)} (diff >2).`);
          bmiIssues++;
        }
      }
      if (p.height <= 0 || p.height > 250) {
        log('ERROR', 'UserProfile', `Profile ${p._id}: suspicious height=${p.height}cm.`);
      }
      if (p.weight <= 0 || p.weight > 300) {
        log('ERROR', 'UserProfile', `Profile ${p._id}: suspicious weight=${p.weight}kg.`);
      }
      if (p.age <= 0 || p.age > 120) {
        log('ERROR', 'UserProfile', `Profile ${p._id}: suspicious age=${p.age}.`);
      }
    }
    if (bmiIssues === 0 && profiles.length > 0) {
      log('INFO', 'UserProfile', `All ${profiles.length} profiles have valid BMI values.`);
    }
  }

  if (User && UserDietary) {
    subheader('User ↔ UserDietary');
    const userIdSet = new Set((await User.find({}, '_id')).map((u) => u._id));
    const dietaries = await UserDietary.find({}, 'user_id allergies dislike_ingredients');
    let orphanDiet = 0;
    for (const d of dietaries) {
      if (!userIdSet.has(d.user_id)) {
        log('ERROR', 'UserDietary', `UserDietary ${d._id} references non-existent User ${d.user_id}.`);
        orphanDiet++;
      }
    }
    if (orphanDiet === 0) {
      log('INFO', 'UserDietary', `All ${dietaries.length} UserDietary records link to valid users.`);
    }

    // Check allergy references
    if (models['Ingredient']) {
      const ingredientIds = new Set((await models['Ingredient'].find({}, '_id')).map((i) => i._id));
      let badAllergyCount = 0;
      for (const d of dietaries) {
        for (const allergyId of (d.allergies || [])) {
          if (!ingredientIds.has(allergyId)) {
            log('CRITICAL', 'UserDietary', `User ${d.user_id}: allergy references missing Ingredient ${allergyId}.`);
            badAllergyCount++;
          }
        }
      }
      if (badAllergyCount === 0 && dietaries.length > 0) {
        log('INFO', 'UserDietary', 'All allergy ingredient references are valid.');
      }
    }
  }

  // Users with no email and no phone (can't login)
  if (User) {
    subheader('User login credentials');
    const noCredentials = await User.countDocuments({ email: null, phone: null, googleId: null });
    if (noCredentials > 0) {
      log('ERROR', 'User', `${noCredentials} User(s) have no email, phone, or googleId – cannot login.`);
    } else {
      log('INFO', 'User', 'All users have at least one login credential.');
    }
    const suspended = await User.countDocuments({ status: 'suspended' });
    const banned    = await User.countDocuments({ status: 'banned' });
    if (suspended > 0) log('INFO', 'User', `${suspended} user(s) are suspended.`);
    if (banned > 0)    log('WARNING', 'User', `${banned} user(s) are banned.`);
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 2: NUTRITIONIST INTEGRITY
  // ══════════════════════════════════════════════════════════════
  header('SECTION 2: NUTRITIONIST INTEGRITY');

  const Nutritionist = models['Nutritionist'];

  if (Nutritionist && User) {
    subheader('Nutritionist ↔ User');
    const nutritionists = await Nutritionist.find({});
    const userIdSet = new Set((await User.find({}, '_id')).map((u) => u._id));
    let orphanNutri = 0;

    for (const n of nutritionists) {
      if (!userIdSet.has(n.user_id)) {
        log('CRITICAL', 'Nutritionist', `Nutritionist ${n._id} references non-existent User ${n.user_id}.`);
        orphanNutri++;
      }
      if (n.service_fee < 0) {
        log('ERROR', 'Nutritionist', `Nutritionist ${n._id} has negative service_fee=${n.service_fee}.`);
      }
    }
    if (orphanNutri === 0) {
      log('INFO', 'Nutritionist', `All ${nutritionists.length} nutritionists link to valid users.`);
    }

    const approved = nutritionists.filter((n) => ['approval', 'APPROVED'].includes(n.approval_status)).length;
    const pending  = nutritionists.filter((n) => ['pending', 'PENDING'].includes(n.approval_status)).length;
    log('INFO', 'Nutritionist', `Status breakdown: ${approved} APPROVED, ${pending} PENDING, ${nutritionists.length - approved - pending} REJECTED.`);
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 3: RECIPE ECOSYSTEM INTEGRITY
  // ══════════════════════════════════════════════════════════════
  header('SECTION 3: RECIPE ECOSYSTEM INTEGRITY');

  const Recipe                   = models['Recipe'];
  const Ingredient               = models['Ingredient'];
  const RecipeIngredient         = models['RecipeIngredient'];
  const RecipeNutrition          = models['RecipeNutrition'];
  const RecipeStep               = models['RecipeStep'];
  const RecipeMicronutrientValue = models['RecipeMicronutrientValue'];
  const Micronutrient            = models['Micronutrient'];

  if (Recipe) {
    subheader('Recipe completeness');
    const recipes    = await Recipe.find({});
    let perfectCount = 0;
    let missingNut   = 0;
    let missingIng   = 0;
    let missingStep  = 0;
    let suspiciousMacro = 0;

    for (const r of recipes) {
      const nutExists  = await RecipeNutrition.exists({ recipe_id: r._id });
      const ingCount   = await RecipeIngredient.countDocuments({ recipe_id: r._id });
      const stepCount  = await RecipeStep.countDocuments({ recipe_id: r._id });
      const microCount = await RecipeMicronutrientValue.countDocuments({ recipe_id: r._id });

      if (!nutExists)    missingNut++;
      if (ingCount === 0) missingIng++;
      if (stepCount === 0) missingStep++;

      // Macro sanity check
      if (nutExists) {
        const nut = await RecipeNutrition.findOne({ recipe_id: r._id });
        if (nut && (nut.calories > 5000 || nut.calories < 0)) {
          log('WARNING', 'Recipe', `"${r.name}" – suspicious calories=${nut.calories} kcal.`);
          suspiciousMacro++;
        }
        if (nut && (nut.protein > 500 || nut.protein < 0)) {
          log('WARNING', 'Recipe', `"${r.name}" – suspicious protein=${nut.protein}g.`);
          suspiciousMacro++;
        }
      }

      if (nutExists && ingCount > 0 && stepCount > 0 && microCount > 0) perfectCount++;
    }

    log('INFO',    'Recipe', `Total recipes: ${recipes.length}`);
    log('INFO',    'Recipe', `Perfect recipes (all data present): ${perfectCount}/${recipes.length}`);
    if (missingNut  > 0) log('ERROR',    'Recipe', `${missingNut} recipe(s) missing RecipeNutrition.`);
    if (missingIng  > 0) log('ERROR',    'Recipe', `${missingIng} recipe(s) missing RecipeIngredient (no ingredients).`);
    if (missingStep > 0) log('ERROR',    'Recipe', `${missingStep} recipe(s) missing RecipeStep (no cooking steps).`);
    if (suspiciousMacro === 0) log('INFO', 'Recipe', 'No obviously suspicious macro values detected.');

    // Check published status
    const unpublished = recipes.filter((r) => r.status !== 'published').length;
    if (unpublished > 0) log('WARNING', 'Recipe', `${unpublished} recipe(s) are not "published" (will not appear in app).`);
    else log('INFO', 'Recipe', 'All recipes are published.');

    // Orphan RecipeIngredients (pointing to missing Ingredient)
    subheader('RecipeIngredient orphan check');
    const allRIs    = await RecipeIngredient.find({});
    const ingIdSet  = new Set((await Ingredient.find({}, '_id')).map((i) => i._id));
    const recipeIdSet = new Set(recipes.map((r) => r._id));
    let orphanRI = 0;
    for (const ri of allRIs) {
      if (!ingIdSet.has(ri.ingredient_id)) {
        log('CRITICAL', 'RecipeIngredient', `RecipeIngredient ${ri._id}: ingredient_id ${ri.ingredient_id} does not exist.`);
        orphanRI++;
      }
      if (!recipeIdSet.has(ri.recipe_id)) {
        log('ERROR', 'RecipeIngredient', `RecipeIngredient ${ri._id}: recipe_id ${ri.recipe_id} does not exist.`);
        orphanRI++;
      }
    }
    if (orphanRI === 0) log('INFO', 'RecipeIngredient', 'No orphan RecipeIngredient records found.');

    // Orphan RecipeMicronutrientValues
    subheader('RecipeMicronutrientValue orphan check');
    if (RecipeMicronutrientValue && Micronutrient) {
      const allMRVs    = await RecipeMicronutrientValue.find({});
      const microIdSet = new Set((await Micronutrient.find({}, '_id')).map((m) => m._id));
      let orphanMRV = 0;
      for (const mrv of allMRVs) {
        if (!recipeIdSet.has(mrv.recipe_id)) {
          log('ERROR', 'RecipeMicronutrientValue', `RecipeMicronutrientValue ${mrv._id}: recipe_id ${mrv.recipe_id} does not exist.`);
          orphanMRV++;
        }
        if (!microIdSet.has(mrv.micronutrient_id)) {
          log('ERROR', 'RecipeMicronutrientValue', `RecipeMicronutrientValue ${mrv._id}: micronutrient_id ${mrv.micronutrient_id} does not exist.`);
          orphanMRV++;
        }
      }
      if (orphanMRV === 0) log('INFO', 'RecipeMicronutrientValue', 'No orphan RecipeMicronutrientValue records found.');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 4: MEAL PLAN INTEGRITY
  // ══════════════════════════════════════════════════════════════
  header('SECTION 4: MEAL PLAN INTEGRITY');

  const MealPlan     = models['MealPlan'];
  const MealPlanItem = models['MealPlanItem'];

  if (MealPlan && MealPlanItem && User) {
    subheader('MealPlan → User reference');
    const mealPlans  = await MealPlan.find({});
    const userIdSet  = new Set((await User.find({}, '_id')).map((u) => u._id));
    const recipeIdSet = models['Recipe']
      ? new Set((await models['Recipe'].find({}, '_id')).map((r) => r._id))
      : new Set();

    let orphanMP = 0;
    for (const mp of mealPlans) {
      if (!userIdSet.has(mp.user_id)) {
        log('CRITICAL', 'MealPlan', `MealPlan ${mp._id}: user_id ${mp.user_id} does not exist.`);
        orphanMP++;
      }
    }
    if (orphanMP === 0) log('INFO', 'MealPlan', `All ${mealPlans.length} MealPlans reference valid users.`);

    subheader('MealPlanItem → MealPlan + Recipe reference');
    const allMPItems    = await MealPlanItem.find({});
    const mpIdSet       = new Set(mealPlans.map((mp) => mp._id));
    let orphanMPI = 0;
    let noRecipeMPI = 0;

    for (const item of allMPItems) {
      if (!mpIdSet.has(item.meal_plan_id)) {
        log('ERROR', 'MealPlanItem', `MealPlanItem ${item._id}: meal_plan_id ${item.meal_plan_id} does not exist.`);
        orphanMPI++;
      }
      // recipe_id can be 'AI_GENERATED' or a valid recipe ID
      if (item.recipe_id && item.recipe_id !== 'AI_GENERATED' && !recipeIdSet.has(item.recipe_id)) {
        log('ERROR', 'MealPlanItem', `MealPlanItem ${item._id}: recipe_id ${item.recipe_id} does not exist.`);
        noRecipeMPI++;
      }
      // Sanity: meal_type should be present
      if (!item.meal_type) {
        log('WARNING', 'MealPlanItem', `MealPlanItem ${item._id}: missing meal_type.`);
      }
    }
    if (orphanMPI === 0)   log('INFO', 'MealPlanItem', `All ${allMPItems.length} items link to valid MealPlans.`);
    if (noRecipeMPI === 0) log('INFO', 'MealPlanItem', 'All recipe references in MealPlanItems are valid.');

    // Meal plans with no items
    subheader('MealPlans with no items');
    let emptyMPs = 0;
    for (const mp of mealPlans) {
      const itemCount = await MealPlanItem.countDocuments({ meal_plan_id: mp._id });
      if (itemCount === 0) {
        emptyMPs++;
      }
    }
    if (emptyMPs > 0) log('WARNING', 'MealPlan', `${emptyMPs} MealPlan(s) have no MealPlanItems.`);
    else log('INFO', 'MealPlan', 'All MealPlans have at least one item.');
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 5: CONSULTATION & PAYMENT INTEGRITY
  // ══════════════════════════════════════════════════════════════
  header('SECTION 5: CONSULTATION & PAYMENT INTEGRITY');

  const ConsultationContract = models['ConsultationContract'];
  const Transaction          = models['Transaction'];

  if (ConsultationContract && User && Nutritionist) {
    subheader('ConsultationContract references');
    const contracts  = await ConsultationContract.find({});
    const userIdSet  = new Set((await User.find({}, '_id')).map((u) => u._id));
    const nutriIdSet = new Set((await Nutritionist.find({}, '_id')).map((n) => n._id));
    let orphanContract = 0;

    for (const c of contracts) {
      if (!userIdSet.has(c.user_id)) {
        log('CRITICAL', 'ConsultationContract', `Contract ${c._id}: user_id ${c.user_id} does not exist.`);
        orphanContract++;
      }
      if (!nutriIdSet.has(c.nutritionist_id)) {
        log('ERROR', 'ConsultationContract', `Contract ${c._id}: nutritionist_id ${c.nutritionist_id} does not exist.`);
        orphanContract++;
      }
      // Active contract should have expire_at
      if (c.status === 'active' && !c.expire_at) {
        log('ERROR', 'ConsultationContract', `Active contract ${c._id} has no expire_at date.`);
      }
    }
    if (orphanContract === 0) log('INFO', 'ConsultationContract', `All ${contracts.length} contracts have valid user and nutritionist references.`);

    const statusBreakdown = {};
    for (const c of contracts) {
      statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1;
    }
    log('INFO', 'ConsultationContract', `Status breakdown: ${JSON.stringify(statusBreakdown)}`);
  }

  if (Transaction && ConsultationContract) {
    subheader('Transaction → ConsultationContract');
    const transactions = await Transaction.find({});
    const contractIdSet = new Set(
      (await ConsultationContract.find({}, '_id')).map((c) => c._id)
    );
    const userIdSet = new Set((await User.find({}, '_id')).map((u) => u._id));
    let orphanTx = 0;

    for (const tx of transactions) {
      if (!contractIdSet.has(tx.consultation_contracts_id_fk)) {
        log('ERROR', 'Transaction', `Transaction ${tx._id}: contract_id ${tx.consultation_contracts_id_fk} does not exist.`);
        orphanTx++;
      }
      if (!userIdSet.has(tx.user_id)) {
        log('ERROR', 'Transaction', `Transaction ${tx._id}: user_id ${tx.user_id} does not exist.`);
        orphanTx++;
      }
      if (tx.amount_gross <= 0) {
        log('WARNING', 'Transaction', `Transaction ${tx._id}: amount_gross=${tx.amount_gross} is zero or negative.`);
      }
    }
    if (orphanTx === 0) log('INFO', 'Transaction', `All ${transactions.length} transactions reference valid contracts and users.`);

    // Paid transactions should match active contracts
    const paidTxContractIds = new Set(
      transactions.filter((t) => t.status === 'PAID').map((t) => t.consultation_contracts_id_fk)
    );
    const pendingActiveContracts = await ConsultationContract.countDocuments({
      _id: { $in: [...paidTxContractIds] },
      status: 'pending_payment',
    });
    if (pendingActiveContracts > 0) {
      log('ERROR', 'Transaction', `${pendingActiveContracts} contract(s) still "pending_payment" despite having a PAID transaction.`);
    } else {
      log('INFO', 'Transaction', 'All PAID transactions correspond to correctly-updated contracts.');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 6: NOTIFICATION & SYSTEM SETTINGS
  // ══════════════════════════════════════════════════════════════
  header('SECTION 6: NOTIFICATIONS & SYSTEM SETTINGS');

  const Notification      = models['Notification'];
  const NotificationSetting = models['NotificationSetting'];
  const SystemSetting     = models['SystemSetting'];

  if (Notification && User) {
    const userIdSet   = new Set((await User.find({}, '_id')).map((u) => u._id));
    const allNotifs   = await Notification.find({}, 'user_id');
    const orphanNotif = allNotifs.filter((n) => !userIdSet.has(n.user_id)).length;
    if (orphanNotif > 0) log('ERROR', 'Notification', `${orphanNotif} notification(s) reference non-existent users.`);
    else log('INFO', 'Notification', `All ${allNotifs.length} notifications reference valid users.`);
  }

  if (SystemSetting) {
    const settingCount = await SystemSetting.countDocuments();
    if (settingCount === 0) log('WARNING', 'SystemSetting', 'No SystemSettings found – defaults may not be configured.');
    else log('INFO', 'SystemSetting', `${settingCount} system setting(s) configured.`);
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 7: CONSULTATION MESSAGES
  // ══════════════════════════════════════════════════════════════
  header('SECTION 7: CONSULTATION MESSAGES');

  const ConsultationMessage = models['ConsultationMessage'];
  if (ConsultationMessage && ConsultationContract) {
    const contractIdSet = new Set((await ConsultationContract.find({}, '_id')).map((c) => c._id));
    const allMsgs       = await ConsultationMessage.find({}, 'contract_id');
    let orphanMsg = 0;
    for (const msg of allMsgs) {
      if (msg.contract_id && !contractIdSet.has(msg.contract_id)) {
        orphanMsg++;
      }
    }
    if (orphanMsg > 0) log('ERROR', 'ConsultationMessage', `${orphanMsg} message(s) reference non-existent contracts.`);
    else log('INFO', 'ConsultationMessage', `All ${allMsgs.length} consultation messages reference valid contracts.`);
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 8: CUSTOMER MEAL LOGS
  // ══════════════════════════════════════════════════════════════
  header('SECTION 8: CUSTOMER MEAL LOGS');

  const CustomerMealLog = models['CustomerMealLog'];
  if (CustomerMealLog && User) {
    const userIdSet  = new Set((await User.find({}, '_id')).map((u) => u._id));
    const allLogs    = await CustomerMealLog.find({}, 'user_id');
    const orphanLogs = allLogs.filter((l) => !userIdSet.has(l.user_id)).length;
    if (orphanLogs > 0) log('ERROR', 'CustomerMealLog', `${orphanLogs} log(s) reference non-existent users.`);
    else log('INFO', 'CustomerMealLog', `All ${allLogs.length} meal logs reference valid users.`);
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 9: INGREDIENT QUALITY
  // ══════════════════════════════════════════════════════════════
  header('SECTION 9: INGREDIENT DATA QUALITY');

  if (Ingredient) {
    const allIngs = await Ingredient.find({});
    let badIngredients = 0;
    for (const ing of allIngs) {
      if (ing.calories_per_unit < 0 || ing.calories_per_unit > 1000) {
        log('WARNING', 'Ingredient', `"${ing.name}": suspicious calories_per_unit=${ing.calories_per_unit}.`);
        badIngredients++;
      }
      if (!ing.name || ing.name.trim() === '') {
        log('ERROR', 'Ingredient', `Ingredient ${ing._id} has empty name.`);
        badIngredients++;
      }
    }
    if (badIngredients === 0) log('INFO', 'Ingredient', `All ${allIngs.length} ingredients pass quality checks.`);
  }

  // ══════════════════════════════════════════════════════════════
  // FINAL REPORT
  // ══════════════════════════════════════════════════════════════
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                   FINAL AUDIT REPORT                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  🔴 CRITICAL : ${criticalCount}`);
  console.log(`  🟠 ERROR    : ${errorCount}`);
  console.log(`  🟡 WARNING  : ${warningCount}`);
  console.log('');

  if (criticalCount > 0 || errorCount > 0) {
    console.log('  ⛔ RELEASE STATUS: NOT READY – Fix all CRITICAL and ERROR issues first.\n');
    if (issues.length > 0) {
      console.log('  Issues to fix:');
      for (const issue of issues) {
        const icon = issue.level === 'CRITICAL' ? '🔴' : '🟠';
        console.log(`    ${icon} [${issue.section}] ${issue.message}`);
      }
    }
  } else if (warningCount > 0) {
    console.log('  ✅ RELEASE STATUS: READY WITH CAUTIONS – Review warnings before going live.\n');
    console.log('  Warnings to review:');
    for (const issue of issues) {
      console.log(`    🟡 [${issue.section}] ${issue.message}`);
    }
  } else {
    console.log('  🚀 RELEASE STATUS: ALL CLEAR – Database is clean and ready for production.\n');
  }

  console.log('═'.repeat(62));
  console.log('');

  process.exit(criticalCount > 0 || errorCount > 0 ? 1 : 0);
}

auditFullDatabase().catch((err) => {
  console.error('Fatal error during audit:', err);
  process.exit(1);
});

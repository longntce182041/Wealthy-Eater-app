/**
 * migrate_medical_schema.js
 *
 * One-time migration script to:
 * 1. Add default `excluded_ingredient_tags` and `nutrient_constraints` to all
 *    existing MedicalCondition documents.
 * 2. Seed data for "Type 2 Diabetes" condition (and other conditions by name).
 * 3. Add default `health_tags: []` and `glycemic_index: null` to all Ingredients.
 *
 * Usage:
 *   node scripts/migrate_medical_schema.js
 *   node scripts/migrate_medical_schema.js --dry-run   (preview only, no writes)
 *
 * SAFETY: This script is idempotent — running multiple times is safe.
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

// ── Seed Data: Condition Name → Constraints Mapping ──────────────────────────
// Based on the medical reference table in the design specification.
const CONDITION_SEED_MAP = {
  'Type 2 Diabetes': {
    excluded_ingredient_tags: ['HIGH_SUGAR', 'HIGH_GI', 'REFINED_CARB'],
    nutrient_constraints: {
      max_sugar_g_per_day: 25,
      min_fiber_g_per_day: 25,
      carb_ratio_max: 0.45,
    },
    category: 'Metabolic',
    dietary_guideline:
      'Prefer low glycemic, high fiber meals. Restrict simple sugars. Avoid refined carbohydrates.',
  },
  'Hypertension': {
    excluded_ingredient_tags: ['HIGH_SODIUM'],
    nutrient_constraints: {
      max_sodium_mg_per_day: 1500,
    },
    category: 'Cardiovascular',
    dietary_guideline:
      'Restrict sodium intake. Prefer potassium-rich foods. Avoid processed and cured meats.',
  },
  'CKD Stage 3': {
    excluded_ingredient_tags: ['HIGH_POTASSIUM', 'HIGH_PHOSPHORUS'],
    nutrient_constraints: {},
    category: 'Renal',
    dietary_guideline:
      'Limit potassium and phosphorus. Moderate protein intake. Avoid dairy and high-phosphorus additives.',
  },
  'Gout': {
    excluded_ingredient_tags: ['HIGH_PURINE'],
    nutrient_constraints: {
      max_purine: true,
    },
    category: 'Metabolic',
    dietary_guideline:
      'Avoid high-purine foods (red meat, shellfish, organ meats). Increase hydration.',
  },
  'Celiac': {
    excluded_ingredient_tags: ['CONTAINS_GLUTEN'],
    nutrient_constraints: {},
    category: 'Gastrointestinal',
    dietary_guideline:
      'Strictly avoid all gluten-containing grains (wheat, barley, rye). Use certified gluten-free alternatives.',
  },
};

// ── Models ────────────────────────────────────────────────────────────────────

// Inline minimal schemas to avoid circular requires / env issues in script context.
const MedicalConditionSchema = new mongoose.Schema({
  _id:      { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  name:     { type: String, required: true },
  category: { type: String },
  description: { type: String },
  dietary_guideline: { type: String },
  excluded_ingredient_tags: { type: [String], default: [] },
  nutrient_constraints: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { strict: false });

const IngredientSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  health_tags: { type: [String], default: [] },
  glycemic_index: { type: Number, default: null },
}, { strict: false });

const MedicalCondition = mongoose.models.MedicalCondition ||
  mongoose.model('MedicalCondition', MedicalConditionSchema);

const Ingredient = mongoose.models.Ingredient ||
  mongoose.model('Ingredient', IngredientSchema);

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('[Migration] ERROR: MONGODB_URI environment variable not set.');
    process.exit(1);
  }

  console.log(`[Migration] Connecting to MongoDB...`);
  await mongoose.connect(mongoUri);
  console.log(`[Migration] Connected. DRY_RUN = ${DRY_RUN}`);

  // ── Step 1: Set defaults on all MedicalConditions (backward compat) ──────
  const allConditions = await MedicalCondition.find({}).lean();
  console.log(`[Migration] Found ${allConditions.length} MedicalCondition records.`);

  let conditionsUpdated = 0;
  for (const cond of allConditions) {
    const needsUpdate =
      cond.excluded_ingredient_tags === undefined ||
      cond.nutrient_constraints === undefined;

    if (needsUpdate) {
      if (!DRY_RUN) {
        await MedicalCondition.updateOne(
          { _id: cond._id },
          {
            $setOnInsert: {},
            $set: {
              excluded_ingredient_tags: cond.excluded_ingredient_tags ?? [],
              nutrient_constraints: cond.nutrient_constraints ?? {},
            },
          }
        );
      }
      conditionsUpdated++;
      console.log(`  [${DRY_RUN ? 'DRY' : 'SET'}] Default fields on: "${cond.name}" (${cond._id})`);
    }
  }
  console.log(`[Migration] ${conditionsUpdated} MedicalCondition(s) needed default fill.`);

  // ── Step 2: Seed specific condition data from CONDITION_SEED_MAP ─────────
  console.log(`[Migration] Seeding condition-specific data...`);
  for (const [condName, seedData] of Object.entries(CONDITION_SEED_MAP)) {
    const existing = await MedicalCondition.findOne({ name: condName }).lean();
    if (!existing) {
      console.log(`  [SKIP] "${condName}" not found in DB — skipping (seed on first insert).`);
      continue;
    }

    const { excluded_ingredient_tags, nutrient_constraints, dietary_guideline, category } = seedData;

    console.log(`  [${DRY_RUN ? 'DRY' : 'SEED'}] Updating "${condName}" with constraint data.`);
    if (!DRY_RUN) {
      await MedicalCondition.updateOne(
        { _id: existing._id },
        {
          $set: {
            excluded_ingredient_tags,
            nutrient_constraints,
            // Only override these if they're currently empty
            ...(existing.dietary_guideline ? {} : { dietary_guideline }),
            ...(existing.category ? {} : { category }),
          },
        }
      );
    }
  }

  // ── Step 3: Add health_tags / glycemic_index defaults to all Ingredients ──
  const ingredientResult = await Ingredient.countDocuments({});
  console.log(`[Migration] Found ${ingredientResult} Ingredient records.`);

  if (!DRY_RUN) {
    // Use updateMany with $setOnInsert isn't right here — use $set with $exists check
    const ingredientUpdateResult = await Ingredient.updateMany(
      { health_tags: { $exists: false } },
      { $set: { health_tags: [], glycemic_index: null } }
    );
    console.log(`[Migration] Added health_tags/glycemic_index defaults to ${ingredientUpdateResult.modifiedCount} Ingredient(s).`);
  } else {
    const needsDefaultCount = await Ingredient.countDocuments({ health_tags: { $exists: false } });
    console.log(`[DRY] Would update ${needsDefaultCount} Ingredient(s) with health_tags/glycemic_index defaults.`);
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log(`[Migration] ✅ Complete${DRY_RUN ? ' (DRY RUN — no writes made)' : ''}.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[Migration] FATAL ERROR:', err);
  process.exit(1);
});

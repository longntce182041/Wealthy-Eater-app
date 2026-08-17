const ExcelJS = require('exceljs');
const path = require('path');

const REQUIREMENTS_MAP = {
  'Auth Management': 'The system must support secure user registration, email verification, JWT token authentication, refresh token rotation, password reset, and role-based access control (Customer, Nutritionist, Admin).',
  'Diet Tracking': 'The system must allow users to log daily food intake, track caloric consumption against TDEE targets, calculate macronutrient ratios (Carbs/Protein/Fat), and monitor water intake.',
  'AI Pantry': 'The system must support AI-powered ingredient recognition, inventory tracking, expiration alerts, and automated recipe suggestions based on available pantry items.',
  'Recipe Shopping': 'The system must allow users to browse healthy recipes, add required ingredients to a smart shopping list, calculate total cost, and place ingredient order requests.',
  'Nutritionist Services': 'The system must enable customers to search accredited nutritionists, view expert profiles, book consultation slots, submit health intake forms, and rate service quality.',
  'Payment Subscription': 'The system must support membership subscription plans, PayOS payment gateway integration, automatic QR code payment verification, webhook HMAC signature validation, and invoice generation.',
  'Expert Workspace': 'The platform must provide Nutritionists with a workspace to view assigned clients, track client dietary compliance, attach consultation notes, and build custom meal plans.',
  'AI Assistant': 'The system must provide an AI assistant powered by Gemini API to answer nutrition queries, calculate recipe macros, enforce allergen guardrails, and provide personalized dietary guidance.',
  'Ingredients Management': 'The system must allow Administrators to manage the global ingredient database, set caloric densities, configure allergen tags, and manage measurement units.',
  'Micronutrients Management': 'The system must support tracking essential micronutrients (Vitamins A-K, Calcium, Iron, Zinc), set Recommended Daily Allowances (RDA), and display upper intake limit warnings.',
  'Recipes Management': 'The system must allow Administrators and Nutritionists to create, edit, categorize, and publish healthy recipes with full macro/micro breakdown and cooking instructions.',
  'Admin Analytics': 'The platform must provide Administrators with real-time analytics dashboards for system revenue, active subscriptions, daily active users (DAU), and top popular recipes.',
  'Manage Users': 'The platform must allow Administrators to manage user accounts, assign roles (Customer, Nutritionist, Admin), suspend inactive accounts, and view user activity logs.',
  'Nutritionist Management': 'The platform must allow Administrators to review and verify nutritionist credentials, manage expert verification status, set commission payout rates, and monitor expert ratings.'
};

const BRD_BLACK = { style: 'thin', color: { argb: 'FF000000' } };
const BRD_MED   = { style: 'medium', color: { argb: 'FF000000' } };

async function run() {
  const file = path.join(__dirname, 'SEP490_13_SEP490_Report5_TestReport-2.xlsx');
  const w = new ExcelJS.Workbook();
  await w.xlsx.readFile(file);

  w.worksheets.forEach((ws) => {
    if (ws.name === 'Cover' || ws.name === 'Test case List' || ws.name === 'Test Report') return;
    if (REQUIREMENTS_MAP[ws.name]) {
      const reqVal = REQUIREMENTS_MAP[ws.name];
      ws.getCell('B3').value = reqVal;
      ws.getCell('B3').font = { name: 'Tahoma', size: 10, color: { argb: 'FF000000' } };
      ws.getCell('B3').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }
  });

  const listWS = w.getWorksheet('Test case List');
  if (listWS) {
    for (let r = 3; r <= 22; r++) {
      const row = listWS.getRow(r);
      const sn = String(row.getCell(4).value || '').trim();
      if (sn && REQUIREMENTS_MAP[sn]) {
        row.getCell(5).value = REQUIREMENTS_MAP[sn];
      }
    }
  }

  await w.xlsx.writeFile(file);
  console.log('✅ UPDATED REQUIREMENTS FOR ALL 22 SHEETS PERFECTLY');
}

run();

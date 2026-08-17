const ExcelJS = require('exceljs');
const path    = require('path');

const FILE = path.join(__dirname, 'SEP490_13_SEP490_Report5_TestReport-2.xlsx');

const CHANGES = [
  // v1.0 (29-Jul-26) - 14 Original Modules
  { date: '29-Jul-26', ver: 'v1.0', item: 'Auth Management', adm: 'M', desc: '- Update Test cases for Authentication (User & Admin).' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'Diet Tracking', adm: 'M', desc: '- Add Test cases for Diet tracking, TDEE/BMI Calculation and Logs.' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'AI Pantry', adm: 'M', desc: '- Add Test cases for AI Ingredient Scanner and Pantry tracking.' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'Recipe Shopping', adm: 'M', desc: '- Add Test cases for Recipe generation & Shopping Lists.' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'Nutritionist Services', adm: 'M', desc: '- Add Test cases for Nutritionist profile, contracts and booking.' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'Payment Subscription', adm: 'M', desc: '- Add Test cases for Subscription packages & PayOS Integration.' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'Expert Workspace', adm: 'M', desc: '- Add Test cases for Nutritionist Meal Plan Management & Client Diet Auditing.' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'AI Assistant', adm: 'M', desc: '- Add Test cases for NutriBot AI Chatbot & Context Injection.' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'Ingredients Management', adm: 'A', desc: '- Add Test cases for Ingredients CRUD.' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'Micronutrients Management', adm: 'A', desc: '- Add Test cases for Micronutrients configuration.' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'Recipes Management', adm: 'A', desc: '- Add Test cases for Recipes administration.' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'Admin Analytics', adm: 'A', desc: '- Add Test cases for System Analytics and Dashboard.' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'Manage Users', adm: 'A', desc: '- Add Test cases for User Management (Ban/Unban, Roles).' },
  { date: '29-Jul-26', ver: 'v1.0', item: 'Nutritionist Management', adm: 'A', desc: '- Add Test cases for Admin reviewing and verifying Nutritionists.' },

  // v2.0 (12-Aug-26) - 8 New Modules Added
  { date: '12-Aug-26', ver: 'v2.0', item: 'Chat & Messaging', adm: 'A', desc: '- Add Test cases for Real-time Socket.IO chat, history, and AI Chatbot.' },
  { date: '12-Aug-26', ver: 'v2.0', item: 'Notification System', adm: 'A', desc: '- Add Test cases for In-App Push notifications and appointment reminders.' },
  { date: '12-Aug-26', ver: 'v2.0', item: 'Security & Performance', adm: 'A', desc: '- Add Test cases for Rate limiting, HMAC validation, and load benchmarks.' },
  { date: '12-Aug-26', ver: 'v2.0', item: 'Progress & Health Reports', adm: 'A', desc: '- Add Test cases for Body measurement logging and progress charts.' },
  { date: '12-Aug-26', ver: 'v2.0', item: 'Search & Discovery', adm: 'A', desc: '- Add Test cases for Global multi-entity search and smart recommendations.' },
  { date: '12-Aug-26', ver: 'v2.0', item: 'Admin Configuration', adm: 'A', desc: '- Add Test cases for System parameters, pricing, and audit logs.' },
  { date: '12-Aug-26', ver: 'v2.0', item: 'Meal Prep & Planning', adm: 'A', desc: '- Add Test cases for 7-day meal planning and shopping list generation.' },
  { date: '12-Aug-26', ver: 'v2.0', item: 'Social & Community', adm: 'A', desc: '- Add Test cases for Community feed, recipe sharing, and ratings.' }
];

const BRD_BLACK = { style: 'thin', color: { argb: 'FF000000' } };
const FONT_TAHOMA = { name: 'Tahoma', size: 10, color: { argb: 'FF000000' } };

async function run() {
  console.log('📖 Reading Excel file for Record of change update...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);

  const ws = wb.getWorksheet('Cover');
  if (!ws) {
    console.error('❌ Worksheet "Cover" not found!');
    return;
  }

  let startRow = 12;
  CHANGES.forEach((c, idx) => {
    const r = startRow + idx;
    const row = ws.getRow(r);

    row.getCell(2).value = c.date; // Effective Date
    row.getCell(3).value = c.ver;  // Version
    row.getCell(4).value = c.item; // Change Item
    row.getCell(5).value = c.adm;  // *A,D,M
    row.getCell(6).value = c.desc; // Change description
    row.getCell(7).value = '';     // Reference

    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'left',   vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'left',   vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'left',   vertical: 'middle' };

    for (let col = 2; col <= 7; col++) {
      const cell = row.getCell(col);
      cell.font = FONT_TAHOMA;
      cell.border = { top: BRD_BLACK, bottom: BRD_BLACK, left: BRD_BLACK, right: BRD_BLACK };
    }
    row.height = 20;
  });

  console.log(`💾 Writing updated Record of Change table (Rows 12 to ${startRow + CHANGES.length - 1})...`);
  await wb.xlsx.writeFile(FILE);

  console.log('═════════════════════════════════════════════════');
  console.log('✅ RECORD OF CHANGE TABLE UPDATED WITH V2.0 PERFECTLY');
  console.log('═════════════════════════════════════════════════');
}

run();

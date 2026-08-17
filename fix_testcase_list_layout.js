const ExcelJS = require('exceljs');
const path    = require('path');

const FILE = path.join(__dirname, 'SEP490_13_SEP490_Report5_TestReport-2.xlsx');

const FONT_NORMAL = { name: 'Tahoma', size: 10, color: { argb: 'FF000000' } };
const FONT_LINK   = { name: 'Tahoma', size: 10, underline: true, color: { argb: 'FF0000FF' } };
const BRD_BLACK   = { style: 'thin', color: { argb: 'FF000000' } };

async function run() {
  console.log('📖 Reading Excel file for Test case List layout fix...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);

  const ws = wb.getWorksheet('Test case List');
  if (!ws) {
    console.error('❌ Worksheet "Test case List" not found!');
    return;
  }

  // Set generous column widths
  ws.getColumn(1).width = 5;  // Margin
  ws.getColumn(2).width = 10; // No
  ws.getColumn(3).width = 32; // Feature Name
  ws.getColumn(4).width = 25; // Sheet Name
  ws.getColumn(5).width = 65; // Test Requirement (Wide column for long requirement text!)
  ws.getColumn(6).width = 45; // Precondition

  // Process rows 9 to 30 for all 22 modules
  for (let r = 9; r <= 30; r++) {
    const row = ws.getRow(r);
    const modNum = row.getCell(2).value;

    // Col 2: Module Number
    row.getCell(2).font = FONT_NORMAL;
    row.getCell(2).alignment = { vertical: 'top', horizontal: 'center' };

    // Col 3: Feature Name
    row.getCell(3).font = FONT_NORMAL;
    row.getCell(3).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

    // Col 4: Sheet Name (Hyperlink)
    const c4Val = row.getCell(4).value;
    let sheetName = (c4Val && typeof c4Val === 'object') ? (c4Val.text || c4Val.result || String(c4Val)) : String(c4Val || '').trim();
    if (sheetName && wb.getWorksheet(sheetName)) {
      const targetRef = `#'${sheetName.replace(/'/g, "''")}'!A1`;
      row.getCell(4).value = { text: sheetName, hyperlink: targetRef };
      row.getCell(4).font  = FONT_LINK;
    } else {
      row.getCell(4).font = FONT_NORMAL;
    }
    row.getCell(4).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

    // Col 5: Test Requirement (Hyperlink)
    const c5Val = row.getCell(5).value;
    let reqText = (c5Val && typeof c5Val === 'object') ? (c5Val.text || c5Val.result || String(c5Val)) : String(c5Val || '').trim();
    if (reqText && sheetName && wb.getWorksheet(sheetName)) {
      const targetRef = `#'${sheetName.replace(/'/g, "''")}'!A1`;
      row.getCell(5).value = { text: reqText, hyperlink: targetRef };
      row.getCell(5).font  = FONT_LINK;
    } else {
      row.getCell(5).font = FONT_NORMAL;
    }
    row.getCell(5).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

    // Col 6: Precondition (Plain Text - NO HYPERLINK, NO BLUE COLOR)
    const c6Val = row.getCell(6).value;
    let preText = (c6Val && typeof c6Val === 'object') ? (c6Val.text || c6Val.result || String(c6Val)) : String(c6Val || '').trim();
    row.getCell(6).value = preText;
    row.getCell(6).font  = FONT_NORMAL;
    row.getCell(6).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

    // Apply thin black borders to columns 2..6
    for (let c = 2; c <= 6; c++) {
      row.getCell(c).border = { top: BRD_BLACK, bottom: BRD_BLACK, left: BRD_BLACK, right: BRD_BLACK };
    }

    // Calculate dynamic row height with ample vertical space (35-55pt)
    const reqLines = Math.ceil(reqText.length / 60) || 1;
    const preLines = Math.ceil(preText.length / 40) || 1;
    const maxL = Math.max(reqLines, preLines, 2);
    
    row.height = Math.max(45, maxL * 16 + 10);
  }

  console.log('💾 Writing updated Test case List layout fix...');
  await wb.xlsx.writeFile(FILE);

  console.log('═════════════════════════════════════════════════');
  console.log('✅ TEST CASE LIST LAYOUT FIXED & PERFECTLY FORMATTED');
  console.log('═════════════════════════════════════════════════');
}

run();

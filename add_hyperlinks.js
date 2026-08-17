const ExcelJS = require('exceljs');
const path    = require('path');

const FILE = path.join(__dirname, 'SEP490_13_SEP490_Report5_TestReport-2.xlsx');

const FONT_LINK = { name: 'Tahoma', size: 10, underline: true, color: { argb: 'FF0000FF' } };

async function run() {
  console.log('📖 Reading Excel file for Test case List hyperlink update...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);

  const ws = wb.getWorksheet('Test case List');
  if (!ws) {
    console.error('❌ Worksheet "Test case List" not found!');
    return;
  }

  // Iterate rows 9 to 30 for all 22 modules
  for (let r = 9; r <= 30; r++) {
    const row = ws.getRow(r);
    const modNum = row.getCell(2).value;
    const sheetNameCell = row.getCell(4).value;

    let sheetName = '';
    if (sheetNameCell && typeof sheetNameCell === 'object') {
      sheetName = sheetNameCell.text || sheetNameCell.result || String(sheetNameCell);
    } else {
      sheetName = String(sheetNameCell || '').trim();
    }

    if (sheetName && wb.getWorksheet(sheetName)) {
      const targetRef = `#'${sheetName.replace(/'/g, "''")}'!A1`;

      // Col 4: Sheet Name Hyperlink
      row.getCell(4).value = { text: sheetName, hyperlink: targetRef };
      row.getCell(4).font  = FONT_LINK;
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      // Col 5: Test Requirement Hyperlink
      const reqVal = String(row.getCell(5).value?.text || row.getCell(5).value || '').trim();
      if (reqVal) {
        row.getCell(5).value = { text: reqVal, hyperlink: targetRef };
        row.getCell(5).font  = FONT_LINK;
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    }
  }

  console.log('💾 Writing updated Test case List sheet with hyperlinks...');
  await wb.xlsx.writeFile(FILE);

  console.log('═════════════════════════════════════════════════');
  console.log('✅ SHEET HYPERLINKS UPDATED FOR ALL 22 MODULES PERFECTLY');
  console.log('═════════════════════════════════════════════════');
}

run();

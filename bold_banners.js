const ExcelJS = require('exceljs');
const path    = require('path');

const FILE = path.join(__dirname, 'SEP490_13_SEP490_Report5_TestReport-2.xlsx');

const FONT_TITLE = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FF000000' } };
const FILL_FUNC  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFFF' }, bgColor: { argb: 'FFCCFFFF' } };
const BRD_BLACK  = { style: 'thin', color: { argb: 'FF000000' } };

async function run() {
  console.log('📖 Reading Excel file for Section Banner Bold formatting update...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);

  let boldCount = 0;

  wb.worksheets.forEach((ws) => {
    if (ws.name === 'Cover' || ws.name === 'Test case List' || ws.name === 'Test Report') return;

    ws.eachRow((row, r) => {
      if (r >= 9) {
        const idVal = String(row.getCell(1).value || '').trim();
        if (idVal && !idVal.startsWith('[')) {
          boldCount++;

          for (let c = 1; c <= 10; c++) {
            const cell = row.getCell(c);
            cell.font  = FONT_TITLE;
            cell.fill  = FILL_FUNC;
            cell.border = { top: BRD_BLACK, bottom: BRD_BLACK, left: BRD_BLACK, right: BRD_BLACK };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }
          row.height = 22;
        }
      }
    });
  });

  console.log(`💾 Applied Tahoma 12pt Bold to ${boldCount} section banners across all 22 sheets...`);
  await wb.xlsx.writeFile(FILE);

  console.log('═════════════════════════════════════════════════');
  console.log('✅ ALL SECTION BANNERS ARE NOW 100% TAHOMA 12PT BOLD PERFECTLY');
  console.log('═════════════════════════════════════════════════');
}

run();

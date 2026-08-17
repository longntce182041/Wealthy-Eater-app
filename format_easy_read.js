const ExcelJS = require('exceljs');
const path    = require('path');

const FILE = path.join(__dirname, 'SEP490_13_SEP490_Report5_TestReport-2.xlsx');

const BRD_BLACK = { style: 'thin', color: { argb: 'FF000000' } };
const FONT_TAHOMA = { name: 'Tahoma', size: 10, color: { argb: 'FF000000' } };

function formatMultiLineBullets(text) {
  if (!text) return '';
  let str = String(text).trim();
  // Ensure bullets - are preceded by newline if dính nhau
  str = str.replace(/([^\n])\s*-\s+/g, '$1\n- ');
  // Ensure numbers 1. 2. 3. are preceded by newline if dính nhau
  str = str.replace(/([^\n])\s+(\d+[\.\)])\s+/g, '$1\n$2 ');
  return str;
}

async function run() {
  console.log('📖 Reading Excel file for readability formatting pass...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);

  let formattedTCCount = 0;

  wb.worksheets.forEach((ws) => {
    if (ws.name === 'Cover' || ws.name === 'Test case List' || ws.name === 'Test Report') return;

    // Set generous column widths
    ws.getColumn(1).width = 25; // ID
    ws.getColumn(2).width = 32; // Description
    ws.getColumn(3).width = 38; // Procedure
    ws.getColumn(4).width = 38; // Expected
    ws.getColumn(5).width = 38; // Actual
    ws.getColumn(6).width = 25; // Dependence
    ws.getColumn(7).width = 12; // Result
    ws.getColumn(8).width = 15; // Date
    ws.getColumn(9).width = 20; // Tester
    ws.getColumn(10).width = 15; // Note

    ws.eachRow((row, r) => {
      if (r >= 9) {
        const idVal = String(row.getCell(1).value || '').trim();
        if (idVal.startsWith('[')) {
          formattedTCCount++;

          // Clean & format multi-line text for procedure, expected, actual
          const procText = formatMultiLineBullets(row.getCell(3).value);
          const expText  = formatMultiLineBullets(row.getCell(4).value);
          const actText  = formatMultiLineBullets(row.getCell(5).value);

          row.getCell(3).value = procText;
          row.getCell(4).value = expText;
          row.getCell(5).value = actText;

          // Format all 10 cells with wrapText, top alignment, and borders
          for (let c = 1; c <= 10; c++) {
            const cell = row.getCell(c);
            if (cell.value === undefined || cell.value === null) cell.value = '';
            
            cell.border = { top: BRD_BLACK, bottom: BRD_BLACK, left: BRD_BLACK, right: BRD_BLACK };
            cell.alignment = {
              vertical: 'top',
              horizontal: (c === 7 || c === 8) ? 'center' : 'left',
              wrapText: true
            };
            if (c !== 7 && c !== 8 && c !== 9) {
              cell.font = FONT_TAHOMA;
            }
          }

          // Calculate generous dynamic row height so no text is cut off
          const procLines = procText.split('\n').length;
          const expLines  = expText.split('\n').length;
          const actLines  = actText.split('\n').length;
          const maxLines  = Math.max(procLines, expLines, actLines, 3);
          
          row.height = Math.max(65, maxLines * 20 + 15);
        }
      }
    });
  });

  console.log(`💾 Applied readability formatting to ${formattedTCCount} test cases across 22 sheets...`);
  await wb.xlsx.writeFile(FILE);

  console.log('═════════════════════════════════════════════════');
  console.log('✅ ALL TEST CASES REFORMATTED FOR OPTIMAL READABILITY PERFECTLY');
  console.log('═════════════════════════════════════════════════');
}

run();

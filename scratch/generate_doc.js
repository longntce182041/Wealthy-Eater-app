const fs = require('fs');
const path = require('path');
const { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  BorderStyle, 
  WidthType, 
  AlignmentType,
  ShadingType
} = require('docx');

async function generateWordDoc() {
  const primaryColor = "1E3A8A";   // Deep Blue
  const secondaryColor = "0D9488"; // Teal
  const darkTextColor = "1F2937";  // Dark Gray
  const lightBgColor = "F3F4F6";   // Light Gray Box
  const accentColor = "D97706";    // Amber/Gold

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 24, // 12pt
            color: darkTextColor,
          },
          paragraph: {
            spacing: { line: 360, before: 120, after: 120 }, // 1.5 line spacing
          },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          // Title Banner
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 360 },
            children: [
              new TextRun({
                text: "WEALTHY EATER",
                bold: true,
                size: 36, // 18pt
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 480 },
            children: [
              new TextRun({
                text: "HƯỚNG DẪN CHI TIẾT CÁC CHỈ SỐ TÍNH TOÁN HỒ SƠ NGƯỜI DÙNG",
                bold: true,
                size: 28, // 14pt
                color: secondaryColor,
              }),
            ],
          }),

          // Introduction Callout Box
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "EFF6FF", type: ShadingType.CLEAR },
                    borders: {
                      left: { style: BorderStyle.SINGLE, size: 24, color: primaryColor },
                      top: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                    },
                    margins: { top: 180, bottom: 180, left: 240, right: 240 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "💡 Tổng quan: ",
                            bold: true,
                            color: primaryColor,
                          }),
                          new TextRun({
                            text: "Tất cả các chỉ số sinh trắc học trong Wealthy Eater được tính toán chính xác dựa trên các công thức y khoa quốc tế (Mifflin-St Jeor, Khuyến nghị từ WHO) nhằm cung cấp chế độ dinh dưỡng và kế hoạch bữa ăn cá nhân hóa an toàn, khoa học.",
                            italic: true,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 240 } }),

          // Section 1: BMI
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 180 },
            children: [
              new TextRun({ text: "1. BMI (Body Mass Index) - Chỉ số Khối Cơ thể", bold: true, color: primaryColor, size: 28 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Khái niệm: ", bold: true }),
              new TextRun({ text: "Đánh giá mức độ cân đối của cơ thể (Gầy, Bình thường, Thừa cân, Béo phì) dựa trên chiều cao và cân nặng hiện tại." }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Công thức tính:", bold: true }),
            ],
          }),
          // Formula Table for BMI
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: lightBgColor, type: ShadingType.CLEAR },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    margins: { top: 120, bottom: 120, left: 200, right: 200 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "BMI = Cân nặng (kg) / [Chiều cao (m)]²", bold: true, color: primaryColor }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Ví dụ thực tế: ", bold: true }),
              new TextRun({ text: "Người nặng 70 kg, cao 170 cm (1.7 m) ➔ BMI = 70 / (1.7 × 1.7) = " }),
              new TextRun({ text: "24.22", bold: true, color: secondaryColor }),
              new TextRun({ text: " (Trạng thái Bình thường)." }),
            ],
          }),

          // Section 2: BMR
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 180 },
            children: [
              new TextRun({ text: "2. BMR (Basal Metabolic Rate) - Tỷ lệ Trao đổi chất Cơ bản", bold: true, color: primaryColor, size: 28 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Khái niệm: ", bold: true }),
              new TextRun({ text: "Năng lượng tối thiểu (Calo) mà cơ thể bắt buộc phải tiêu tốn để duy trì sự sống (hít thở, tuần hoàn máu, hoạt động não bộ...) ở trạng thái nghỉ ngơi hoàn toàn suốt 24 giờ." }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Công thức Mifflin-St Jeor (Chuẩn Y khoa):", bold: true }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: lightBgColor, type: ShadingType.CLEAR },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    margins: { top: 120, bottom: 120, left: 200, right: 200 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Nam giới: ", bold: true, color: primaryColor }),
                          new TextRun({ text: "BMR = 10 × Cân nặng (kg) + 6.25 × Chiều cao (cm) - 5 × Tuổi + 5" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Nữ giới: ", bold: true, color: primaryColor }),
                          new TextRun({ text: "BMR = 10 × Cân nặng (kg) + 6.25 × Chiều cao (cm) - 5 × Tuổi - 161" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Section 3: TDEE
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 180 },
            children: [
              new TextRun({ text: "3. TDEE (Total Daily Energy Expenditure) - Năng lượng Tiêu hao Hàng ngày", bold: true, color: primaryColor, size: 28 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Khái niệm: ", bold: true }),
              new TextRun({ text: "Tổng năng lượng Calo thực tế cơ thể tiêu thụ trong 1 ngày, bao gồm BMR kết hợp với mức độ vận động và thể thao." }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Công thức tính: ", bold: true }),
              new TextRun({ text: "TDEE = BMR × Hệ số Vận động (Activity Multiplier)", bold: true, color: primaryColor }),
            ],
          }),
          new Paragraph({ text: "• Bảng Hệ số Vận động chi tiết:", bold: true, spacing: { after: 120 } }),

          // Activity Multipliers Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ shading: { fill: primaryColor, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Mức độ vận động", bold: true, color: "FFFFFF" })] })] }),
                  new TableCell({ shading: { fill: primaryColor, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Hệ số", bold: true, color: "FFFFFF" })] })] }),
                  new TableCell({ shading: { fill: primaryColor, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Mô tả lối sống / Tập luyện", bold: true, color: "FFFFFF" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ít vận động (Sedentary)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1.2", bold: true, color: secondaryColor })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Làm việc văn phòng, ít hoặc không tập thể dục" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Vận động nhẹ (Light)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1.375", bold: true, color: secondaryColor })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tập thể dục nhẹ nhàng 1 - 3 buổi / tuần" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Vận động vừa (Moderate)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1.55", bold: true, color: secondaryColor })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tập thể thao cường độ vừa 3 - 5 buổi / tuần" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Vận động nhiều (Active)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1.725", bold: true, color: secondaryColor })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Vận động cường độ cao 6 - 7 buổi / tuần" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Rất năng động (Very Active)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1.9", bold: true, color: secondaryColor })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Lao động chân tay nặng / Tập luyện 2 lần/ngày" })] })] }),
                ],
              }),
            ],
          }),

          // Section 4: Target Calories
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 180 },
            children: [
              new TextRun({ text: "4. Target Calories (Mục tiêu Calo nạp vào hàng ngày)", bold: true, color: primaryColor, size: 28 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Khái niệm: ", bold: true }),
              new TextRun({ text: "Lượng Calo khuyến nghị nạp vào từ bữa ăn mỗi ngày, được tùy chỉnh dựa trên " }),
              new TextRun({ text: "Mục tiêu Sức khỏe (Health Goal)", bold: true }),
              new TextRun({ text: " để đảm bảo tăng/giảm cân hiệu quả và an toàn." }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Công thức tính: ", bold: true }),
              new TextRun({ text: "Target Calories = TDEE × Hệ số Mục tiêu (Goal Multiplier)", bold: true, color: primaryColor }),
            ],
          }),
          new Paragraph({ text: "• Bảng Hệ số Mục tiêu Sức khỏe:", bold: true, spacing: { after: 120 } }),

          // Health Goal Multiplier Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ shading: { fill: secondaryColor, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Mục tiêu Sức khỏe", bold: true, color: "FFFFFF" })] })] }),
                  new TableCell({ shading: { fill: secondaryColor, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Hệ số Calo", bold: true, color: "FFFFFF" })] })] }),
                  new TableCell({ shading: { fill: secondaryColor, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ý nghĩa tác động Calo", bold: true, color: "FFFFFF" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Giảm cân (LOSE_WEIGHT)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "0.85", bold: true, color: primaryColor })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Giảm 15% Calo nạp vào so với TDEE" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Giảm mỡ (FAT_LOSS)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "0.90", bold: true, color: primaryColor })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Giảm 10% Calo nạp vào so với TDEE" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Duy trì cân nặng (MAINTAIN)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1.00", bold: true, color: primaryColor })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Giữ nguyên lượng Calo bằng TDEE" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tăng cơ (MUSCLE_GAIN)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1.08", bold: true, color: primaryColor })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Thặng dư 8% Calo nạp vào so với TDEE" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tăng cân (GAIN_WEIGHT)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1.10", bold: true, color: primaryColor })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Thặng dư 10% Calo nạp vào so với TDEE" })] })] }),
                ],
              }),
            ],
          }),

          // Section 5: Macro Targets
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 180 },
            children: [
              new TextRun({ text: "5. Macro Targets (Chất dinh dưỡng Đa lượng)", bold: true, color: primaryColor, size: 28 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Hệ thống tự động cân đối tỷ lệ 3 nhóm dinh dưỡng quan trọng (Đạm - Béo - Tinh bột) dựa theo cân nặng:" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "1. Protein (Chất đạm): ", bold: true, color: primaryColor }),
              new TextRun({ text: "Mục tiêu tăng/giảm cân/tăng cơ ➔ " }),
              new TextRun({ text: "2.0g × Cân nặng (kg)", bold: true }),
              new TextRun({ text: ". Nếu duy trì ➔ " }),
              new TextRun({ text: "1.6g × Cân nặng (kg)", bold: true }),
              new TextRun({ text: ". (1g Protein = 4 kcal)." }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "2. Fat (Chất béo tốt): ", bold: true, color: primaryColor }),
              new TextRun({ text: "Tính cố định theo mức an toàn ➔ " }),
              new TextRun({ text: "0.8g × Cân nặng (kg)", bold: true }),
              new TextRun({ text: ". (1g Fat = 9 kcal)." }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "3. Carbs (Tinh bột): ", bold: true, color: primaryColor }),
              new TextRun({ text: "Năng lượng Calo còn lại sau khi đã trừ đi lượng Calo từ Protein và Fat:" }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: lightBgColor, type: ShadingType.CLEAR },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    margins: { top: 120, bottom: 120, left: 200, right: 200 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "Carbs (g) = [Target Calories - (Protein × 4) - (Fat × 9)] / 4", bold: true, color: secondaryColor }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Section 6: Adaptive Redistribution
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 180 },
            children: [
              new TextRun({ text: "6. Thuật toán Tự động Điều chỉnh Calo (Calorie Adaptive Redistribution)", bold: true, color: primaryColor, size: 28 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Trong quá trình sử dụng ứng dụng, khi người dùng ăn thừa hoặc thiếu Calo trong một bữa ăn:" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Chênh lệch < 15% TDEE: ", bold: true, color: secondaryColor }),
              new TextRun({ text: "Hệ thống tự động phân bổ lại số Calo lệch cho các bữa ăn còn lại trong ngày theo tỷ lệ chuẩn WHO (Protein 15-35%, Carbs 45-65%, Fat 20-35%)." }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Chênh lệch ≥ 15% TDEE (Cảnh báo vượt mức): ", bold: true, color: "DC2626" }),
              new TextRun({ text: "Hệ thống sẽ ghi nhận cảnh báo nguy cơ và tự động gửi thông báo cho Chuyên gia Dinh dưỡng (Nutritionist) kiểm tra." }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Ăn muộn sau 21h: ", bold: true, color: accentColor }),
              new TextRun({ text: "Số Calo lệch sẽ tự động được chuyển sang điều chỉnh vào bữa sáng của ngày hôm sau." }),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 360 } }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "Wealthy Eater HealthTech Platform • 2026", italic: true, size: 20, color: "9CA3AF" }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, 'Huong_Dan_Chi_So_Profile_Wealthy_Eater.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log('SUCCESS: Word document created at:', outputPath);
}

generateWordDoc().catch(err => {
  console.error('ERROR generating doc:', err);
  process.exit(1);
});

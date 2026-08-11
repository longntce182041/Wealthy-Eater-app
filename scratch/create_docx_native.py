import zipfile
import os

def create_docx(filename):
    content_types_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''

    rels_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

    document_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    
    <!-- Title Banner -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="120"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:sz w:val="36"/>
          <w:color w:val="1E3A8A"/>
        </w:rPr>
        <w:t>WEALTHY EATER HEALTH-TECH</w:t>
      </w:r>
    </w:p>

    <!-- Subtitle -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="0" w:after="360"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:sz w:val="28"/>
          <w:color w:val="0D9488"/>
        </w:rPr>
        <w:t>HƯỚNG DẪN CHI TIẾT CÁC CHỈ SỐ TÍNH TOÁN &amp; DANH MỤC TRÍCH DẪN NGUỒN KHOA HỌC</w:t>
      </w:r>
    </w:p>

    <!-- Callout Box -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="single" w:sz="24" w:space="0" w:color="1E3A8A"/>
          <w:bottom w:val="none"/>
          <w:right w:val="none"/>
        </w:tblBorders>
        <w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcMar>
              <w:top w:w="180" w:type="dxa"/>
              <w:bottom w:w="180" w:type="dxa"/>
              <w:left w:w="240" w:type="dxa"/>
              <w:right w:w="240" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/></w:rPr>
              <w:t>💡 Tổng quan: </w:t>
            </w:r>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:i/></w:rPr>
              <w:t>Tất cả các chỉ số sinh trắc học trong ứng dụng Wealthy Eater được tính toán chính xác dựa trên các công thức y khoa quốc tế (Mifflin-St Jeor Formula, khuyến nghị WHO, FAO, ISSN) nhằm đảm bảo tính khoa học và an toàn tuyệt đối cho người dùng.</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>

    <!-- SECTION 1 -->
    <w:p>
      <w:pPr><w:spacing w:before="360" w:after="120"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="28"/><w:color w:val="1E3A8A"/></w:rPr>
        <w:t>1. BMI (Body Mass Index) - Chỉ số Khối Cơ thể</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>• Khái niệm: </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>Đánh giá tổng quan mức độ cân đối của cơ thể dựa trên chiều cao và cân nặng hiện tại.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>• Công thức tính toán chuẩn:</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tblBorders>
        <w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="200" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/><w:sz w:val="24"/></w:rPr>
              <w:t>BMI = Cân nặng (kg) / [Chiều cao (m)]²</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- SECTION 2 -->
    <w:p>
      <w:pPr><w:spacing w:before="360" w:after="120"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="28"/><w:color w:val="1E3A8A"/></w:rPr>
        <w:t>2. BMR (Basal Metabolic Rate) - Tỷ lệ Trao đổi chất Cơ bản</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>• Khái niệm: </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>Lượng năng lượng (Calo) tối thiểu cần thiết để cơ thể duy trì các chức năng sinh tồn cơ bản trong 24 giờ nghỉ ngơi.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>• Phương trình Mifflin-St Jeor (1990):</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tblBorders>
        <w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="200" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/></w:rPr><w:t>Nam giới: </w:t></w:r>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>BMR = 10 × Cân nặng (kg) + 6.25 × Chiều cao (cm) - 5 × Tuổi + 5</w:t></w:r>
          </w:p>
          <w:p>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/></w:rPr><w:t>Nữ giới: </w:t></w:r>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>BMR = 10 × Cân nặng (kg) + 6.25 × Chiều cao (cm) - 5 × Tuổi - 161</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- SECTION 3 -->
    <w:p>
      <w:pPr><w:spacing w:before="360" w:after="120"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="28"/><w:color w:val="1E3A8A"/></w:rPr>
        <w:t>3. TDEE &amp; Hệ số Vận động (PAL - Physical Activity Level)</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>• Công thức: </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/></w:rPr><w:t>TDEE = BMR × Hệ số Vận động (Activity Multiplier)</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>• Các hệ số vận động chuẩn FAO/WHO: </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>1.2 (Sedentary), 1.375 (Light), 1.55 (Moderate), 1.725 (Active), 1.9 (Very Active).</w:t></w:r>
    </w:p>

    <!-- SECTION 4 -->
    <w:p>
      <w:pPr><w:spacing w:before="360" w:after="120"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="28"/><w:color w:val="1E3A8A"/></w:rPr>
        <w:t>4. Target Calories (Calo Mục tiêu) &amp; Macro Split</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>• Giảm cân (LOSE_WEIGHT): </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>Hệ số 0.85 (Thâm hụt 15% Calo nạp vào so với TDEE chuẩn AHA/ACC).</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>• Protein Target: </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>2.0g/kg cân nặng cho mục tiêu giảm mỡ/tăng cơ chuẩn ISSN 2017.</w:t></w:r>
    </w:p>

    <!-- PAGE BREAK FOR APPENDIX -->
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>

    <!-- APPENDIX TITLE -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:sz w:val="32"/>
          <w:color w:val="D97706"/>
        </w:rPr>
        <w:t>PHỤ LỤC: DANH MỤC TRÍCH DẪN NGUỒN KHOA HỌC &amp; LINK CHÍNH THỨC</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="360"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:i/><w:color w:val="4B5563"/></w:rPr>
        <w:t>(Dùng để làm bằng chứng bảo vệ độ chính xác dự án trước Hội đồng Đồ án / Dự án)</w:t>
      </w:r>
    </w:p>

    <!-- CITATION TABLE -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="1E3A8A"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="1E3A8A"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="1E3A8A"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="1E3A8A"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
      </w:tblPr>
      
      <!-- Table Header -->
      <w:tr>
        <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/><w:tcMar><w:top w:w="140" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Chỉ số / Công thức</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/><w:tcMar><w:top w:w="140" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Tổ chức / Tạp chí Khoa học</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/><w:tcMar><w:top w:w="140" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Trích dẫn Bài báo &amp; Đường Link Kiểm chứng</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- Row 1: BMR Mifflin-St Jeor -->
      <w:tr>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/></w:rPr><w:t>BMR (Mifflin-St Jeor 1990)</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>American Journal of Clinical Nutrition (AJCN)</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>Mifflin MD, et al. (1990). AJCN, 51(2), 241-247.</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="2563EB"/></w:rPr><w:t>Link PubMed (PMID 2305711):</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:u/><w:color w:val="2563EB"/></w:rPr><w:t>https://pubmed.ncbi.nlm.nih.gov/2305711/</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- Row 2: BMR Accuracy Validation -->
      <w:tr>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/></w:rPr><w:t>BMR Accuracy Verification</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>Academy of Nutrition and Dietetics (ADA)</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>Frankenfield D, et al. (2005). J Am Diet Assoc, 105(5), 775-789.</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="2563EB"/></w:rPr><w:t>Link PubMed (PMID 15883556):</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:u/><w:color w:val="2563EB"/></w:rPr><w:t>https://pubmed.ncbi.nlm.nih.gov/15883556/</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- Row 3: TDEE PAL FAO/WHO -->
      <w:tr>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/></w:rPr><w:t>TDEE PAL Multipliers (1.2 - 1.9)</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>FAO / WHO / UNU Expert Consultation</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>Human Energy Requirements Report (Rome, 2001).</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="2563EB"/></w:rPr><w:t>Link Trang chủ FAO:</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:u/><w:color w:val="2563EB"/></w:rPr><w:t>https://www.fao.org/3/y5686e/y5686e00.htm</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- Row 4: BMI WHO Asia -->
      <w:tr>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/></w:rPr><w:t>BMI Asian Cut-off Points</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>Tổ chức Y tế Thế giới (WHO) &amp; Lancet</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>WHO Expert Consultation (2004). The Lancet, 363, 157-163.</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="2563EB"/></w:rPr><w:t>Link Trang chủ WHO Factsheet:</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:u/><w:color w:val="2563EB"/></w:rPr><w:t>https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- Row 5: Calorie Deficit AHA/ACC -->
      <w:tr>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/></w:rPr><w:t>Safe Calorie Deficit (15% TDEE)</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>American Heart Association (AHA) / ACC / TOS</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>2013 AHA/ACC/TOS Obesity Management Guidelines.</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="2563EB"/></w:rPr><w:t>Link Tạp chí Circulation (AHA):</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:u/><w:color w:val="2563EB"/></w:rPr><w:t>https://www.ahajournals.org/doi/10.1161/01.cir.0000437739.71477.ee</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- Row 6: Protein ISSN -->
      <w:tr>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/></w:rPr><w:t>High Protein Target (1.6 - 2.0g/kg)</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/></w:rPr><w:t>International Society of Sports Nutrition (ISSN)</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>Jäger R, et al. (2017). J Int Soc Sports Nutr, 14, 20.</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="2563EB"/></w:rPr><w:t>Link PubMed (PMID 28642676):</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:u/><w:color w:val="2563EB"/></w:rPr><w:t>https://pubmed.ncbi.nlm.nih.gov/28642676/</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

    </w:tbl>

    <!-- Footer -->
    <w:p><w:pPr><w:spacing w:before="480" w:after="120"/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:i/><w:sz w:val="20"/><w:color w:val="9CA3AF"/></w:rPr><w:t>Wealthy Eater HealthTech Platform • Capstone Project Defense Reference 2026</w:t></w:r></w:p>

  </w:body>
</w:document>'''

    with zipfile.ZipFile(filename, 'w', zipfile.ZIP_DEFLATED) as docx:
        docx.writestr('[Content_Types].xml', content_types_xml)
        docx.writestr('_rels/.rels', rels_xml)
        docx.writestr('word/document.xml', document_xml)

    print(f"Successfully generated updated DOCX at: {filename}")

if __name__ == '__main__':
    target_path = os.path.abspath('Huong_Dan_Chi_So_Profile_Wealthy_Eater.docx')
    create_docx(target_path)

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function auditAllModels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB. Đang tiến hành Audit toàn bộ Database...\n');

    // 1. Tải toàn bộ Model từ thư mục src/models
    const modelsPath = path.join(__dirname, '../src/models');
    const files = fs.readdirSync(modelsPath);

    const models = [];
    for (const file of files) {
      if (file.endsWith('.js')) {
        const model = require(path.join(modelsPath, file));
        if (model.modelName) {
          models.push(model);
        }
      }
    }

    console.log(`🔍 Tìm thấy ${models.length} Models trong hệ thống.\n`);
    console.log('=========================================================');
    console.log(String('MODEL NAME').padEnd(30, ' ') + ' | ' + 'DOCUMENT COUNT');
    console.log('=========================================================');

    let totalDocs = 0;

    // 2. Đếm số lượng document của từng Model
    for (const model of models) {
      try {
        const count = await model.countDocuments();
        totalDocs += count;
        
        // Highlight nếu collection rỗng
        const countStr = count === 0 ? `⚠️ 0` : `✅ ${count}`;
        console.log(String(model.modelName).padEnd(30, ' ') + ' | ' + countStr);
      } catch (err) {
        console.log(String(model.modelName).padEnd(30, ' ') + ' | ❌ Lỗi đọc DB');
      }
    }

    console.log('=========================================================');
    console.log(`🏆 TỔNG CỘNG CÓ: ${totalDocs} bản ghi (documents) đang được lưu trữ.`);
    console.log('=========================================================');

    // 3. Phân tích chéo một số liên kết quan trọng (vd: User - Profile)
    console.log('\n🔍 KIỂM TRA TÍNH TOÀN VẸN CÁC LIÊN KẾT CHÍNH:');
    
    // User vs Profile
    const User = mongoose.model('User');
    const CustomerProfile = mongoose.models['CustomerProfile'];
    if (User && CustomerProfile) {
      const users = await User.find({ role: 'customer' });
      const profiles = await CustomerProfile.countDocuments();
      if (users.length !== profiles) {
        console.log(`   ⚠️ Lệch Profile: Có ${users.length} User(customer) nhưng chỉ có ${profiles} CustomerProfile.`);
      } else {
        console.log(`   ✅ User-Profile: Khớp 100% (${users.length} khách hàng).`);
      }
    }

    // Recipe vs RecipeNutrition (Đã audit kỹ ở script trước)
    const Recipe = mongoose.models['Recipe'];
    const RecipeNutrition = mongoose.models['RecipeNutrition'];
    if (Recipe && RecipeNutrition) {
      const recipes = await Recipe.countDocuments();
      const nutritions = await RecipeNutrition.countDocuments();
      if (recipes !== nutritions) {
        console.log(`   ⚠️ Lệch Recipe: Có ${recipes} Món ăn nhưng có ${nutritions} Bảng Dinh dưỡng.`);
      } else {
        console.log(`   ✅ Recipe-Nutrition: Khớp 100% (${recipes} món ăn).`);
      }
    }

    console.log('\n🎉 Audit All Models hoàn tất!');
    process.exit(0);

  } catch (err) {
    console.error('Lỗi kết nối hoặc xử lý:', err);
    process.exit(1);
  }
}

auditAllModels();

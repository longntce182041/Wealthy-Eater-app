const CustomerMealLog = require("../models/CustomerMealLog");
const RecipeNutrition = require("../models/RecipeNutrition");
const MacroDeviationFlag = require("../models/MacroDeviationFlag");
const ConsultationContract = require("../models/ConsultationContract");
const MealPlan = require("../models/MealPlan");
const MealPlanItem = require("../models/MealPlanItem");

class DietAuditService {
    //UC54: Audit Client Diet Logs
  async auditClientDietLogs(userId, targetDateStr) {
    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
    
    // Khởi tạo biên ngày bắt đầu và kết thúc (00:00:00 -> 23:59:59)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // 1. Tìm MealPlan đang áp dụng chính thức (PUBLISHED) của khách hàng
    const mealPlan = await MealPlan.findOne({ 
        user_id: userId, 
        status: 'PUBLISHED' 
    }).lean();

    if (!mealPlan) {
        throw new Error("No active published meal plan found for this user.");
    }

    // 2. Chuyển đổi ngày sang Thứ trong tuần để khớp với MealPlanItem (Sunday, Monday,...)
    const daysOfWeekMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDayName = daysOfWeekMap[startOfDay.getDay()];

    const planItems = await MealPlanItem.find({ 
      planId: mealPlan._id,
      dayOfWeek: currentDayName
    }).lean();

    let targetTotal = { calories: 0, protein: 0, fat: 0, carbs: 0 };

    // Cộng dồn các chỉ số dinh dưỡng mục tiêu được chỉ định
    for (const item of planItems) {
      const nutrition = await RecipeNutrition.findOne({ recipe_id: item.recipeId }).lean();
      if (nutrition) {
        const weightGram = item.customizedServingsGram || item.customized_servings_gram || 100;
        const scale = weightGram / 100;

        targetTotal.calories += Math.round((item.targetCalories || nutrition.calories || 0));
        targetTotal.protein += (nutrition.protein || 0) * scale;
        targetTotal.fat += (nutrition.fat || 0) * scale;
        targetTotal.carbs += (nutrition.carbs || 0) * scale;
      }
    }

    // 3. Móc nối dữ liệu Nhật ký ăn uống thực tế (Actual Log) trong ngày hôm đó
    const actualLogs = await CustomerMealLog.find({
      user_id: userId,
      create_at: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    let actualTotal = { calories: 0, protein: 0, fat: 0, carbs: 0 };

    for (const log of actualLogs) {
      actualTotal.calories += log.actual_calories || 0;
      
      const nutrition = await RecipeNutrition.findOne({ recipe_id: log.recipe_id }).lean();
      if (nutrition) {
        const scale = (log.actual_weight_gram || 100) / 100;
        actualTotal.protein += (nutrition.protein || 0) * scale;
        actualTotal.fat += (nutrition.fat || 0) * scale;
        actualTotal.carbs += (nutrition.carbs || 0) * scale;
      }
    }

    // 4. Tính toán hiệu số chênh lệch (Delta = Thực tế - Mục tiêu)
    const deltaCalories = Math.round(actualTotal.calories - targetTotal.calories);
    const deltaProtein = parseFloat((actualTotal.protein - targetTotal.protein).toFixed(1));
    const deltaFat = parseFloat((actualTotal.fat - targetTotal.fat).toFixed(1));
    const deltaCarbs = parseFloat((actualTotal.carbs - targetTotal.carbs).toFixed(1));

    // 5. Ngưỡng báo động: Ăn lệch lệch quá 300 Calo thì kích hoạt dán cờ cảnh báo MacroDeviationFlag
    if (Math.abs(deltaCalories) >= 300 && actualLogs.length > 0) {
      const activeContract = await ConsultationContract.findOne({ 
        user_id: userId, 
        status: "active" 
    }).lean();
      
      if (activeContract) {
        const lastLog = actualLogs[actualLogs.length - 1];
        const existingFlag = await MacroDeviationFlag.findOne({ customer_meal_log: lastLog._id });
        
        if (!existingFlag) {
          const newFlag = new MacroDeviationFlag({
            customer_meal_log: lastLog._id,
            contract_id: activeContract._id,
            calculated_delta_calories: deltaCalories,
            nutritionist_review: `Hệ thống tự động phát hiện hiệu số chênh lệch Calo vượt ngưỡng quy định: ${deltaCalories} Calo.`
          });
          await newFlag.save();

          await CustomerMealLog.findByIdAndUpdate(lastLog._id, { deviation_flag: true });
        }
      }
    }

    return {
      date: startOfDay.toISOString().split('T')[0],
      dayOfWeek: currentDayName,
      summary: {
        isDeviated: Math.abs(deltaCalories) >= 300,
        status: deltaCalories > 300 ? "OVER_BUDGET" : (deltaCalories < -300 ? "UNDER_BUDGET" : "ON_TRACK")
      },
      target: {
        calories: Math.round(targetTotal.calories),
        protein: parseFloat(targetTotal.protein.toFixed(1)),
        fat: parseFloat(targetTotal.fat.toFixed(1)),
        carbs: parseFloat(targetTotal.carbs.toFixed(1))
      },
      actual: {
        calories: Math.round(actualTotal.calories),
        protein: parseFloat(actualTotal.protein.toFixed(1)),
        fat: parseFloat(actualTotal.fat.toFixed(1)),
        carbs: parseFloat(actualTotal.carbs.toFixed(1))
      },
      delta: {
        calories: deltaCalories,
        protein: deltaProtein,
        fat: deltaFat,
        carbs: deltaCarbs
      }
    };
  }
}

module.exports = new DietAuditService();
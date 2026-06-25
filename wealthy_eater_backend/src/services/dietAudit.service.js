const CustomerMealLog = require("../models/CustomerMealLog");
const RecipeNutrition = require("../models/RecipeNutrition");
const MacroDeviationFlag = require("../models/MacroDeviationFlag");
const ConsultationContract = require("../models/ConsultationContract");
const MealPlan = require("../models/MealPlan");
const MealPlanItem = require("../models/MealPlanItem");

// ── UC55: NOTIFICATION MODEL IMPORT ──────────────────────────────────────────
// Import model Notification để lưu trữ lịch sử cảnh báo đỏ khẩn cấp của hệ thống
const Notification = require("../models/Notification");

class DietAuditService {
    //UC54: Audit Client Diet Logs
  // ── UC55 UPDATE ────────────────────────────────────────────────────────────
  // Bổ sung tham số socketIoInstance nhận thực thể io truyền từ tầng controller xuống
  async auditClientDietLogs(userId, targetDateStr, socketIoInstance = null) {
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

          // ── UC55: AUTOMATIC DEVIATION ALERT PACKAGING & DISPATCH ────────────────────
          // Hệ thống đóng gói mã lệnh alert khẩn cấp tự động và bắn realtime ngay khi dán cờ
          try {
            const alertTitle = "🚨 CẢNH BÁO ĐỎ: Chỉ Số Dinh Dưỡng Lệch Pha Khẩn Cấp!";
            const alertBody = `Nhật ký ăn uống hôm nay hiển thị lượng năng lượng thực tế đang bị lệch ${Math.abs(deltaCalories)} kcal so với thực đơn được duyệt. Vui lòng điều chỉnh khẩu phần ăn ngay lập tức!`;

            // 1. Lưu bản ghi thông báo loại 'alert' vào Database
            const systemAlertNotification = new Notification({
              user_id: userId,
              title: alertTitle,
              body: alertBody,
              type: "alert",
              metadata: {
                flag_id: newFlag._id,
                contract_id: activeContract._id,
                delta_calories: deltaCalories,
                status: deltaCalories > 0 ? "OVER_BUDGET" : "UNDER_BUDGET"
              }
            });
            await systemAlertNotification.save();

            // 2. Đẩy thông báo khẩn cấp realtime qua phòng nhận alert riêng của User di động
            const targetAlertRoom = `user_alert_${userId}`;
            if (socketIoInstance) {
              socketIoInstance.to(targetAlertRoom).emit("notification:deviation_warning", {
                success: true,
                message: "EMERGENCY_DEVIATION_ALERT_DISPATCHED",
                data: systemAlertNotification
              });
              console.log(`[UC55 Socket.io] Đã kích hoạt còi báo động đỏ khẩn cấp tự động đến phòng: ${targetAlertRoom}`);
            }
          } catch (socketError) {
            console.error("[UC55 Error] Lỗi trong quá trình đóng gói và tự động phát lệnh alert Socket.io:", socketError);
          }
          // ────────────────────────────────────────────────────────────────────────────
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

  // ── UC55: MANUAL NUTRITIONIST DEVIATION WARNING SERVICE ──────────────────────
  // Cho phép chuyên gia/admin chủ động viết lời phê và kích hoạt ép phát cảnh báo đỏ về điện thoại
  async issueManualDeviationWarning(flagId, customMessage, socketIoInstance = null) {
    const flag = await MacroDeviationFlag.findById(flagId);
    if (!flag) {
      throw new Error("Target macro deviation flag record not found.");
    }

    const contract = await ConsultationContract.findById(flag.contract_id).lean();
    if (!contract) {
      throw new Error("Associated consultation active contract record not found.");
    }

    const targetUserId = contract.user_id;
    const alertTitle = "🚨 CHUYÊN GIA CẢNH BÁO: Điều Chỉnh Thực Đơn Khẩn Cấp!";
    const alertBody = customMessage || `Chuyên gia đã kiểm duyệt nhật ký ăn uống và phát hiện mức độ lệch pha nghiêm trọng: ${flag.calculated_delta_calories} kcal. Yêu cầu tuân thủ nghiêm ngặt!`;

    // 1. Lưu bản ghi chỉ định của chuyên gia vào Database làm bằng chứng kiểm toán
    const manualNotification = new Notification({
      user_id: targetUserId,
      title: alertTitle,
      body: alertBody,
      type: "alert",
      metadata: { 
        flag_id: flag._id, 
        contract_id: contract._id, 
        issuedBy: "nutritionist",
        calculated_delta_calories: flag.calculated_delta_calories
      }
    });
    await manualNotification.save();

    // 2. Bắn tin khẩn cấp thông qua Socket.IO ép Client Mobile rung chuông / bật Modal đỏ lập tức
    const targetAlertRoom = `user_alert_${targetUserId}`;
    if (socketIoInstance) {
      socketIoInstance.to(targetAlertRoom).emit("notification:deviation_warning", {
        success: true,
        message: "MANUAL_NUTRITIONIST_ALERT_DISPATCHED",
        data: manualNotification
      });
      console.log(`[UC55 Socket.io] Chuyên gia phát lệnh cưỡng bức thông báo đỏ tới phòng: ${targetAlertRoom}`);
    }

    // 3. Cập nhật lại lời phê duyệt chính thức của chuyên gia vào bản ghi flag ban đầu
    flag.nutritionist_review = alertBody;
    await flag.save();

    return manualNotification;
  }
}

module.exports = new DietAuditService();
const CustomerMealLog = require("../models/CustomerMealLog");
const RecipeNutrition = require("../models/RecipeNutrition");
const Recipe = require("../models/Recipe");
const MacroDeviationFlag = require("../models/MacroDeviationFlag");
const ConsultationContract = require("../models/ConsultationContract");
const MealPlan = require("../models/MealPlan");
const MealPlanItem = require("../models/MealPlanItem");
const Notification = require("../models/Notification");

async function getItemTargetNutrition(item) {
  let calories = item.target_calories || item.targetCalories || 0;
  let protein = 0;
  let fat = 0;
  let carbs = 0;
  let recipeName = item.custom_name || item.customName || null;
  let imageUrl = null;

  const recipe = item.recipe_id || item.recipeId;
  const recipeId = recipe?._id || recipe;

  if (recipe && typeof recipe === "object" && recipe.name) {
    recipeName = recipe.name;
    imageUrl = recipe.image_url || null;
  }

  if (item.target_snapshot) {
    if (item.target_snapshot.calories) calories = item.target_snapshot.calories;
    if (item.target_snapshot.protein) protein = item.target_snapshot.protein;
    if (item.target_snapshot.fat) fat = item.target_snapshot.fat;
    if (item.target_snapshot.carbs) carbs = item.target_snapshot.carbs;
  }

  if (recipeId && recipeId !== "AI_GENERATED") {
    if (!recipeName) {
      const rec = await Recipe.findById(recipeId).lean();
      if (rec) {
        recipeName = rec.name;
        imageUrl = rec.image_url;
      }
    }
    const nutrition = await RecipeNutrition.findOne({ recipe_id: recipeId }).lean();
    if (nutrition) {
      const weightGram = item.customized_servings_gram || item.customizedServingsGram || 100;
      const scale = weightGram / 100;
      if (!calories) calories = Math.round(nutrition.calories * scale);
      if (!protein) protein = parseFloat(((nutrition.protein || 0) * scale).toFixed(1));
      if (!fat) fat = parseFloat(((nutrition.fat || 0) * scale).toFixed(1));
      if (!carbs) carbs = parseFloat(((nutrition.carbs || 0) * scale).toFixed(1));
    }
  }

  if (!recipeName) {
    const mealType = item.meal_type || item.mealPeriod || "Meal";
    recipeName = `Planned ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`;
  }

  return {
    calories: Math.round(calories),
    protein: parseFloat(protein.toFixed(1)),
    fat: parseFloat(fat.toFixed(1)),
    carbs: parseFloat(carbs.toFixed(1)),
    recipeName,
    imageUrl,
  };
}

async function getLogNutrition(log) {
  let calories = log.actual_calories || 0;
  let protein = log.actual_protein || 0;
  let fat = log.actual_fat || 0;
  let carbs = log.actual_carbs || 0;
  let recipeName = log.custom_name || null;
  let imageUrl = null;

  const recipe = log.recipe_id;
  const recipeId = recipe?._id || recipe;

  if (recipe && typeof recipe === "object" && recipe.name) {
    recipeName = recipe.name;
    imageUrl = recipe.image_url || null;
  }

  if (recipeId && recipeId !== "AI_GENERATED") {
    if (!recipeName) {
      const rec = await Recipe.findById(recipeId).lean();
      if (rec) {
        recipeName = rec.name;
        imageUrl = rec.image_url;
      }
    }
    if (!protein && !fat && !carbs) {
      const nutrition = await RecipeNutrition.findOne({ recipe_id: recipeId }).lean();
      if (nutrition) {
        const scale = (log.actual_weight_gram || 100) / 100;
        if (!calories) calories = Math.round(nutrition.calories * scale);
        protein = parseFloat(((nutrition.protein || 0) * scale).toFixed(1));
        fat = parseFloat(((nutrition.fat || 0) * scale).toFixed(1));
        carbs = parseFloat(((nutrition.carbs || 0) * scale).toFixed(1));
      }
    }
  }

  if (!recipeName) {
    recipeName = log.custom_name || "Logged Meal";
  }

  return {
    calories: Math.round(calories),
    protein: parseFloat(protein.toFixed(1)),
    fat: parseFloat(fat.toFixed(1)),
    carbs: parseFloat(carbs.toFixed(1)),
    recipeName,
    imageUrl,
  };
}

class DietAuditService {
  // UC54: Audit Client Diet Logs
  async auditClientDietLogs(userId, targetDateStr, socketIoInstance = null) {
    let targetDate;
    if (targetDateStr) {
      const parts = targetDateStr.split("-").map(Number);
      if (parts.length === 3) {
        targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        targetDate = new Date(targetDateStr);
      }
    } else {
      targetDate = new Date();
    }

    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // 1. Tìm MealPlan đang áp dụng chính thức (PUBLISHED) của khách hàng
    const mealPlan = await MealPlan.findOne({ 
      user_id: userId, 
      status: "PUBLISHED" 
    }).sort({ date: -1 }).lean();

    const anyMealPlan = mealPlan || await MealPlan.findOne({ user_id: userId }).sort({ date: -1 }).lean();

    // 2. Chuyển đổi ngày sang Thứ trong tuần để khớp với MealPlanItem
    const daysOfWeekMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDayName = daysOfWeekMap[startOfDay.getDay()];
    const isoDay = startOfDay.getDay() === 0 ? 7 : startOfDay.getDay();

    let targetPlanItems = [];

    if (anyMealPlan) {
      const allPlanItems = await MealPlanItem.find({
        $or: [
          { meal_plan_id: anyMealPlan._id },
          { planId: anyMealPlan._id }
        ]
      })
      .populate({ path: "recipe_id", model: "Recipe" })
      .populate({ path: "recipeId", model: "Recipe" })
      .lean();

      let planDayNumber = 1;
      if (anyMealPlan.date) {
        const planStart = new Date(anyMealPlan.date);
        planStart.setHours(0, 0, 0, 0);
        const diffTime = startOfDay.getTime() - planStart.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        planDayNumber = diffDays >= 0 ? (diffDays % 7) + 1 : 1;
      }

      const dayItems = allPlanItems.filter((item) => {
        const itemDay = item.day_of_week != null ? item.day_of_week : item.dayOfWeek;
        if (itemDay == null) return true;
        if (typeof itemDay === "string") {
          return itemDay.toLowerCase() === currentDayName.toLowerCase() || itemDay === `${isoDay}` || itemDay === `${planDayNumber}`;
        }
        return itemDay === isoDay || itemDay === planDayNumber || itemDay === startOfDay.getDay();
      });

      targetPlanItems = dayItems.length > 0 ? dayItems : (allPlanItems.length <= 7 ? allPlanItems : allPlanItems.slice(0, 3));
    }

    // 3. Móc nối dữ liệu Nhật ký ăn uống thực tế (Actual Log) trong ngày hôm đó
    const actualLogs = await CustomerMealLog.find({
      user_id: userId,
      create_at: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate({ path: "recipe_id", model: "Recipe" })
    .lean();

    // 4. Xây dựng danh sách chi tiết các món đã ăn và chưa ăn
    const meals = [];

    for (const item of targetPlanItems) {
      const targetNutr = await getItemTargetNutrition(item);

      const matchedLogIndex = actualLogs.findIndex((log) => {
        if (log._matched) return false;
        if (log.meal_plan_item_id && log.meal_plan_item_id.toString() === item._id.toString()) {
          return true;
        }
        const itemRecId = (item.recipe_id?._id || item.recipe_id || item.recipeId?._id || item.recipeId)?.toString();
        const logRecId = (log.recipe_id?._id || log.recipe_id)?.toString();
        if (itemRecId && logRecId && itemRecId !== "AI_GENERATED" && itemRecId === logRecId) {
          return true;
        }
        return false;
      });

      const rawMealType = item.meal_type || item.mealPeriod || "Meal";
      const mealTypeFormatted = rawMealType.charAt(0).toUpperCase() + rawMealType.slice(1).toLowerCase();

      if (matchedLogIndex !== -1) {
        const matchedLog = actualLogs[matchedLogIndex];
        matchedLog._matched = true;
        const actualNutr = await getLogNutrition(matchedLog);

        meals.push({
          id: item._id.toString(),
          logId: matchedLog._id.toString(),
          mealType: mealTypeFormatted,
          name: actualNutr.recipeName || targetNutr.recipeName,
          imageUrl: actualNutr.imageUrl || targetNutr.imageUrl,
          isEaten: true,
          isPlanned: true,
          targetCalories: targetNutr.calories,
          actualCalories: actualNutr.calories,
          targetMacros: {
            protein: targetNutr.protein,
            fat: targetNutr.fat,
            carbs: targetNutr.carbs,
          },
          actualMacros: {
            protein: actualNutr.protein,
            fat: actualNutr.fat,
            carbs: actualNutr.carbs,
          },
          actualWeightGram: matchedLog.actual_weight_gram,
          loggedAt: matchedLog.create_at,
        });
      } else {
        meals.push({
          id: item._id.toString(),
          logId: null,
          mealType: mealTypeFormatted,
          name: targetNutr.recipeName,
          imageUrl: targetNutr.imageUrl,
          isEaten: false,
          isPlanned: true,
          targetCalories: targetNutr.calories,
          actualCalories: 0,
          targetMacros: {
            protein: targetNutr.protein,
            fat: targetNutr.fat,
            carbs: targetNutr.carbs,
          },
          actualMacros: null,
          actualWeightGram: null,
          loggedAt: null,
        });
      }
    }

    // Xử lý các món ăn thêm ngoài kế hoạch mà khách đã log
    for (const log of actualLogs) {
      if (!log._matched) {
        const actualNutr = await getLogNutrition(log);
        meals.push({
          id: log._id.toString(),
          logId: log._id.toString(),
          mealType: log.custom_name ? "Extra Meal" : "Logged Meal",
          name: actualNutr.recipeName,
          imageUrl: actualNutr.imageUrl,
          isEaten: true,
          isPlanned: false,
          targetCalories: 0,
          actualCalories: actualNutr.calories,
          targetMacros: { protein: 0, fat: 0, carbs: 0 },
          actualMacros: {
            protein: actualNutr.protein,
            fat: actualNutr.fat,
            carbs: actualNutr.carbs,
          },
          actualWeightGram: log.actual_weight_gram,
          loggedAt: log.create_at,
        });
      }
    }

    // Sắp xếp thứ tự bữa ăn
    const mealOrder = { breakfast: 1, lunch: 2, dinner: 3, snack: 4, "extra meal": 5, "logged meal": 6 };
    meals.sort((a, b) => {
      const orderA = mealOrder[a.mealType.toLowerCase()] || 99;
      const orderB = mealOrder[b.mealType.toLowerCase()] || 99;
      return orderA - orderB;
    });

    // 5. Tính toán tổng Dinh dưỡng
    let targetTotal = { calories: 0, protein: 0, fat: 0, carbs: 0 };
    for (const m of meals) {
      if (m.isPlanned) {
        targetTotal.calories += m.targetCalories || 0;
        targetTotal.protein += m.targetMacros?.protein || 0;
        targetTotal.fat += m.targetMacros?.fat || 0;
        targetTotal.carbs += m.targetMacros?.carbs || 0;
      }
    }

    let actualTotal = { calories: 0, protein: 0, fat: 0, carbs: 0 };
    for (const log of actualLogs) {
      const nutr = await getLogNutrition(log);
      actualTotal.calories += nutr.calories;
      actualTotal.protein += nutr.protein;
      actualTotal.fat += nutr.fat;
      actualTotal.carbs += nutr.carbs;
    }

    // Hiệu số chênh lệch
    const deltaCalories = Math.round(actualTotal.calories - targetTotal.calories);
    const deltaProtein = parseFloat((actualTotal.protein - targetTotal.protein).toFixed(1));
    const deltaFat = parseFloat((actualTotal.fat - targetTotal.fat).toFixed(1));
    const deltaCarbs = parseFloat((actualTotal.carbs - targetTotal.carbs).toFixed(1));

    const totalPlanned = meals.filter((m) => m.isPlanned).length;
    const totalEaten = meals.filter((m) => m.isEaten).length;
    const totalPending = meals.filter((m) => m.isPlanned && !m.isEaten).length;

    // 6. Ngưỡng báo động: Ăn lệch lệch quá 300 Calo thì kích hoạt dán cờ cảnh báo MacroDeviationFlag (UC-54 / UC-55)
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
            nutritionist_review: `System auto-detected calorie deviation exceeding threshold: ${deltaCalories} kcal.`
          });
          await newFlag.save();

          await CustomerMealLog.findByIdAndUpdate(lastLog._id, { deviation_flag: true });

          // ── UC55: AUTOMATIC DEVIATION ALERT PACKAGING & DISPATCH ────────────────────
          try {
            const alertTitle = "🚨 RED ALERT: Critical Nutritional Deviation Detected!";
            const alertBody = `Today's meal log shows an energy deviation of ${Math.abs(deltaCalories)} kcal from your approved meal plan. Please adjust your portions immediately!`;

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

            const targetAlertRoom = `user_alert_${userId}`;
            if (socketIoInstance) {
              socketIoInstance.to(targetAlertRoom).emit("notification:deviation_warning", {
                success: true,
                message: "EMERGENCY_DEVIATION_ALERT_DISPATCHED",
                data: systemAlertNotification
              });
              console.log(`[UC55 Socket.io] Emergency deviation alert dispatched to room: ${targetAlertRoom}`);
            }
          } catch (socketError) {
            console.error("[UC55 Error] Failed to package and dispatch Socket.io deviation alert:", socketError);
          }
        }
      }
    }

    const dateFormatted = `${startOfDay.getFullYear()}-${String(startOfDay.getMonth() + 1).padStart(2, "0")}-${String(startOfDay.getDate()).padStart(2, "0")}`;

    return {
      date: dateFormatted,
      dayOfWeek: currentDayName,
      summary: {
        isDeviated: Math.abs(deltaCalories) >= 300 && actualLogs.length > 0,
        status: actualLogs.length === 0 
          ? "NO_LOGS" 
          : (deltaCalories > 300 ? "OVER_BUDGET" : (deltaCalories < -300 ? "UNDER_BUDGET" : "ON_TRACK")),
        totalPlannedMeals: totalPlanned,
        totalEatenMeals: totalEaten,
        totalPendingMeals: totalPending,
        adherenceRate: totalPlanned > 0 ? Math.round((totalEaten / totalPlanned) * 100) : 0,
      },
      target: {
        calories: Math.round(targetTotal.calories),
        protein: parseFloat(targetTotal.protein.toFixed(1)),
        fat: parseFloat(targetTotal.fat.toFixed(1)),
        carbs: parseFloat(targetTotal.carbs.toFixed(1)),
      },
      actual: {
        calories: Math.round(actualTotal.calories),
        protein: parseFloat(actualTotal.protein.toFixed(1)),
        fat: parseFloat(actualTotal.fat.toFixed(1)),
        carbs: parseFloat(actualTotal.carbs.toFixed(1)),
      },
      delta: {
        calories: deltaCalories,
        protein: deltaProtein,
        fat: deltaFat,
        carbs: deltaCarbs,
      },
      meals: meals,
    };
  }

  // ── UC55: MANUAL NUTRITIONIST DEVIATION WARNING SERVICE ──────────────────────
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
    const alertTitle = "🚨 NUTRITIONIST ALERT: Urgent Meal Plan Adjustment Required!";
    const alertBody = customMessage || `Your nutritionist has reviewed your diet log and found a critical deviation: ${flag.calculated_delta_calories} kcal. Strict adherence is required immediately!`;

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

    const targetAlertRoom = `user_alert_${targetUserId}`;
    if (socketIoInstance) {
      socketIoInstance.to(targetAlertRoom).emit("notification:deviation_warning", {
        success: true,
        message: "MANUAL_NUTRITIONIST_ALERT_DISPATCHED",
        data: manualNotification
      });
      console.log(`[UC55 Socket.io] Nutritionist manually dispatched red alert to room: ${targetAlertRoom}`);
    }

    flag.nutritionist_review = alertBody;
    await flag.save();

    return manualNotification;
  }
}

module.exports = new DietAuditService();
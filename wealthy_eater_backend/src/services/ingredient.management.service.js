const Ingredient = require("../models/Ingredient");
const XLSX = require("xlsx");
const IngredientMicronutrientValues = require("../models/IngredientMicronutrientValue");
const cloudinary = require("cloudinary").v2;

// ==========================================
// 🌐 CÁC HÀM HELPER XỬ LÝ ẢNH CLOUDINARY
// ==========================================

// Hàm 1: Upload File Ảnh từ bộ nhớ RAM lên Cloudinary (Dành cho Create/Update thủ công)
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "ingredients" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      },
    );
    stream.end(fileBuffer);
  });
};

// Hàm 2: Truyền thẳng link URL để Cloudinary tự kéo ảnh về kho (Dành cho Import Excel)
const uploadUrlToCloudinary = async (url) => {
  try {
    const result = await cloudinary.uploader.upload(url.trim(), {
      folder: "ingredients",
    });
    return result.secure_url;
  } catch (error) {
    console.error(
      "❌ Cloudinary failed to pull image from URL:",
      error.message,
    );
    return ""; // Nếu lỗi link ảnh, trả về chuỗi rỗng để tránh crash tiến trình import
  }
};

class IngredientManagementService {
  // ==========================================
  // 🔍 [GET] LOGIC LẤY DANH SÁCH NGUYÊN LIỆU
  // ==========================================
  async getAllIngredients(query) {
    const { keyword, unit, page = 1, limit = 10, sort = "name" } = query;
    let filter = {};
    if (keyword) filter.name = { $regex: keyword, $options: "i" };
    if (unit) filter.unit = { $regex: unit, $options: "i" };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const ingredients = await Ingredient.find(filter)
      .sort({ [sort]: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Ingredient.countDocuments(filter);

    return {
      ingredients,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // 👁️ [GET] LOGIC LẤY CHI TIẾT NGUYÊN LIỆU + VI LƯỢNG
  // ==========================================
  async getIngredientById(id) {
    const stringId = id.toString();
    const ingredient = await Ingredient.findById(stringId);
    if (!ingredient) throw new Error("Ingredient not found");

    // 🎯 FIX: Đồng bộ đúng tên field ingredient_id & micronutrient_id theo Schema
    const micronValues = await IngredientMicronutrientValues.find({
      ingredient_id: stringId,
    }).populate("micronutrient_id", "name unit");
    const micronutrients = micronValues.map((mv) => ({
      micronutrientId: mv.micronutrient_id?._id || mv.micronutrient_id,
      name: mv.micronutrient_id?.name || null,
      unit: mv.micronutrient_id?.unit || null,
      amount: mv.amount,
    }));

    const result = ingredient.toObject();
    result.micronutrients = micronutrients;
    return result;
  }

  // ==========================================
  // ➕ [CREATE] LOGIC TẠO NGUYÊN LIỆU MỚI (UP ẢNH THỦ CÔNG)
  // ==========================================
  async createIngredient(data, file) {
    const existing = await Ingredient.findOne({ name: data.name });
    if (existing) throw new Error("Ingredient name already exists");

    let secureUrl = "";
    if (file && file.buffer) {
      secureUrl = await uploadToCloudinary(file.buffer);
    }

    const newIngredient = new Ingredient({
      name: data.name,
      image_url: secureUrl,
      calories_per_unit: Number(data.calories_per_unit) || 0,
      protein: Number(data.protein) || 0,
      carbs: Number(data.carbs) || 0,
      fat: Number(data.fat) || 0,
      description: data.description || "",
      unit: data.unit || "gram",
    });

    const saved = await newIngredient.save();

    if (
      data.micronutrients &&
      Array.isArray(data.micronutrients) &&
      data.micronutrients.length
    ) {
      const docs = data.micronutrients
        .filter((m) => m && m.micronutrientId)
        .map((m) => ({
          ingredient_id: saved._id.toString(), // 🎯 FIX: Dùng đúng ingredient_id theo Schema
          micronutrient_id: m.micronutrientId, // 🎯 FIX: Dùng đúng micronutrient_id theo Schema
          amount: Number(m.amount) || 0,
        }));
      if (docs.length > 0) {
        await IngredientMicronutrientValues.insertMany(docs);
      }
    }
    return saved;
  }

  // ==========================================
  // 📝 [UPDATE] LOGIC CẬP NHẬT NGUYÊN LIỆU (UP ẢNH THỦ CÔNG)
  // ==========================================
  async updateIngredient(id, data, file) {
    const stringId = id.toString();
    const ingredient = await Ingredient.findById(stringId);
    if (!ingredient) throw new Error("Ingredient not found");

    if (data.name && data.name !== ingredient.name) {
      const duplicate = await Ingredient.findOne({ name: data.name });
      if (duplicate) throw new Error("Ingredient name already exists");
    }

    if (file && file.buffer) {
      ingredient.image_url = await uploadToCloudinary(file.buffer);
    }

    ingredient.name = data.name !== undefined ? data.name : ingredient.name;
    ingredient.calories_per_unit =
      data.calories_per_unit !== undefined
        ? Number(data.calories_per_unit)
        : ingredient.calories_per_unit;
    ingredient.protein =
      data.protein !== undefined ? Number(data.protein) : ingredient.protein;
    ingredient.carbs =
      data.carbs !== undefined ? Number(data.carbs) : ingredient.carbs;
    ingredient.fat = data.fat !== undefined ? Number(data.fat) : ingredient.fat;
    ingredient.description =
      data.description !== undefined
        ? data.description
        : ingredient.description;
    ingredient.unit = data.unit !== undefined ? data.unit : ingredient.unit;

    const updated = await ingredient.save();

    if (data.micronutrients !== undefined) {
      // 🎯 FIX: Tìm và xóa theo đúng tên field ingredient_id
      await IngredientMicronutrientValues.deleteMany({
        ingredient_id: updated._id.toString(),
      });
      if (Array.isArray(data.micronutrients) && data.micronutrients.length) {
        const docs = data.micronutrients
          .filter((m) => m && m.micronutrientId)
          .map((m) => ({
            ingredient_id: updated._id.toString(), // 🎯 FIX: Dùng đúng ingredient_id theo Schema
            micronutrient_id: m.micronutrientId, // 🎯 FIX: Dùng đúng micronutrient_id theo Schema
            amount: Number(m.amount) || 0,
          }));
        if (docs.length > 0) {
          await IngredientMicronutrientValues.insertMany(docs);
        }
      }
    }
    return updated;
  }

  // ==========================================
  // 🗑️ [DELETE] LOGIC XÓA NGUYÊN LIỆU + VI LƯỢNG KÈM THEO
  // ==========================================
  async deleteIngredient(id) {
    const stringId = id.toString();
    const ingredient = await Ingredient.findByIdAndDelete(stringId);
    if (!ingredient) throw new Error("Ingredient not found");
    // 🎯 FIX: Dùng đúng ingredient_id
    await IngredientMicronutrientValues.deleteMany({ ingredient_id: stringId });
    return ingredient;
  }

  // ==========================================
  // 📥 [IMPORT] LOGIC PARSE EXCEL + ĐỒNG BỘ ẢNH LÊN CLOUDINARY
  // ==========================================

  async importIngredientsFromExcel(fileBuffer) {
    const {
      validateIngredient,
      normalizeUnit,
    } = require("../validators/ingredient.management.validators");

    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (!rawRows || rawRows.length === 0)
      throw new Error("The Excel file is empty");

    const rowErrors = [];
    const validatedRows = [];

    rawRows.forEach((row, index) => {
      const rowNumber = index + 2;
      const ingredientData = {
        name: row["Name"] || row["name"],
        unit: normalizeUnit(row["Unit"] || row["unit"]),
        calories_per_unit:
          row["Calories"] !== undefined
            ? row["Calories"]
            : row["calories_per_unit"],
        protein: row["Protein"] !== undefined ? row["Protein"] : row["protein"],
        carbs: row["Carbs"] !== undefined ? row["Carbs"] : row["carbs"],
        fat:
          row["Fat"] !== undefined
            ? row["Fat"]
            : row["Fats"] !== undefined
              ? row["Fats"]
              : row["fat"],
        description: row["Description"] || row["description"] || "",
        image_url:
          row["Image URL"] || row["image_url"] || row["ImageUrl"] || "",
      };

      const { errors, isValid } = validateIngredient(ingredientData);
      if (!isValid) {
        rowErrors.push({ rowNumber, errors });
      } else {
        validatedRows.push(ingredientData);
      }
    });

    if (rowErrors.length > 0) {
      const errorDetails = new Error("Validation failed for some rows");
      errorDetails.details = rowErrors;
      throw errorDetails;
    }

    let insertedCount = 0;
    let modifiedCount = 0;

    for (const item of validatedRows) {
      let finalImageUrl = item.image_url;

      if (
        item.image_url &&
        typeof item.image_url === "string" &&
        item.image_url.trim().startsWith("http")
      ) {
        const cloudinaryUrl = await uploadUrlToCloudinary(item.image_url);
        if (cloudinaryUrl) {
          finalImageUrl = cloudinaryUrl;
        }
      }

      item.image_url = finalImageUrl;

      const existingIngredient = await Ingredient.findOne({
        name: item.name.trim(),
      });

      if (existingIngredient) {
        await Ingredient.updateOne(
          { _id: existingIngredient._id },
          { $set: item },
        );
        modifiedCount++;
      } else {
        const newIng = new Ingredient(item);
        await newIng.save();
        insertedCount++;
      }
    }

    return { insertedCount, modifiedCount };
  }
}

module.exports = new IngredientManagementService();

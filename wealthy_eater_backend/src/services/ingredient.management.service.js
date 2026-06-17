const Ingredient = require("../models/Ingredient"); 
const XLSX = require("xlsx");
const IngredientMicronutrientValues = require("../models/IngredientMicronutrientValue"); 
const cloudinary = require("cloudinary").v2; // Đảm bảo bạn đã cấu hình cloudinary.config(...) tại server

// Hàm helper upload Stream lên Cloudinary
const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "ingredients" },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        stream.end(fileBuffer);
    });
};

class IngredientManagementService {
    async getAllIngredients(query) {
        const { keyword, unit, page = 1, limit = 10, sort = 'name' } = query;
        let filter = {};
        if (keyword) filter.name = { $regex: keyword, $options: "i" };
        if (unit) filter.unit = { $regex: unit, $options: "i" };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const ingredients = await Ingredient.find(filter).sort({ [sort]: 1 }).skip(skip).limit(parseInt(limit));
        const total = await Ingredient.countDocuments(filter);

        return { ingredients, total, page: parseInt(page), totalPages: Math.ceil(total / limit) };
    }

    async getIngredientById(id) {
        const stringId = id.toString();
        const ingredient = await Ingredient.findById(stringId);
        if (!ingredient) throw new Error("Ingredient not found");

        const micronValues = await IngredientMicronutrientValues.find({ ingredientId: stringId }).populate('micronutrientId', 'name unit');
        const micronutrients = micronValues.map(mv => ({
            micronutrientId: mv.micronutrientId?._id || mv.micronutrientId,
            name: mv.micronutrientId?.name || null,
            unit: mv.micronutrientId?.unit || null,
            amount: mv.amount,
        }));

        const result = ingredient.toObject();
        result.micronutrients = micronutrients;
        return result;
    }

    // 🎯 SỬA HÀM CREATE: Nhận thêm biến file
    async createIngredient(data, file) {
        const existing = await Ingredient.findOne({ name: data.name });
        if (existing) throw new Error("Ingredient name already exists");

        let secureUrl = "";
        if (file && file.buffer) {
            secureUrl = await uploadToCloudinary(file.buffer);
        }

        const newIngredient = new Ingredient({
            name: data.name,
            image_url: secureUrl, // Lưu link từ Cloudinary
            calories_per_unit: Number(data.calories_per_unit) || 0,
            protein: Number(data.protein) || 0,
            carbs: Number(data.carbs) || 0,
            fat: Number(data.fat) || 0, 
            description: data.description || "",
            unit: data.unit || "gram"
        });

        const saved = await newIngredient.save();

        if (data.micronutrients && Array.isArray(data.micronutrients) && data.micronutrients.length) {
            const docs = data.micronutrients
                .filter(m => m && m.micronutrientId)
                .map(m => ({
                    ingredientId: saved._id.toString(),
                    micronutrientId: m.micronutrientId,
                    amount: Number(m.amount) || 0
                }));
            if (docs.length > 0) {
                await IngredientMicronutrientValues.insertMany(docs);
            }
        }
        return saved;
    }

    // 🎯 SỬA HÀM UPDATE: Nhận thêm biến file
    async updateIngredient(id, data, file) {
        const stringId = id.toString();
        const ingredient = await Ingredient.findById(stringId);
        if (!ingredient) throw new Error("Ingredient not found");

        if (data.name && data.name !== ingredient.name) {
            const duplicate = await Ingredient.findOne({ name: data.name });
            if (duplicate) throw new Error("Ingredient name already exists");
        }

        // Nếu người dùng upload file mới, ghi đè link image_url cũ
        if (file && file.buffer) {
            ingredient.image_url = await uploadToCloudinary(file.buffer);
        }

        ingredient.name = data.name !== undefined ? data.name : ingredient.name;
        ingredient.calories_per_unit = data.calories_per_unit !== undefined ? Number(data.calories_per_unit) : ingredient.calories_per_unit;
        ingredient.protein = data.protein !== undefined ? Number(data.protein) : ingredient.protein;
        ingredient.carbs = data.carbs !== undefined ? Number(data.carbs) : ingredient.carbs;
        ingredient.fat = data.fat !== undefined ? Number(data.fat) : ingredient.fat; 
        ingredient.description = data.description !== undefined ? data.description : ingredient.description;
        ingredient.unit = data.unit !== undefined ? data.unit : ingredient.unit;

        const updated = await ingredient.save();

        if (data.micronutrients !== undefined) {
            await IngredientMicronutrientValues.deleteMany({ ingredientId: updated._id.toString() });
            if (Array.isArray(data.micronutrients) && data.micronutrients.length) {
                const docs = data.micronutrients
                    .filter(m => m && m.micronutrientId)
                    .map(m => ({
                        ingredientId: updated._id.toString(),
                        micronutrientId: m.micronutrientId,
                        amount: Number(m.amount) || 0
                    }));
                if (docs.length > 0) {
                    await IngredientMicronutrientValues.insertMany(docs);
                }
            }
        }
        return updated;
    }

    async deleteIngredient(id) {
        const stringId = id.toString();
        const ingredient = await Ingredient.findByIdAndDelete(stringId);
        if (!ingredient) throw new Error("Ingredient not found");
        await IngredientMicronutrientValues.deleteMany({ ingredientId: stringId });
        return ingredient;
    }

    async importIngredientsFromExcel(fileBuffer) {
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        if (!rawRows || rawRows.length === 0) throw new Error("The Excel file is empty");

        const bulkOperations = [];
        const rowErrors = [];

        rawRows.forEach((row, index) => {
            const rowNumber = index + 2;
            const ingredientData = {
                name: row["Name"] || row["name"],
                unit: row["Unit"] || row["unit"],
                calories_per_unit: row["Calories"] !== undefined ? row["Calories"] : row["calories_per_unit"],
                protein: row["Protein"] !== undefined ? row["Protein"] : row["protein"],
                carbs: row["Carbs"] !== undefined ? row["Carbs"] : row["carbs"],
                fat: row["Fat"] !== undefined ? row["Fat"] : (row["Fats"] !== undefined ? row["Fats"] : row["fat"]),
                description: row["Description"] || row["description"] || "",
                image_url: row["Image URL"] || row["image_url"] || row["ImageUrl"] || ""
            };

            const { errors, isValid } = validateIngredient(ingredientData);
            if (!isValid) {
                rowErrors.push({ rowNumber, errors });
            } else {
                bulkOperations.push({
                    updateOne: {
                        filter: { name: ingredientData.name.trim() },
                        update: { $set: ingredientData },
                        upsert: true
                    }
                });
            }
        });

        if (rowErrors.length > 0) {
            const errorDetails = new Error("Validation failed for some rows");
            errorDetails.details = rowErrors;
            throw errorDetails;
        }

        let result = { insertedCount: 0, modifiedCount: 0 };
        if (bulkOperations.length > 0) {
            const bulkResult = await Ingredient.bulkWrite(bulkOperations);
            result = { insertedCount: bulkResult.upsertedCount, modifiedCount: bulkResult.modifiedCount };
        }
        return result;
    }
}

module.exports = new IngredientManagementService();
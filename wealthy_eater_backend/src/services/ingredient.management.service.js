const Ingredient = require("../models/Ingredient"); 
const XLSX = require("xlsx");
const IngredientMicronutrientValues = require("../models/IngredientMicronutrientValue"); 
const { validateIngredient } = require("../validators/ingredient.management.validators");

class IngredientManagementService {
    // 1. Get All + Search + Pagination
    async getAllIngredients(query) {
        // 1. Lấy thêm 'unit' từ query truyền lên
        const { keyword, unit, page = 1, limit = 10, sort = 'name' } = query;

        let filter = {};

        // 2. Tìm kiếm theo tên (Bạn đã có)
        if (keyword) {
            filter.name = { $regex: keyword, $options: "i" };
        }

        // 3. THÊM MỚI: Lọc theo đơn vị (Nếu có truyền unit lên thì mới lọc)
        if (unit) {
            filter.unit = { $regex: unit, $options: "i" };
        }

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

    // 2. Get Detail
    async getIngredientById(id) {
        const ingredient = await Ingredient.findById(id);
        if (!ingredient) throw new Error("Ingredient not found");

        // Load linked micronutrient values from join table and populate micronutrient details
        const micronValues = await IngredientMicronutrientValues.find({ ingredientId: id }).populate('micronutrientId', 'name unit');
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

    // 3. Create
    async createIngredient(data) {
        // Check trùng tên
        const existing = await Ingredient.findOne({ name: data.name });
        if (existing) throw new Error("Ingredient name already exists");

        const newIngredient = new Ingredient({
            name: data.name,
            ImageUrl: data.ImageUrl || "",
            calories_per_unit: data.calories_per_unit,
            protein: data.protein || 0,
            carbs: data.carbs || 0,
            fat: data.fat || 0,
            description: data.description || "",
            unit: data.unit
        });

        const saved = await newIngredient.save();

        // Nếu có micronutrients kèm theo, tạo các bản ghi trong bảng phụ
        if (data.micronutrients && Array.isArray(data.micronutrients) && data.micronutrients.length) {
            const docs = data.micronutrients.map(m => ({
                ingredientId: saved._id,
                micronutrientId: m.micronutrientId,
                amount: Number(m.amount)
            }));
            await IngredientMicronutrientValues.insertMany(docs);
        }

        return saved;
    }

    // 4. Update
    async updateIngredient(id, data) {
        const ingredient = await Ingredient.findById(id);
        if (!ingredient) throw new Error("Ingredient not found");

        // Nếu đổi tên, phải check xem tên mới có trùng với món khác không
        if (data.name && data.name !== ingredient.name) {
            const duplicate = await Ingredient.findOne({ name: data.name });
            if (duplicate) throw new Error("Ingredient name already exists");
        }

        // Cập nhật dữ liệu
        Object.assign(ingredient, data);

        const updated = await ingredient.save();

        // Nếu gửi lên danh sách micronutrients, cập nhật bảng phụ tương ứng
        if (data.micronutrients !== undefined) {
            // Xóa các bản ghi cũ cho ingredient này
            await IngredientMicronutrientValues.deleteMany({ ingredientId: updated._id });

            if (Array.isArray(data.micronutrients) && data.micronutrients.length) {
                const docs = data.micronutrients.map(m => ({
                    ingredientId: updated._id,
                    micronutrientId: m.micronutrientId,
                    amount: Number(m.amount)
                }));
                await IngredientMicronutrientValues.insertMany(docs);
            }
        }

        return updated;
    }

    // 5. Delete (Xóa cứng - Xóa hẳn khỏi DB vì nguyên liệu rác không cần giữ)
    async deleteIngredient(id) {
        const ingredient = await Ingredient.findByIdAndDelete(id);
        if (!ingredient) throw new Error("Ingredient not found");
        return ingredient;
    }

    // 6. Import từ Excel (Thêm mới hoặc Cập nhật nếu trùng tên)
    async importIngredientsFromExcel(fileBuffer) {
        // 1. Sử dụng thư viện xlsx để đọc dữ liệu từ buffer của stream
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Chuyển đổi dữ liệu sheet thành mảng JSON
        const rawRows = XLSX.utils.sheet_to_json(worksheet);

        if (!rawRows || rawRows.length === 0) {
            throw new Error("The Excel file is empty");
        }

        const bulkOperations = [];
        const rowErrors = [];

        // 2. Phân tích và validate từng dòng (Row-by-Row validation)
        rawRows.forEach((row, index) => {
            const rowNumber = index + 2; // Dòng 1 thường là Header của file Excel

            // Map các cột từ file Excel sang cấu trúc Object khớp với Schema của bạn
            const ingredientData = {
                name: row["Name"] || row["name"],
                unit: row["Unit"] || row["unit"],
                calories_per_unit: row["Calories"] !== undefined ? row["Calories"] : row["calories_per_unit"],
                protein: row["Protein"] !== undefined ? row["Protein"] : row["protein"],
                carbs: row["Carbs"] !== undefined ? row["Carbs"] : row["carbs"],
                fat: row["Fat"] !== undefined ? row["Fat"] : row["fat"],
                description: row["Description"] || row["description"] || "",
                image_url: row["Image URL"] || row["image_url"] || ""
            };

            // Thực thi validator đã viết
            const { errors, isValid } = validateIngredient(ingredientData);

            if (!isValid) {
                rowErrors.push({ rowNumber, errors });
            } else {
                // 3. Nếu dòng hợp lệ, đẩy vào danh sách tác vụ bulkWrite
                // Sử dụng updateOne kết hợp upsert: true giúp tránh trùng lặp dữ liệu theo Tên nguyên liệu
                bulkOperations.push({
                    updateOne: {
                        filter: { name: ingredientData.name.trim() },
                        update: { $set: ingredientData },
                        upsert: true
                    }
                });
            }
        });

        // Nếu phát hiện bất kỳ dòng nào có lỗi, chặn lại và trả về báo cáo chi tiết cho Admin
        if (rowErrors.length > 0) {
            const errorDetails = new Error("Validation failed for some rows");
            errorDetails.details = rowErrors;
            throw errorDetails;
        }

        // 4. Thực thi ghi hàng loạt với bulkWrite giúp tối ưu hóa hiệu năng kết nối DB
        let result = { insertedCount: 0, modifiedCount: 0 };
        if (bulkOperations.length > 0) {
            const bulkResult = await Ingredient.bulkWrite(bulkOperations);
            result = {
                insertedCount: bulkResult.upsertedCount,
                modifiedCount: bulkResult.modifiedCount
            };
        }

        return result;
    }
}

module.exports = new IngredientManagementService();
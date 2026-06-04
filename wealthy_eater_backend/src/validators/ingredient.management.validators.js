const validateIngredient = (data) => {
    const errors = {};
    const MAX_VALUE = 10000;

    if (!data.name || data.name.trim() === "") {
        errors.name = "Ingredient name is required";
    }

    if (!data.unit || data.unit.trim() === "") {
        errors.unit = "Unit is required (e.g., gram, ml, piece)";
    }

    const validateNumberField = (value, fieldName) => {
        if (value === undefined || value === null || value === "") {
            return `${fieldName} is required and cannot be empty`;
        }
        const num = Number(value);
        if (isNaN(num)) return `${fieldName} must be a valid number`;
        if (num < 0) return `${fieldName} cannot be less than 0`;
        if (num > MAX_VALUE) return `${fieldName} cannot exceed ${MAX_VALUE}`;
        return null;
    };

    const caloriesError = validateNumberField(data.calories_per_unit, "Calories");
    if (caloriesError) errors.calories_per_unit = caloriesError;

    const proteinError = validateNumberField(data.protein, "Protein");
    if (proteinError) errors.protein = proteinError;

    const carbsError = validateNumberField(data.carbs, "Carbs");
    if (carbsError) errors.carbs = carbsError;

    // ĐÃ ĐỒNG BỘ: Sửa đổi từ fats thành fat
    const fatError = validateNumberField(data.fat, "Fat");
    if (fatError) errors.fat = fatError;

    // Validate micronutrients nếu có
    if (data.micronutrients !== undefined) {
        if (!Array.isArray(data.micronutrients)) {
            errors.micronutrients = "Micronutrients must be an array";
        } else {
            const micronErrors = [];
            data.micronutrients.forEach((m, idx) => {
                const itemErrors = {};
                if (!m || !m.micronutrientId) itemErrors.micronutrientId = "micronutrientId is required";
                if (m.amount === undefined || m.amount === null || m.amount === "") {
                    itemErrors.amount = "amount is required";
                } else if (isNaN(Number(m.amount))) {
                    itemErrors.amount = "amount must be a number";
                } else if (Number(m.amount) < 0) {
                    itemErrors.amount = "amount cannot be negative";
                }
                if (Object.keys(itemErrors).length) micronErrors[idx] = itemErrors;
            });
            if (micronErrors.length) errors.micronutrients = micronErrors;
        }
    }

    return {
        errors,
        isValid: Object.keys(errors).length === 0,
    };
};

module.exports = { validateIngredient };
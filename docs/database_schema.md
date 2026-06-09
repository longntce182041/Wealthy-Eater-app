# Database Schema Specifications (MongoDB)

All schemas are managed through **Mongoose** in the backend core API (`wealthy_eater_backend`). String IDs (`_id`) are generated as ObjectIDs converted to string formats by default.

---

## 1. Identity & Profiles

### `User`
Tracks credentials, accounts, and application roles.
- `_id` (String): Custom ObjectID string.
- `email` (String): Unique, lowercase, trimmed, required.
- `password_hash` (String): Hashed password (null for SSO users).
- `role` (String): Enum: `['customer', 'admin', 'nutritionist']`. Defaults to `'customer'`.
- `created_at` (Date): Creation timestamp.

### `UserProfile`
Stores physical attributes and biometrics used to compute dietary targets.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User` collection.
- `age` (Number): Required.
- `gender` (String): Required.
- `height` (Number): User height in cm. Required.
- `weight` (Number): User weight in kg. Required.
- `health_goal` (String): Target goal (e.g. weight loss, maintenance).
- `bmi` (Number): Calculated Body Mass Index.
- `tdee` (Number): Total Daily Energy Expenditure.
- `bmr` (String): Basal Metabolic Rate calculation.

### `UserDietary`
Stores culinary preferences, allergies, and health exclusions.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User` collection.
- `medical_condition_id` (String): References `MedicalCondition` collection.
- `allergies` (List[String]): Allergens (e.g. peanuts, gluten).
- `dislike_ingredients` (List[String]): Excluded ingredients.
- `cooking_skill_level` (String): Level (e.g. beginner, intermediate).
- `available_cooking_time` (Number): Cooking time preference in minutes.

### `MedicalCondition`
Tracks known medical conditions and dietary guidelines.
- `_id` (String): Custom ObjectID string.
- `name` (String): Required.
- `category` (String): Category of the condition.
- `description` (String): Details of the condition.
- `dietary_guideline` (String): Guidelines for diet.

### `Nutritionist`
Details of approved certified health consultants.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User` collection.
- `full_name` (String): Required.
- `specialization` (String): Domain expertise.
- `service_fee` (Number): Booking price. Required.
- `certification_url` (String): Link to verified certificates.
- `approval_status` (String): Enum: `['pending', 'approval', 'reject']`. Defaults to `'pending'`.
- `average_rating` (Number): Review score (defaults to `0.0`).

---

## 2. Recipes & Ingredients

### `Recipe`
Stores core details about a recipe.
- `_id` (String): Custom ObjectID string.
- `name` (String): Required.
- `description` (String): Description of the recipe.
- `image_url` (String): Thumbnail image URL.
- `cooking_time` (Number): Total cooking time in minutes.
- `base_servings` (Number): Defaults to `1`.
- `status` (String): Publication status.
- `level_cooking` (String): Difficulty level.
- `cooking_step` (String): Combined cooking steps.

### `RecipeStep`
Ordered instructions for preparing a recipe.
- `_id` (String): Custom ObjectID string.
- `recipe_id` (String): References `Recipe`. Required.
- `step_number` (Number): Required.
- `instruction` (String): Required.

### `RecipeNutrition`
Macronutrient breakdown of a recipe.
- `_id` (String): Custom ObjectID string.
- `recipe_id` (String): References `Recipe`. Required.
- `calories` (Number): Required.
- `protein` (Number): Defaults to `0`.
- `fat` (Number): Defaults to `0`.
- `carbs` (Number): Defaults to `0`.

### `Ingredient`
Base ingredients available in the system.
- `_id` (String): Custom ObjectID string.
- `name` (String): Required.
- `image_url` (String): Ingredient image.
- `calories_per_unit` (Number): Required.
- `protein` (Number): Defaults to `0`.
- `fat` (Number): Defaults to `0`.
- `carbs` (Number): Defaults to `0`.
- `description` (String): Ingredient details.
- `unit` (String): Measurement unit (e.g. g, ml). Required.

### `RecipeIngredient`
Maps ingredients and their quantities to a recipe.
- `_id` (String): Custom ObjectID string.
- `recipe_id` (String): References `Recipe`. Required.
- `ingredient_id` (String): References `Ingredient`. Required.
- `base_quantity` (Number): Required.
- `unit` (String): Required.

### `Micronutrient`
Details about vitamins and minerals.
- `_id` (String): Custom ObjectID string.
- `name` (String): Required.
- `unit` (String): Required.
- `description` (String): Micronutrient details.

### `RecipeMicronutrientValue`
Maps micronutrients and their amounts to a recipe.
- `_id` (String): Custom ObjectID string.
- `recipe_id` (String): References `Recipe`. Required.
- `micronutrient_id` (String): References `Micronutrient`. Required.
- `amount` (Number): Required.

### `IngredientMicronutrientValue`
Maps micronutrients and their amounts to an ingredient.
- `_id` (String): Custom ObjectID string.
- `ingredient_id` (String): References `Ingredient`. Required.
- `micronutrient_id` (String): References `Micronutrient`. Required.
- `amount` (Number): Required.

---

## 3. Expert Consultation & Billing

### `ConsultationContract`
State logic for therapist-user consultations.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User` collection.
- `nutritionists_id` (String): Field used for status enum mapping: `['pending_payment', 'active', 'completed', 'terminated']`. Defaults to `'pending_payment'`.
- `create_at` (Date): Creation timestamp.

### `ConsultationMessage`
Chat messages exchanged within a consultation contract.
- `_id` (String): Custom ObjectID string.
- `contract_id` (String): References `ConsultationContract`. Required.
- `sender_id` (String): References `User`. Required.
- `messages_type` (String): Enum: `['text', 'image', 'system alert']`. Required.
- `content` (String): Required.
- `create_at` (Date): Creation timestamp.

### `Transaction`
Integrates with the PayOS payment gateway.
- `_id` (String): Custom ObjectID string.
- `consultation_contracts_id_fk` (String): References `ConsultationContract`. Required.
- `payos_order_code` (String): Unique transaction code from PayOS. Required.
- `payos_transaction_id` (String): PayOS unique identifier.
- `payos_payment_link` (String): Redirect payment portal URL.
- `payos_qr_code` (String): QR visual link.
- `amount_gross` (Number): Cost before processing fees. Required.
- `platform_fee` (Number): Fee retained by platform (defaults to `0`).
- `expert_payout` (Number): Payout amount owed to nutritionist.
- **Timestamps**: `createdAt` and `updatedAt` enabled.

### `NutritionAssessment`
Assessments generated by nutritionists for users.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User`. Required.
- `nutritionist_id` (String): References `Nutritionist`. Required.
- `diagnosis` (String): Professional diagnosis.
- `recommendations` (String): Prescribed recommendations.
- `notes` (String): Additional notes.

---

## 4. Meal Planning & Logs

### `MealPlan`
Organizes planned recipes by date and owner.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User`. Required.
- `nutritionist_id` (String): References `Nutritionist` (optional).
- `date` (Date): Scheduled meal plan date. Required.
- `created_by` (String): Identifier of the creator (e.g. `'AI'` or `'Nutritionist'`).

### `MealPlanItem`
Refers individual recipes to specific slots in the meal plan.
- `_id` (String): Custom ObjectID string.
- `meal_plan_id` (String): References `MealPlan`. Required.
- `recipe_id` (String): References `Recipe`. Required.
- `meal_type` (String): E.g. `'breakfast'`, `'lunch'`, `'dinner'`, `'snack'`. Required.

### `CustomerMealLog`
Logs of consumed meals by customers.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User`. Required.
- `recipe_id` (String): References `Recipe`. Required.
- `actual_weight_gram` (Number): Required.
- `actual_calories` (Number): Required.
- `deviation_flag` (Boolean): Defaults to `false`.
- `create_at` (Date): Creation timestamp.

### `MacroDeviationFlag`
Flags created when a customer's meal deviates significantly from their macro targets.
- `_id` (String): Custom ObjectID string.
- `customer_meal_log` (String): References `CustomerMealLog`. Required.
- `contract_id` (String): References `ConsultationContract`. Required.
- `calculated_delta_calories` (Number): Required.
- `nutritionist_review` (String): Review comment from the nutritionist.
- `create_at` (Date): Creation timestamp.

---

## 5. User Actions & Interactions

### `RecipeReview`
Stores user star ratings and text comments for recipes.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User`. Required.
- `recipe_id` (String): References `Recipe`. Required.
- `rating` (Number): Integer 1–5. Required.
- `comment` (String): Optional text review. Defaults to `''`.
- **Timestamps**: `createdAt` and `updatedAt` enabled.
- **Index**: `{ user_id, recipe_id }` unique — one review per user per recipe.

### `RecipeLike`
Tracks which recipes each user has liked / saved as a favorite.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User`. Required.
- `recipe_id` (String): References `Recipe`. Required.
- **Timestamps**: `createdAt` and `updatedAt` enabled.
- **Index**: `{ user_id, recipe_id }` unique — prevents duplicate likes.
- **Index**: `{ user_id, createdAt }` — powers the "Liked" tab (newest liked first).

### `ShoppingList`
Tracks items users intend to purchase or have purchased.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User`. Required.
- `ingredient_id` (String): References `Ingredient`. Required.
- `ingredient_name` (String): Name snapshot. Required.
- `recipe_id` (String): References `Recipe`. Required.
- `is_purchase` (Boolean): Defaults to `false`.
- `category` (String): Item category.
- `add_at` (Date): Timestamp when added.
- `purchase_at` (Date): Timestamp when purchased.
- `creat_at` (Date): Creation timestamp.

---

## 6. System Logs

### `AuditLog`
Tracks administrative and critical actions in the system.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User` (Admin ID). Required.
- `action` (String): Action taken (e.g. THÊM, SỬA, XÓA, KHÓA, DUYỆT). Required.
- `description` (String): Detailed text description of the event. Required.
- `created_at` (Date): Creation timestamp.

---

## 7. Notifications & Settings

### `NotificationSetting`
Stores user preferences for push notifications and local reminders (water and meals).
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User`. Required.
- `is_push_enabled` (Boolean): Defaults to `true`.
- `water_reminder` (Object):
  - `enabled` (Boolean): Defaults to `false`.
  - `interval_minutes` (Number): Defaults to `120`.
  - `start_time` (String): Format "HH:mm". Defaults to `"08:00"`.
  - `end_time` (String): Format "HH:mm". Defaults to `"20:00"`.
- `meal_reminders` (List[Object]):
  - `meal_type` (String): Enum `['breakfast', 'lunch', 'dinner', 'snack']`.
  - `time` (String): Format "HH:mm".
  - `enabled` (Boolean).
- **Timestamps**: `createdAt` and `updatedAt` enabled.

### `Notification`
Stores the history of notifications sent to the user from the backend.
- `_id` (String): Custom ObjectID string.
- `user_id` (String): References `User`. Required.
- `title` (String): Title of the notification. Required.
- `body` (String): Content of the notification. Required.
- `type` (String): Enum `['system', 'consultation', 'alert', 'other']`. Defaults to `'system'`.
- `is_read` (Boolean): Read status. Defaults to `false`.
- **Timestamps**: `createdAt` and `updatedAt` enabled.

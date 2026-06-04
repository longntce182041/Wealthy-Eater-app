# AI & Optimization Logic Specifications

The AI and Diet service is a FastAPI-based server (`wealthy-eater-ai`) hosting optimization algorithms, while larger unstructured meal planning workflows are routed through Google Gemini and n8n.

---

## 1. Linear Programming Diet Optimization
The core computational endpoint resides in `app/routers/optimize.py` at `/api/v1/ai/optimize` (POST).

### Request Payload (`DietOptimizationRequest`)
- `target_calories` (float): Exact calorie target for the diet plan.
- `target_protein` (float): Target protein (grams).
- `target_carbs` (float): Target carbohydrates (grams).
- `target_fat` (float): Target fats (grams).
- `allergy_exclusions` (List[string]): List of ingredient IDs to exclude.
- `available_ingredients` (List[Dict]): List of ingredient objects available for selection. Each ingredient must include `id` and `calories` (defined per 100g).

### Solver Execution (using `pulp`)
1. **Problem Setup**: Initializes a linear programming minimization problem:
   ```python
   prob = pulp.LpProblem("Diet_Optimization_Problem", pulp.LpMinimize)
   ```
2. **Allergen Filtering**: Ingredients matching the `allergy_exclusions` IDs are skipped entirely, preventing them from entering the selection matrix.
3. **Variables Definition**: Creates continuous variables for each allowed ingredient representing its weight in grams, with bounds between `0g` and `500g`:
   ```python
   ingredient_vars[ing_id] = pulp.LpVariable(f"ing_{ing_id}", lowBound=0, upBound=500)
   ```
4. **Objective Function**: Minimizes the total mass of the selected ingredients:
   ```python
   prob += pulp.lpSum([ingredient_vars[i] for i in ingredient_vars]), "Total_Mass"
   ```
5. **Constraints**: Enforces that the total calories match the target calories exactly:
   ```python
   prob += pulp.lpSum([ingredient_vars[i] * (ing_map[i].get('calories', 0)/100) for i in ingredient_vars]) == request.target_calories
   ```
6. **Solution**: Invokes the default LP solver. If the solver cannot converge (returns a status other than `"Optimal"`), it throws a `400 Bad Request` HTTP Exception.
7. **Response**: Returns a dictionary mapping ingredient IDs to their calculated weights (in grams).

---

## 2. Gemini & n8n Workflows (Planned / External)
- **n8n Workflows**: Orchestrates data collation from backend API, passes biometric parameters and allergies to Google Gemini API.
- **Gemini Prompts**: Generates daily/weekly recipes in structured JSON format (e.g., ingredients, steps, macro breakdowns) fitting the target calorie limits.
- **Gemini Vision**: Used to analyze meal photos sent from the Flutter client, returning estimated ingredient names and macro estimates.

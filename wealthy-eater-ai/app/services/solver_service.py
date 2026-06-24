import pulp
import logging
from app.dto.optimization_dto import OptimizationRequestDTO, OptimizationResponseDTO, ItemAllocationResult, NutritionSummary
from fastapi import HTTPException

logger = logging.getLogger("optimization_engine")

class SolverService:
    @staticmethod
    def calculate_macro_distribution(payload: OptimizationRequestDTO) -> OptimizationResponseDTO:
        logger.info(f"Initializing LP matrix compilation for dietary preferences status: {payload.dietType}")
        
        # 1. Instantiate the linear programming optimization problem object
        prob = pulp.LpProblem("WealthyEater_Portion_Optimization", pulp.LpMinimize)
        
        # 2. Define decision variables mapped to ingredient arrays (x_i representing portions of 100g)
        decision_variables = {}
        ingredients_map = {}
        binary_selection_variables = {}
        allergy_exclusions = {item.strip().lower() for item in payload.allergiesExclusions if item.strip()}
        use_variety_constraints = payload.minVarietyItems > 0 or payload.maxVarietyItems is not None
        activation_threshold = payload.activationGramThreshold / 100.0
        
        for ing in payload.availableIngredients:
            ingredient_allergens = {tag.strip().lower() for tag in ing.allergenTags if tag.strip()}
            if ing.name.lower() in allergy_exclusions or ingredient_allergens.intersection(allergy_exclusions):
                logger.warning(f"Excluding ingredient {ing.name} due to allergy filters constraint match rules.")
                continue
                
            ingredients_map[ing.id] = ing
            # Convert physical gram limit variables to 100g matrix step scales
            lower_bound = ing.minLimitGram / 100.0
            upper_bound = ing.maxLimitGram / 100.0
            
            decision_variables[ing.id] = pulp.LpVariable(
                name=f"ing_flux_{ing.id}",
                lowBound=0.0 if use_variety_constraints else lower_bound,
                upBound=upper_bound,
                cat='Continuous'
            )
            if use_variety_constraints:
                binary_selection_variables[ing.id] = pulp.LpVariable(
                    name=f"ing_active_{ing.id}",
                    cat='Binary'
                )
             
        if not decision_variables:
            raise HTTPException(status_code=422, detail="No safe ingredients remain after applying allergy exclusion rules.")
        if payload.minVarietyItems > len(decision_variables):
            raise HTTPException(status_code=422, detail="minVarietyItems exceeds safe ingredient count.")
        if payload.maxVarietyItems is not None and payload.maxVarietyItems > len(decision_variables):
            raise HTTPException(status_code=422, detail="maxVarietyItems exceeds safe ingredient count.")

        # 3. Define target tracking slack deviation variables (penalties for macro variance)
        cal_slack_plus = pulp.LpVariable("cal_slack_plus", lowBound=0)
        cal_slack_minus = pulp.LpVariable("cal_slack_minus", lowBound=0)
        prot_slack_plus = pulp.LpVariable("prot_slack_plus", lowBound=0)
        prot_slack_minus = pulp.LpVariable("prot_slack_minus", lowBound=0)
        carbs_slack_plus = pulp.LpVariable("carbs_slack_plus", lowBound=0)
        carbs_slack_minus = pulp.LpVariable("carbs_slack_minus", lowBound=0)
        fat_slack_plus = pulp.LpVariable("fat_slack_plus", lowBound=0)
        fat_slack_minus = pulp.LpVariable("fat_slack_minus", lowBound=0)

        # 4. Construct the linear optimization system equations constraints matrix
        prob += pulp.lpSum([decision_variables[i] * ingredients_map[i].calories for i in decision_variables]) + cal_slack_minus - cal_slack_plus == payload.targetCalories
        prob += pulp.lpSum([decision_variables[i] * ingredients_map[i].protein for i in decision_variables]) + prot_slack_minus - prot_slack_plus == payload.targetProtein
        prob += pulp.lpSum([decision_variables[i] * ingredients_map[i].carbs for i in decision_variables]) + carbs_slack_minus - carbs_slack_plus == payload.targetCarbs
        prob += pulp.lpSum([decision_variables[i] * ingredients_map[i].fat for i in decision_variables]) + fat_slack_minus - fat_slack_plus == payload.targetFat

        if use_variety_constraints:
            for ing_id in decision_variables:
                min_bound = ingredients_map[ing_id].minLimitGram / 100.0
                max_bound = ingredients_map[ing_id].maxLimitGram / 100.0
                selected_var = binary_selection_variables[ing_id]
                prob += decision_variables[ing_id] >= max(activation_threshold, min_bound) * selected_var
                prob += decision_variables[ing_id] <= max_bound * selected_var

            prob += pulp.lpSum([binary_selection_variables[i] for i in binary_selection_variables]) >= payload.minVarietyItems
            if payload.maxVarietyItems is not None:
                prob += pulp.lpSum([binary_selection_variables[i] for i in binary_selection_variables]) <= payload.maxVarietyItems

        # 5. Define the mathematical objective function equation (Minimize macro deviation penalties)
        # Calorie deviation is assigned a lower weight factor to balance macro priorities accurately
        prob += (
            1.0 * (cal_slack_plus + cal_slack_minus) +
            20.0 * (prot_slack_plus + prot_slack_minus) +
            20.0 * (carbs_slack_plus + carbs_slack_minus) +
            20.0 * (fat_slack_plus + fat_slack_minus)
        ), "Total_System_Deviation"

        # 6. Run the solver execution pipeline (falls back to default system solver if CBC fails on macOS/Windows/Linux)
        try:
            solver = pulp.PULP_CBC_CMD(msg=False, timeLimit=5)
            status = prob.solve(solver)
        except Exception as solver_err:
            logger.warning(f"Preferred PULP_CBC_CMD solver execution failed, falling back to default solver: {solver_err}")
            status = prob.solve()
        
        if pulp.LpStatus[status] != "Optimal":
            logger.error("The optimization solver failed to identify a mathematically stable matrix configuration.")
            raise HTTPException(status_code=400, detail="The optimization engine could not find a valid solution within the specified constraints.")

        # 7. Collect and compile the finalized calculation metrics objects
        allocation_results = []
        total_calories = 0.0
        total_protein = 0.0
        total_carbs = 0.0
        total_fat = 0.0

        for ing_id, var in decision_variables.items():
            calculated_value = var.varValue
            if calculated_value and calculated_value > 0.001:
                gram_weight = calculated_value * 100.0
                ing_ref = ingredients_map[ing_id]
                
                allocation_results.append(ItemAllocationResult(
                    ingredientId=ing_id,
                    ingredientName=ing_ref.name,
                    allocatedGrams=round(gram_weight, 1)
                ))
                
                total_calories += calculated_value * ing_ref.calories
                total_protein += calculated_value * ing_ref.protein
                total_carbs += calculated_value * ing_ref.carbs
                total_fat += calculated_value * ing_ref.fat

        return OptimizationResponseDTO(
            status="OPTIMAL_CONVERGENCE_SUCCESS",
            allocation=allocation_results,
            totals=NutritionSummary(
                calculatedCalories=round(total_calories, 1),
                calculatedProtein=round(total_protein, 1),
                calculatedCarbs=round(total_carbs, 1),
                calculatedFat=round(total_fat, 1)
            )
        )
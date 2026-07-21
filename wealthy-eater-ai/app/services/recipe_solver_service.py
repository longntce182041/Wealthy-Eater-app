import pulp
import logging
from app.dto.recipe_optimization_dto import (
    RecipePlanRequestDTO, RecipePlanResponseDTO,
    RecipeAssignment, RecipeDTO
)
from fastapi import HTTPException

logger = logging.getLogger("recipe_optimization_engine")

MEAL_TYPE_LABELS = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "SNACK_2", "SNACK_3"]


class RecipeSolverService:
    @staticmethod
    def compute_weekly_recipe_plan(payload: RecipePlanRequestDTO) -> RecipePlanResponseDTO:
        """
        Uses Mixed-Integer Linear Programming to select exactly one recipe per meal slot
        across `days` days, minimizing deviation from daily calorie/macro targets.

        Decision variables:
          x[r][d][m] ∈ {0, 1}  — whether recipe r is assigned to day d, meal m
          scale[r][d][m] ≥ 0   — portion scale if recipe r is selected for that slot

        Constraints:
          - Exactly 1 recipe per meal slot
          - scale is bounded by x (only active if selected)
          - Daily totals close to TDEE and macro targets (via slack variables)
          - (Optional) No same recipe twice on the same day
        """
        logger.info(f"Starting recipe-based meal plan optimization: {payload.days} days × {payload.mealsPerDay} meals")

        recipes = payload.availableRecipes
        days = payload.days
        meals_per_day = payload.mealsPerDay
        meal_labels = MEAL_TYPE_LABELS[:meals_per_day]
        calorie_split = payload.mealCalorieSplit[:meals_per_day]

        # Normalize split in case it doesn't match mealsPerDay
        if len(calorie_split) < meals_per_day:
            even_split = 1.0 / meals_per_day
            calorie_split = [even_split] * meals_per_day

        if len(recipes) < meals_per_day:
            raise HTTPException(
                status_code=422,
                detail=f"Need at least {meals_per_day} recipes, but only {len(recipes)} provided."
            )

        prob = pulp.LpProblem("WeeklyRecipePlan", pulp.LpMinimize)

        # --- Decision variables ---
        # x[r][d][m] = binary: is recipe r assigned to day d, meal m?
        x = {}
        # scale[r][d][m] = continuous: portion multiplier (0.5 to 2.0 if selected)
        scale = {}

        for r_idx, recipe in enumerate(recipes):
            for d in range(days):
                for m in range(meals_per_day):
                    var_name = f"x_{r_idx}_{d}_{m}"
                    x[r_idx, d, m] = pulp.LpVariable(var_name, cat='Binary')

                    scale_name = f"s_{r_idx}_{d}_{m}"
                    scale[r_idx, d, m] = pulp.LpVariable(scale_name, lowBound=0, upBound=2.0)

        # --- Constraint 1: Exactly 1 recipe per meal slot ---
        for d in range(days):
            for m in range(meals_per_day):
                prob += pulp.lpSum(x[r_idx, d, m] for r_idx in range(len(recipes))) == 1, \
                    f"one_recipe_d{d}_m{m}"

        # --- Constraint 2: Link scale to selection (scale > 0 only if x = 1) ---
        MIN_SCALE = 0.3
        MAX_SCALE = 2.0
        for r_idx in range(len(recipes)):
            for d in range(days):
                for m in range(meals_per_day):
                    prob += scale[r_idx, d, m] >= MIN_SCALE * x[r_idx, d, m], \
                        f"scale_lb_{r_idx}_{d}_{m}"
                    prob += scale[r_idx, d, m] <= MAX_SCALE * x[r_idx, d, m], \
                        f"scale_ub_{r_idx}_{d}_{m}"

        # --- Constraint 3: No same recipe on the same day (optional) ---
        if not payload.allowRepeatSameDay:
            for r_idx in range(len(recipes)):
                for d in range(days):
                    prob += pulp.lpSum(x[r_idx, d, m] for m in range(meals_per_day)) <= 1, \
                        f"no_repeat_d{d}_r{r_idx}"

        # --- Slack variables for daily deviation ---
        daily_cal_plus = {}
        daily_cal_minus = {}
        daily_prot_plus = {}
        daily_prot_minus = {}
        daily_carb_plus = {}
        daily_carb_minus = {}
        daily_fat_plus = {}
        daily_fat_minus = {}

        for d in range(days):
            daily_cal_plus[d] = pulp.LpVariable(f"dcal_p_{d}", lowBound=0)
            daily_cal_minus[d] = pulp.LpVariable(f"dcal_m_{d}", lowBound=0)
            daily_prot_plus[d] = pulp.LpVariable(f"dprot_p_{d}", lowBound=0)
            daily_prot_minus[d] = pulp.LpVariable(f"dprot_m_{d}", lowBound=0)
            daily_carb_plus[d] = pulp.LpVariable(f"dcarb_p_{d}", lowBound=0)
            daily_carb_minus[d] = pulp.LpVariable(f"dcarb_m_{d}", lowBound=0)
            daily_fat_plus[d] = pulp.LpVariable(f"dfat_p_{d}", lowBound=0)
            daily_fat_minus[d] = pulp.LpVariable(f"dfat_m_{d}", lowBound=0)

        # --- Constraint 4: Daily nutrition = target ± slack ---
        for d in range(days):
            daily_cal_expr = pulp.lpSum(
                scale[r_idx, d, m] * recipes[r_idx].totalCalories
                for r_idx in range(len(recipes))
                for m in range(meals_per_day)
            )
            prob += daily_cal_expr + daily_cal_minus[d] - daily_cal_plus[d] == payload.targetCalories, \
                f"daily_cal_{d}"

            daily_prot_expr = pulp.lpSum(
                scale[r_idx, d, m] * recipes[r_idx].totalProtein
                for r_idx in range(len(recipes))
                for m in range(meals_per_day)
            )
            prob += daily_prot_expr + daily_prot_minus[d] - daily_prot_plus[d] == payload.targetProtein, \
                f"daily_prot_{d}"

            daily_carb_expr = pulp.lpSum(
                scale[r_idx, d, m] * recipes[r_idx].totalCarbs
                for r_idx in range(len(recipes))
                for m in range(meals_per_day)
            )
            prob += daily_carb_expr + daily_carb_minus[d] - daily_carb_plus[d] == payload.targetCarbs, \
                f"daily_carb_{d}"

            daily_fat_expr = pulp.lpSum(
                scale[r_idx, d, m] * recipes[r_idx].totalFat
                for r_idx in range(len(recipes))
                for m in range(meals_per_day)
            )
            prob += daily_fat_expr + daily_fat_minus[d] - daily_fat_plus[d] == payload.targetFat, \
                f"daily_fat_{d}"

        # --- Objective: Minimize total daily deviations ---
        prob += pulp.lpSum(
            1.0 * (daily_cal_plus[d] + daily_cal_minus[d]) +
            15.0 * (daily_prot_plus[d] + daily_prot_minus[d]) +
            15.0 * (daily_carb_plus[d] + daily_carb_minus[d]) +
            15.0 * (daily_fat_plus[d] + daily_fat_minus[d])
            for d in range(days)
        ), "Total_Weekly_Deviation"

        # --- Solve ---
        try:
            solver = pulp.PULP_CBC_CMD(msg=False, timeLimit=30)
            status = prob.solve(solver)
        except Exception as e:
            logger.warning(f"CBC solver failed, trying default: {e}")
            status = prob.solve()

        if pulp.LpStatus[status] != "Optimal":
            logger.error(f"Solver status: {pulp.LpStatus[status]}")
            raise HTTPException(
                status_code=400,
                detail="Could not find an optimal recipe assignment. Try adding more recipes or relaxing constraints."
            )

        # --- Extract results ---
        assignments = []
        daily_summaries = []

        for d in range(days):
            day_cal = 0.0
            day_prot = 0.0
            day_carb = 0.0
            day_fat = 0.0

            for m in range(meals_per_day):
                for r_idx, recipe in enumerate(recipes):
                    if x[r_idx, d, m].varValue and x[r_idx, d, m].varValue > 0.5:
                        s = scale[r_idx, d, m].varValue or 1.0
                        scaled_cal = round(recipe.totalCalories * s, 1)
                        scaled_prot = round(recipe.totalProtein * s, 1)
                        scaled_carb = round(recipe.totalCarbs * s, 1)
                        scaled_fat = round(recipe.totalFat * s, 1)
                        scaled_weight = round(recipe.baseWeight * s, 1)

                        assignments.append(RecipeAssignment(
                            recipeId=recipe.id,
                            recipeName=recipe.name,
                            dayOfWeek=d + 1,
                            mealType=meal_labels[m],
                            portionScale=round(s, 3),
                            scaledCalories=scaled_cal,
                            scaledProtein=scaled_prot,
                            scaledCarbs=scaled_carb,
                            scaledFat=scaled_fat,
                            scaledWeight=scaled_weight,
                        ))

                        day_cal += scaled_cal
                        day_prot += scaled_prot
                        day_carb += scaled_carb
                        day_fat += scaled_fat
                        break  # Only 1 recipe per slot

            daily_summaries.append({
                "day": d + 1,
                "totalCalories": round(day_cal, 1),
                "totalProtein": round(day_prot, 1),
                "totalCarbs": round(day_carb, 1),
                "totalFat": round(day_fat, 1),
            })

        logger.info(f"Recipe plan solved: {len(assignments)} assignments across {days} days")

        return RecipePlanResponseDTO(
            status="OPTIMAL_RECIPE_PLAN_SUCCESS",
            assignments=assignments,
            dailySummaries=daily_summaries,
        )

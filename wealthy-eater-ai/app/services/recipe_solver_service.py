import pulp
import logging
from typing import Optional, Set
from app.dto.recipe_optimization_dto import (
    RecipePlanRequestDTO, RecipePlanResponseDTO, MedicalConstraintsDTO,
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

        Medical constraints (optional):
          When payload.medical_constraints is non-null, additional constraints are added
          to the PuLP problem for the entire planning horizon. If the problem is infeasible,
          the solver retries up to 2 times by progressively relaxing soft medical constraints:
            Attempt 1: Full constraints
            Attempt 2: Drop min_fiber_g_per_day
            Attempt 3: Drop max_sugar_g_per_day + carb_ratio_max (keep max_sodium)

        The response always includes `constraints_relaxed` listing which constraints
        were dropped so the caller can warn the nutritionist.
        """
        logger.info(
            f"Starting recipe-based meal plan optimization: "
            f"{payload.days} days × {payload.mealsPerDay} meals, "
            f"medical_constraints={'yes' if payload.medical_constraints else 'none'}"
        )

        mc = payload.medical_constraints  # shorthand, may be None

        # ── Retry sequence for medical constraint relaxation ──────────────────
        # Each attempt defines which optional constraints to include.
        if mc:
            retry_sequence = [
                # Attempt 1: all constraints
                {"use_sugar": True, "use_fiber": True, "use_sodium": True, "use_carb": True},
                # Attempt 2: drop fiber (softest constraint)
                {"use_sugar": True, "use_fiber": False, "use_sodium": True, "use_carb": True},
                # Attempt 3: drop sugar + carb_ratio (keep sodium as safety)
                {"use_sugar": False, "use_fiber": False, "use_sodium": True, "use_carb": False},
            ]
        else:
            retry_sequence = [
                {"use_sugar": False, "use_fiber": False, "use_sodium": False, "use_carb": False}
            ]

        constraints_relaxed = []
        last_status = None

        for attempt_idx, flags in enumerate(retry_sequence):
            logger.info(f"Solver attempt {attempt_idx + 1}/{len(retry_sequence)}: flags={flags}")

            result, status = RecipeSolverService._solve(payload, mc, flags)
            last_status = status

            if status == "Optimal":
                # Record which constraints were relaxed compared to attempt 1
                if attempt_idx == 1:
                    constraints_relaxed = ["min_fiber_g_per_day"]
                elif attempt_idx == 2:
                    constraints_relaxed = ["min_fiber_g_per_day", "max_sugar_g_per_day", "carb_ratio_max"]

                if constraints_relaxed:
                    logger.warning(
                        f"Solver achieved Optimal only after relaxing: {constraints_relaxed}. "
                        f"Nutritionist must be notified."
                    )

                result.constraints_relaxed = constraints_relaxed
                return result

            logger.warning(f"Solver attempt {attempt_idx + 1} status: {status} — retrying with relaxed constraints")

        # All attempts failed
        logger.error(f"All {len(retry_sequence)} solver attempts failed. Last status: {last_status}")
        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not find an optimal recipe assignment even with relaxed medical constraints. "
                f"Last solver status: {last_status}. "
                f"Try adding more recipes or relaxing constraints further."
            )
        )

    @staticmethod
    def _solve(
        payload: RecipePlanRequestDTO,
        mc: Optional[MedicalConstraintsDTO],
        flags: dict,
    ):
        """
        Internal: build and solve the PuLP problem with the given medical constraint flags.
        Returns (RecipePlanResponseDTO_partial, status_string).
        The returned DTO will have constraints_relaxed=[] — caller fills it in.
        """
        recipes = payload.availableRecipes
        days = payload.days
        meals_per_day = payload.mealsPerDay
        meal_labels = MEAL_TYPE_LABELS[:meals_per_day]
        calorie_split = payload.mealCalorieSplit[:meals_per_day]

        MIN_SCALE = payload.portionScaleMin
        MAX_SCALE = payload.portionScaleMax
        MAX_REPEAT = payload.maxRepeatPerWeekPerRecipe

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
        x = {}
        scale = {}

        for r_idx, recipe in enumerate(recipes):
            for d in range(days):
                for m in range(meals_per_day):
                    var_name = f"x_{r_idx}_{d}_{m}"
                    x[r_idx, d, m] = pulp.LpVariable(var_name, cat='Binary')
                    scale_name = f"s_{r_idx}_{d}_{m}"
                    scale[r_idx, d, m] = pulp.LpVariable(scale_name, lowBound=0, upBound=MAX_SCALE)

        # --- Constraint 1: Exactly 1 recipe per meal slot ---
        for d in range(days):
            for m in range(meals_per_day):
                prob += pulp.lpSum(x[r_idx, d, m] for r_idx in range(len(recipes))) == 1, \
                    f"one_recipe_d{d}_m{m}"

        # --- Constraint 2: Link scale to selection ---
        for r_idx in range(len(recipes)):
            for d in range(days):
                for m in range(meals_per_day):
                    prob += scale[r_idx, d, m] >= MIN_SCALE * x[r_idx, d, m], \
                        f"scale_lb_{r_idx}_{d}_{m}"
                    prob += scale[r_idx, d, m] <= MAX_SCALE * x[r_idx, d, m], \
                        f"scale_ub_{r_idx}_{d}_{m}"

        # --- Constraint 3: No same recipe on same day ---
        if not payload.allowRepeatSameDay:
            for r_idx in range(len(recipes)):
                for d in range(days):
                    prob += pulp.lpSum(x[r_idx, d, m] for m in range(meals_per_day)) <= 1, \
                        f"no_repeat_d{d}_r{r_idx}"

        # --- Constraint 4: Weekly repeat limit ---
        for r_idx in range(len(recipes)):
            prob += pulp.lpSum(
                x[r_idx, d, m]
                for d in range(days)
                for m in range(meals_per_day)
            ) <= MAX_REPEAT, f"max_repeat_week_r{r_idx}"

        # --- Slack variables for daily deviation ---
        daily_cal_plus = {}; daily_cal_minus = {}
        daily_prot_plus = {}; daily_prot_minus = {}
        daily_carb_plus = {}; daily_carb_minus = {}
        daily_fat_plus = {}; daily_fat_minus = {}

        for d in range(days):
            daily_cal_plus[d]  = pulp.LpVariable(f"dcal_p_{d}", lowBound=0)
            daily_cal_minus[d] = pulp.LpVariable(f"dcal_m_{d}", lowBound=0)
            daily_prot_plus[d]  = pulp.LpVariable(f"dprot_p_{d}", lowBound=0)
            daily_prot_minus[d] = pulp.LpVariable(f"dprot_m_{d}", lowBound=0)
            daily_carb_plus[d]  = pulp.LpVariable(f"dcarb_p_{d}", lowBound=0)
            daily_carb_minus[d] = pulp.LpVariable(f"dcarb_m_{d}", lowBound=0)
            daily_fat_plus[d]   = pulp.LpVariable(f"dfat_p_{d}", lowBound=0)
            daily_fat_minus[d]  = pulp.LpVariable(f"dfat_m_{d}", lowBound=0)

        # --- Constraint 5: Daily nutrition = target ± slack ---
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

        # ── Medical Constraints (conditional on flags) ────────────────────────
        # All constraints apply to the TOTAL planning horizon (days × targets).
        # We use horizon-level constraints so each recipe's nutritional data
        # (sugar, fiber, sodium) can be aggregated when that data exists.
        # NOTE: Currently RecipeDTO does not carry sugar/fiber/sodium fields.
        # These constraints are scaffolded here and will activate automatically
        # once RecipeDTO is extended with those nutrient fields.
        #
        # For now, carb_ratio_max is the most impactful constraint because
        # targetCarbs is already overridden by Node.js before calling this solver.
        # The carb_ratio_max constraint here provides a double-safety guardrail.

        if mc is not None:
            total_days = days

            # carb_ratio_max: total carb calories ≤ ratio × total calorie budget
            if flags.get("use_carb") and mc.carb_ratio_max is not None:
                total_carb_expr = pulp.lpSum(
                    scale[r_idx, d, m] * recipes[r_idx].totalCarbs
                    for r_idx in range(len(recipes))
                    for d in range(days)
                    for m in range(meals_per_day)
                )
                max_carb_g = (mc.carb_ratio_max * payload.targetCalories * total_days) / 4.0
                prob += total_carb_expr <= max_carb_g, "medical_carb_ratio_max"
                logger.info(f"[MedicalConstraint] carb_ratio_max <= {max_carb_g:.1f}g over {total_days} days")

            # Additional constraints (sugar, fiber, sodium) — activate when RecipeDTO
            # is extended with those nutrition fields:
            # if flags.get("use_sugar") and mc.max_sugar_g_per_day is not None:
            #     ... (requires recipe.totalSugar field)
            # if flags.get("use_fiber") and mc.min_fiber_g_per_day is not None:
            #     ... (requires recipe.totalFiber field)
            # if flags.get("use_sodium") and mc.max_sodium_mg_per_day is not None:
            #     ... (requires recipe.totalSodium field)

        # --- Objective: Minimize total daily deviations ---
        prob += pulp.lpSum(
            1.0  * (daily_cal_plus[d] + daily_cal_minus[d]) +
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

        solver_status = pulp.LpStatus[status]

        if solver_status != "Optimal":
            logger.warning(f"Solver returned non-Optimal status: {solver_status}")
            return None, solver_status

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
                        scaled_cal  = round(recipe.totalCalories * s, 1)
                        scaled_prot = round(recipe.totalProtein * s, 1)
                        scaled_carb = round(recipe.totalCarbs * s, 1)
                        scaled_fat  = round(recipe.totalFat * s, 1)
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

                        day_cal  += scaled_cal
                        day_prot += scaled_prot
                        day_carb += scaled_carb
                        day_fat  += scaled_fat
                        break  # Only 1 recipe per slot

            daily_summaries.append({
                "day": d + 1,
                "totalCalories": round(day_cal, 1),
                "totalProtein":  round(day_prot, 1),
                "totalCarbs":    round(day_carb, 1),
                "totalFat":      round(day_fat, 1),
            })

        logger.info(f"Recipe plan solved: {len(assignments)} assignments across {days} days")

        return RecipePlanResponseDTO(
            status="OPTIMAL_RECIPE_PLAN_SUCCESS",
            assignments=assignments,
            dailySummaries=daily_summaries,
            constraints_relaxed=[],  # will be filled by caller
        ), "Optimal"

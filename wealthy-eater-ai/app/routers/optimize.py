from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import pulp

router = APIRouter()

class DietOptimizationRequest(BaseModel):
    target_calories: float
    target_protein: float
    target_carbs: float
    target_fat: float
    allergy_exclusions: List[str]
    available_ingredients: List[Dict]

@router.post("/api/v1/ai/optimize")
def calculate_optimal_diet_weights(request: DietOptimizationRequest):
    # Initialize a deterministic minimization linear programming problem logic loop
    prob = pulp.LpProblem("Diet_Optimization_Problem", pulp.LpMinimize)
    
    # Instantiate selection variables boundaries matching input ingredient components
    ingredient_vars = {}
    # Build a map for ingredient lookup and create variables, skipping exclusions
    ing_map = {ing['id']: ing for ing in request.available_ingredients}
    for ing_id, ing in ing_map.items():
        if ing_id in request.allergy_exclusions:
            continue  # Filter out allergy parameters safely before calculation
        # Define constraints variable tracking gram boundaries weight limit inputs
        ingredient_vars[ing_id] = pulp.LpVariable(f"ing_{ing_id}", lowBound=0, upBound=500)

    # Core mathematical goal equation sequence setup (Minimize weight or cost deviation)
    prob += pulp.lpSum([ingredient_vars[i] for i in ingredient_vars]), "Total_Mass"

    # Enforce flexible macronutrient boundary constraint limits over the system solution matrix
    # Calorie target constraint (within +/- 5% tolerance or exact)
    prob += pulp.lpSum([ingredient_vars[i] * (ing_map[i].get('calories', 0)/100) for i in ingredient_vars]) >= request.target_calories * 0.95
    prob += pulp.lpSum([ingredient_vars[i] * (ing_map[i].get('calories', 0)/100) for i in ingredient_vars]) <= request.target_calories * 1.05

    # Optional macro target bounds (+/- 20% range) if specified
    if request.target_protein > 0:
        prob += pulp.lpSum([ingredient_vars[i] * (ing_map[i].get('protein', 0)/100) for i in ingredient_vars]) >= request.target_protein * 0.8
        prob += pulp.lpSum([ingredient_vars[i] * (ing_map[i].get('protein', 0)/100) for i in ingredient_vars]) <= request.target_protein * 1.2

    if request.target_carbs > 0:
        prob += pulp.lpSum([ingredient_vars[i] * (ing_map[i].get('carbs', 0)/100) for i in ingredient_vars]) >= request.target_carbs * 0.8
        prob += pulp.lpSum([ingredient_vars[i] * (ing_map[i].get('carbs', 0)/100) for i in ingredient_vars]) <= request.target_carbs * 1.2

    if request.target_fat > 0:
        prob += pulp.lpSum([ingredient_vars[i] * (ing_map[i].get('fat', 0)/100) for i in ingredient_vars]) >= request.target_fat * 0.8
        prob += pulp.lpSum([ingredient_vars[i] * (ing_map[i].get('fat', 0)/100) for i in ingredient_vars]) <= request.target_fat * 1.2

    status = prob.solve()
    if pulp.LpStatus[prob.status] != "Optimal":
        # Fallback: solve with calories constraint only if macros constraint was too tight
        prob2 = pulp.LpProblem("Diet_Optimization_Problem_Fallback", pulp.LpMinimize)
        ing_vars2 = {i: pulp.LpVariable(f"ing2_{i}", lowBound=0, upBound=500) for i in ingredient_vars}
        prob2 += pulp.lpSum([ing_vars2[i] for i in ing_vars2])
        prob2 += pulp.lpSum([ing_vars2[i] * (ing_map[i].get('calories', 0)/100) for i in ing_vars2]) == request.target_calories
        status2 = prob2.solve()
        if pulp.LpStatus[prob2.status] == "Optimal":
            return {ing_id: ing_vars2[ing_id].varValue for ing_id in ing_vars2}
        raise HTTPException(status_code=400, detail="LP Solver could not converge over specific mathematical bounds.")
        
    return {ing_id: ingredient_vars[ing_id].varValue for ing_id in ingredient_vars}
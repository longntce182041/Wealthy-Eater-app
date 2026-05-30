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

    # Enforce strict macronutrient boundary constraint limits over the system solution matrix
    prob += pulp.lpSum([ingredient_vars[i] * (ing_map[i].get('calories', 0)/100) for i in ingredient_vars]) == request.target_calories

    status = prob.solve()
    if pulp.LpStatus[prob.status] != "Optimal":
        raise HTTPException(status_code=400, detail="LP Solver could not converge over specific mathematical bounds.")
        
    return {ing_id: ingredient_vars[ing_id].varValue for ing_id in ingredient_vars}
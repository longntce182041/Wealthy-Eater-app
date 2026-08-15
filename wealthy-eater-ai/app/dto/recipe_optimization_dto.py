from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class MedicalConstraintsDTO(BaseModel):
    """
    Optional nutrient constraints derived from a user's medical condition.
    All fields are optional — only non-None values are enforced by the solver.
    When null (no medical condition), the solver runs without additional constraints.
    """
    max_sugar_g_per_day:    Optional[float] = Field(None, ge=0, description="Max sugar grams per day")
    max_glycemic_index_avg: Optional[float] = Field(None, ge=0, le=200, description="Max average glycemic index")
    min_fiber_g_per_day:    Optional[float] = Field(None, ge=0, description="Min fiber grams per day")
    carb_ratio_max:         Optional[float] = Field(None, ge=0, le=1, description="Max fraction of calories from carbs (0-1)")
    max_sodium_mg_per_day:  Optional[float] = Field(None, ge=0, description="Max sodium mg per day")
    max_purine:             Optional[bool]  = Field(None, description="Whether to enforce purine restriction")

class RecipeDTO(BaseModel):
    """Represents a single recipe with its pre-computed total nutrition."""
    id: str = Field(..., examples=["recipe_abc123"])
    name: str = Field(..., examples=["Grilled Chicken Salad"])
    totalCalories: float = Field(..., ge=0, description="Total calories for the base serving")
    totalProtein: float = Field(..., ge=0, description="Total protein (g) for the base serving")
    totalCarbs: float = Field(..., ge=0, description="Total carbs (g) for the base serving")
    totalFat: float = Field(..., ge=0, description="Total fat (g) for the base serving")
    baseWeight: float = Field(..., gt=0, description="Base weight in grams for the recipe")

class RecipePlanRequestDTO(BaseModel):
    """Input for the recipe-based weekly meal plan optimizer."""
    targetCalories: float = Field(..., gt=0, examples=[2000.0], description="Daily calorie target (after health_goal multiplier)")
    targetProtein: float = Field(..., gt=0, examples=[140.0])
    targetCarbs: float = Field(..., gt=0, examples=[200.0])
    targetFat: float = Field(..., gt=0, examples=[65.0])
    days: int = Field(7, ge=1, le=14, description="Number of days in the meal plan")
    mealsPerDay: int = Field(3, ge=1, le=6, description="Number of meals per day")
    mealCalorieSplit: List[float] = Field(
        default=[0.25, 0.40, 0.35],
        description="Fraction of daily calories per meal slot (must sum to ~1.0)"
    )
    allowRepeatSameDay: bool = Field(False, description="Allow the same recipe in multiple meals on the same day")
    maxRepeatPerWeekPerRecipe: int = Field(2, ge=1, description="Max times a recipe can appear across the entire week")
    portionScaleMin: float = Field(0.6, ge=0.1, description="Minimum portion scale multiplier (business rule: 0.6)")
    portionScaleMax: float = Field(1.8, le=3.0, description="Maximum portion scale multiplier (business rule: 1.8)")
    availableRecipes: List[RecipeDTO]
    # Optional medical constraints — null means no medical condition (no extra solver constraints)
    medical_constraints: Optional[MedicalConstraintsDTO] = Field(
        None,
        description="Nutrient constraints from user's medical condition. Null = no additional constraints."
    )

    @field_validator('availableRecipes')
    def validate_recipes_not_empty(cls, v):
        if len(v) == 0:
            raise ValueError("Available recipes list cannot be empty.")
        return v

    @field_validator('mealCalorieSplit')
    def validate_split_sums_to_one(cls, v):
        total = sum(v)
        if abs(total - 1.0) > 0.05:
            raise ValueError(f"mealCalorieSplit must sum to ~1.0, got {total}")
        return v

class RecipeAssignment(BaseModel):
    """A single recipe assignment to a specific day and meal slot."""
    recipeId: str
    recipeName: str
    dayOfWeek: int = Field(..., ge=1, le=14, description="Day number (1-based)")
    mealType: str = Field(..., description="BREAKFAST, LUNCH, or DINNER")
    portionScale: float = Field(..., gt=0, description="Multiplier relative to base serving")
    scaledCalories: float
    scaledProtein: float
    scaledCarbs: float
    scaledFat: float
    scaledWeight: float

class RecipePlanResponseDTO(BaseModel):
    """Output from the recipe-based weekly meal plan optimizer."""
    status: str
    assignments: List[RecipeAssignment]
    dailySummaries: List[dict]
    # Which medical constraints were relaxed to achieve Optimal status.
    # Empty list = all constraints satisfied (or no medical constraints applied).
    constraints_relaxed: List[str] = Field(default_factory=list)

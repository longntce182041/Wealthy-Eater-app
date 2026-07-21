from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

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
    targetCalories: float = Field(..., gt=0, examples=[2000.0], description="Daily TDEE target")
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
    availableRecipes: List[RecipeDTO]

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

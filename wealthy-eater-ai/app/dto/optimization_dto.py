from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

class IngredientDTO(BaseModel):
    id: str = Field(..., example="ing_chicken_id")
    name: str = Field(..., example="Chicken Breast")
    calories: float = Field(..., gt=0, description="Calories per 100g")
    protein: float = Field(..., ge=0, description="Protein grams per 100g")
    carbs: float = Field(..., ge=0, description="Carbs grams per 100g")
    fat: float = Field(..., ge=0, description="Fat grams per 100g")
    allergenTags: List[str] = Field(default_factory=list, description="Allergen tags for filtering")
    minLimitGram: float = Field(0.0, ge=0)
    maxLimitGram: float = Field(350.0, gt=0)

    @model_validator(mode='after')
    def validate_gram_bounds(self):
        if self.maxLimitGram < self.minLimitGram:
            raise ValueError("maxLimitGram must be greater than or equal to minLimitGram.")
        return self

class OptimizationRequestDTO(BaseModel):
    targetCalories: float = Field(..., gt=0, example=2000.0)
    targetProtein: float = Field(..., gt=0, example=150.0)
    targetCarbs: float = Field(..., gt=0, example=180.0)
    targetFat: float = Field(..., gt=0, example=65.0)
    allergiesExclusions: List[str] = Field(default_factory=list, example=["peanut"])
    dietType: str = Field(..., example="LOW_CARB")
    minVarietyItems: int = Field(0, ge=0, description="Minimum count of selected ingredients")
    maxVarietyItems: int | None = Field(None, gt=0, description="Maximum count of selected ingredients")
    activationGramThreshold: float = Field(1.0, gt=0, description="Minimum grams to consider an ingredient selected")
    availableIngredients: List[IngredientDTO]

    @field_validator('availableIngredients')
    def validate_ingredients_not_empty(cls, v):
        if len(v) == 0:
            raise ValueError("The available ingredients repository matrix cannot be empty.")
        return v

    @model_validator(mode='after')
    def validate_variety_bounds(self):
        if self.maxVarietyItems is not None and self.maxVarietyItems < self.minVarietyItems:
            raise ValueError("maxVarietyItems must be greater than or equal to minVarietyItems.")
        return self

class ItemAllocationResult(BaseModel):
    ingredientId: str
    ingredientName: str
    allocatedGrams: float

class NutritionSummary(BaseModel):
    calculatedCalories: float
    calculatedProtein: float
    calculatedCarbs: float
    calculatedFat: float

class OptimizationResponseDTO(BaseModel):
    status: str
    allocation: List[ItemAllocationResult]
    totals: NutritionSummary
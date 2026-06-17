def get_recipe_recommendation(health_goal: str, calories_target: int, allergies: list[str]) -> list[dict]:
    """
    Search the database for recipe recommendations based on the user's health goal, calorie target, and allergies.
    
    Args:
        health_goal: The user's health goal (e.g., 'Weight Loss', 'Muscle Gain', 'Maintenance').
        calories_target: The target calories per meal.
        allergies: A list of ingredients the user is allergic to.
        
    Returns:
        A list of recommended recipes.
    """
    # Mock implementation for now. In a real system, this would query the Node.js backend or the DB directly.
    return [
        {
            "recipe_name": "Grilled Chicken Salad",
            "calories": 400,
            "protein": 35,
            "carbs": 15,
            "fat": 12,
            "ingredients": ["chicken breast", "lettuce", "tomatoes", "cucumbers", "olive oil"]
        },
        {
            "recipe_name": "Salmon and Quinoa",
            "calories": 550,
            "protein": 40,
            "carbs": 45,
            "fat": 18,
            "ingredients": ["salmon fillet", "quinoa", "asparagus", "lemon"]
        }
    ]

def calculate_bmi_category(bmi: float) -> str:
    """
    Calculate the BMI category based on the BMI value.
    
    Args:
        bmi: The user's Body Mass Index.
        
    Returns:
        The BMI category (e.g., 'Underweight', 'Normal weight', 'Overweight', 'Obesity').
    """
    if bmi < 18.5:
        return "Underweight"
    elif 18.5 <= bmi < 24.9:
        return "Normal weight"
    elif 25 <= bmi < 29.9:
        return "Overweight"
    else:
        return "Obesity"

# List of tools to pass to Gemini
chatbot_tools = [get_recipe_recommendation, calculate_bmi_category]

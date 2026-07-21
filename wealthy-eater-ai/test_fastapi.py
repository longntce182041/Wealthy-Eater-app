import urllib.request
import json
import traceback

try:
    data = json.dumps({
        'targetCalories': 2000, 
        'targetProtein': 140, 
        'targetCarbs': 200, 
        'targetFat': 65, 
        'days': 7, 
        'mealsPerDay': 3, 
        'mealCalorieSplit': [0.25, 0.40, 0.35], 
        'allowRepeatSameDay': False, 
        'availableRecipes': [
            {'id':'1','name':'r1','totalCalories':500,'totalProtein':30,'totalCarbs':50,'totalFat':20,'baseWeight':300}, 
            {'id':'2','name':'r2','totalCalories':400,'totalProtein':40,'totalCarbs':30,'totalFat':15,'baseWeight':250}, 
            {'id':'3','name':'r3','totalCalories':600,'totalProtein':20,'totalCarbs':80,'totalFat':25,'baseWeight':400}, 
            {'id':'4','name':'r4','totalCalories':550,'totalProtein':35,'totalCarbs':45,'totalFat':20,'baseWeight':300}
        ]
    }).encode('utf-8')
    req = urllib.request.Request(
        'http://localhost:8000/api/v1/ai/compute-recipe-plan', 
        data=data, 
        headers={'Content-Type': 'application/json', 'X-INTERNAL-SECRET': '9a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a'}
    )
    print("Sending request to FastAPI...")
    res = urllib.request.urlopen(req)
    print("Response Code:", res.getcode())
    print("Response Body:", res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    traceback.print_exc()

{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "match-meal-plan-template",
        "responseMode": "responseNode",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        0,
        16
      ],
      "id": "56b7daf5-41fa-4bea-b1be-66842f630587",
      "name": "Webhook",
      "webhookId": "55210ba0-54d0-4fc7-85ad-309dcf8c38b0"
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "b6321dec-90c4-4c47-b756-baba0bec2812",
              "name": "clientId",
              "value": "={{$json[\"body\"][\"clientId\"]}}",
              "type": "string"
            },
            {
              "id": "86cdb6dd-427a-45ca-bd8f-b43bf23e4a99",
              "name": "tdee",
              "value": "={{parseInt($json[\"body\"][\"tdee\"])}}",
              "type": "number"
            },
            {
              "id": "97b33e3e-c437-496c-9ddd-bda54772f38a",
              "name": "dietaryPreference",
              "value": "={{$json[\"body\"][\"dietaryPreference\"]}}",
              "type": "string"
            },
            {
              "id": "fa1d490f-0683-4df3-a535-69aed065f5af",
              "name": "allergies",
              "value": "={{$json.body.allergies ?? []}}",
              "type": "array"
            },
            {
              "id": "bb91752c-6933-49f4-9c61-893d0634e917",
              "name": "medicalConditions",
              "value": "={{$json.body.medicalConditions ?? []}}",
              "type": "array"
            },
            {
              "id": "1af9996a-04e9-4264-8812-96a8a8797471",
              "name": "",
              "value": "",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": true,
        "options": {}
      },
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        208,
        16
      ],
      "id": "0f4402fc-5440-4879-a6a1-93ac5e27249e",
      "name": "Edit Fields"
    },
    {
      "parameters": {
        "collection": "mealplantemplates",
        "options": {},
        "query": "={\n  \"isActive\": true,\n  \"dietaryPreference\": \"{{$json.dietaryPreference}}\"\n}"
      },
      "type": "n8n-nodes-base.mongoDb",
      "typeVersion": 1.3,
      "position": [
        656,
        -64
      ],
      "id": "bac5063c-a082-4eab-a930-280f7223562f",
      "name": "Find documents",
      "credentials": {
        "mongoDb": {
          "id": "Zghyt3NlT8HiuKH2",
          "name": "MongoDB account"
        }
      },
      "onError": "continueRegularOutput"
    },
    {
      "parameters": {
        "jsCode": "// Lấy dữ liệu từ Edit Fields node\nconst clientPrefs = $('Edit Fields').first().json;\nconst targetTdee = clientPrefs.tdee;\nconst allergiesList = clientPrefs.allergies || [];\nconst medicalConditionsList = clientPrefs.medicalConditions || [];\n\n// Lấy templates từ MongoDB node\nconst rawTemplates = $input.all();\nlet bestCandidate = null;\nlet minimalCalorieVariance = Infinity;\n\nfor (const entry of rawTemplates) {\n    const template = entry.json;\n    \n    // 1. Kiểm tra TDEE range\n    if (targetTdee < template.minTDEE || targetTdee > template.maxTDEE) {\n        continue;\n    }\n    \n    // 2. Kiểm tra allergens\n    let containsAllergen = false;\n    if (template.excludedAllergies && template.excludedAllergies.length > 0) {\n        for (const allergen of allergiesList) {\n            if (template.excludedAllergies.includes(allergen)) {\n                containsAllergen = true;\n                break;\n            }\n        }\n    }\n    if (containsAllergen) continue;\n    \n    // 3. Kiểm tra medical conditions\n    let containsMedicalConflict = false;\n    if (template.medicalConditionTags && template.medicalConditionTags.length > 0) {\n        for (const condition of medicalConditionsList) {\n            if (template.medicalConditionTags.includes(condition)) {\n                containsMedicalConflict = true;\n                break;\n            }\n        }\n    }\n    if (containsMedicalConflict) continue;\n\n    // 4. Chọn template có calorie gần TDEE nhất\n    const currentVariance = Math.abs(template.totalCalories - targetTdee);\n    if (currentVariance < minimalCalorieVariance) {\n        minimalCalorieVariance = currentVariance;\n        bestCandidate = template;\n    }\n}\n\n// 5. Trả về kết quả\nif (bestCandidate) {\n    return [{ json: { candidateFound: true, matchedTemplate: bestCandidate } }];\n} else {\n    return [{ json: { candidateFound: false, reason: \"No matching template found.\" } }];\n}"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        928,
        -64
      ],
      "id": "6f1feb90-ec3a-4fd5-84ba-5d207006c219",
      "name": "Code in JavaScript"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 3
          },
          "conditions": [
            {
              "id": "4b245055-39ee-4104-81f3-62c2e658452d",
              "leftValue": "={{$json.tdee}}",
              "rightValue": 0,
              "operator": {
                "type": "number",
                "operation": "gt"
              }
            },
            {
              "id": "2d3318e2-5017-4ac4-8ce0-8c4f182852f2",
              "leftValue": "={{$json.clientId}}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "notEmpty",
                "singleValue": true
              }
            },
            {
              "id": "301c85d0-8af7-4964-805d-8e7344a0dccf",
              "leftValue": "={{$json.dietaryPreference}}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "notEmpty",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.3,
      "position": [
        416,
        48
      ],
      "id": "938dd278-9c78-4ecf-8717-e13b25e12f9f",
      "name": "If"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "{\n   \"success\": false,\n  \"message\": \"Invalid input. clientId, tdee, and dietaryPreference are required.\"\n}",
        "options": {
          "responseCode": 400
        }
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [
        656,
        144
      ],
      "id": "e1a669e5-f063-4cff-891d-e73390348241",
      "name": "Respond to Webhook"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "loose",
            "version": 3
          },
          "conditions": [
            {
              "id": "58688332-a0b7-4547-8802-2fcd38095b2c",
              "leftValue": "={{$json.candidateFound}}",
              "rightValue": true,
              "operator": {
                "type": "boolean",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "looseTypeValidation": true,
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.3,
      "position": [
        1136,
        -64
      ],
      "id": "f1151db3-825f-4f9e-981c-da2eb3b03d99",
      "name": "If1"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{({\n  cacheHit: true,\n  cacheMiss: false,\n  templateId: $json.matchedTemplate._id,\n  matchedTemplate: $json.matchedTemplate\n})}}",
        "options": {
          "responseCode": 200
        }
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [
        1408,
        -160
      ],
      "id": "0e4ddc34-29e3-494d-b135-2a99029431d1",
      "name": "Respond to Webhook1"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://host.docker.internal:8000/api/v1/ai/compute-diet",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-INTERNAL-SECRET",
              "value": "9a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{\n  JSON.stringify({\n    targetCalories: $('Edit Fields').first().json.tdee,\n    targetProtein: 140,\n    targetCarbs: 200,\n    targetFat: 65,\n    allergiesExclusions: $('Edit Fields').first().json.allergies || [],\n    dietType: $('Edit Fields').first().json.dietaryPreference,\n    minVarietyItems: 0,\n    maxVarietyItems: null,\n    activationGramThreshold: 1.0,\n    availableIngredients: $input.all().map(item => ({\n      id: item.json._id?.toString() || '',\n      name: item.json.name || '',\n      calories: item.json.calories_per_unit ?? 0,\n      protein: item.json.protein ?? 0,\n      carbs: item.json.carbs ?? 0,\n      fat: item.json.fat ?? 0,\n      allergenTags: [],\n      minLimitGram: 0,\n      maxLimitGram: 350\n    })).filter(ing => ing.id && ing.name && ing.calories > 0)\n  })\n}}",
        "options": {}
      },
      "id": "7c15a12b-6c49-4dc9-9843-263a5e55d77e",
      "name": "Invoke FastAPI Optimization Service1",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        1600,
        128
      ],
      "alwaysOutputData": false,
      "retryOnFail": false
    },
    {
      "parameters": {
        "collection": "ingredients",
        "options": {},
        "query": "={{ JSON.stringify({ calories_per_unit: { $gt: 0 } }) }}"
      },
      "type": "n8n-nodes-base.mongoDb",
      "typeVersion": 1.3,
      "position": [
        1360,
        96
      ],
      "id": "7d6b038a-70e5-41ca-980a-ca094a7228c8",
      "name": "Load Ingredients",
      "alwaysOutputData": false,
      "credentials": {
        "mongoDb": {
          "id": "Zghyt3NlT8HiuKH2",
          "name": "MongoDB account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "// UC-39: Transform LP solver allocation results into Gemini-friendly prompt\nconst fastapiResult = $input.first().json;\nconst editFields = $('Edit Fields').first().json;\n\nconst allocation = fastapiResult.allocation || [];\nconst totals = fastapiResult.totals || {};\n\n// Build human-readable ingredient summary for Gemini prompt\nconst ingredientSummary = allocation\n  .map(item => `${Math.round(item.allocatedGrams)}g ${item.ingredientName}`)\n  .join(', ');\n\nreturn [{\n  json: {\n    clientId: editFields.clientId,\n    dietType: editFields.dietaryPreference,\n    ingredientSummary,\n    allocation,\n    totals,\n    targetCalories: Math.round(totals.calculatedCalories || 0),\n    targetProtein: Math.round(totals.calculatedProtein || 0),\n    targetCarbs: Math.round(totals.calculatedCarbs || 0),\n    targetFat: Math.round(totals.calculatedFat || 0)\n  }\n}];"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1840,
        128
      ],
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Transform Optimized Ingredients1"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://host.docker.internal:5000/api/meal-plans/from-ai",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-INTERNAL-SECRET",
              "value": "9a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{\n  JSON.stringify({\n    clientId: $json.clientId,\n    dietType: $json.dietType,\n    ingredientSummary: $json.ingredientSummary,\n    allocation: $json.allocation,\n    totals: $json.totals\n  })\n}}",
        "options": {}
      },
      "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "name": "Save Plan to Backend API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        2080,
        128
      ],
      "alwaysOutputData": false,
      "retryOnFail": false
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{\n  JSON.stringify({\n    success: true,\n    cacheHit: false,\n    cacheMiss: true,\n    status: $json.status || 'SUCCESS_PIPELINE_RESOLVED',\n    message: $json.message || 'AI-generated meal plan created successfully.',\n    meta: $json.meta || {}\n  })\n}}",
        "options": {
          "responseCode": 201
        }
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [
        2800,
        128
      ],
      "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
      "name": "Respond — AI Plan Success"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Edit Fields",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Edit Fields": {
      "main": [
        [
          {
            "node": "If",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Find documents": {
      "main": [
        [
          {
            "node": "Code in JavaScript",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Code in JavaScript": {
      "main": [
        [
          {
            "node": "If1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If": {
      "main": [
        [
          {
            "node": "Find documents",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If1": {
      "main": [
        [
          {
            "node": "Respond to Webhook1",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Load Ingredients",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Load Ingredients": {
      "main": [
        [
          {
            "node": "Invoke FastAPI Optimization Service1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Invoke FastAPI Optimization Service1": {
      "main": [
        [
          {
            "node": "Transform Optimized Ingredients1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Transform Optimized Ingredients1": {
      "main": [
        [
          {
            "node": "Save Plan to Backend API",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Save Plan to Backend API": {
      "main": [
        [
          {
            "node": "Respond — AI Plan Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "6163bac3f64be333ddc2fa2951d8461213f03dbf48df047d75aaddff96221cf7"
  }
}
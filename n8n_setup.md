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
        -1648,
        1088
      ],
      "id": "78067a80-4fe8-49b8-b824-27e7f2659590",
      "name": "Webhook1",
      "webhookId": "55210ba0-54d0-4fc7-85ad-309dcf8c38b0",
      "retryOnFail": false
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
        -1392,
        1088
      ],
      "id": "475ff20e-8bf5-42bd-95b6-2c1067c76590",
      "name": "Edit Fields1"
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
        -944,
        976
      ],
      "id": "d27cd0e4-ec62-41f4-be64-ae4f48eaa946",
      "name": "Find documents1",
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
        "jsCode": "// Lấy dữ liệu từ Edit Fields node\nconst clientPrefs = $('Edit Fields1').first().json;\nconst targetTdee = clientPrefs.tdee;\nconst allergiesList = clientPrefs.allergies || [];\nconst medicalConditionsList = clientPrefs.medicalConditions || [];\n\n// Lấy templates từ MongoDB node\nconst rawTemplates = $input.all();\nlet bestCandidate = null;\nlet minimalCalorieVariance = Infinity;\n\nfor (const entry of rawTemplates) {\n    const template = entry.json;\n    \n    // 1. Kiểm tra TDEE range\n    if (targetTdee < template.minTDEE || targetTdee > template.maxTDEE) {\n        continue;\n    }\n    \n    // 2. Kiểm tra allergens\n    let containsAllergen = false;\n    if (template.excludedAllergies && template.excludedAllergies.length > 0) {\n        for (const allergen of allergiesList) {\n            if (template.excludedAllergies.includes(allergen)) {\n                containsAllergen = true;\n                break;\n            }\n        }\n    }\n    if (containsAllergen) continue;\n    \n    // 3. Kiểm tra medical conditions\n    let containsMedicalConflict = false;\n    if (template.medicalConditionTags && template.medicalConditionTags.length > 0) {\n        for (const condition of medicalConditionsList) {\n            if (template.medicalConditionTags.includes(condition)) {\n                containsMedicalConflict = true;\n                break;\n            }\n        }\n    }\n    if (containsMedicalConflict) continue;\n\n    // 4. Chọn template có calorie gần TDEE nhất\n    const currentVariance = Math.abs(template.totalCalories - targetTdee);\n    if (currentVariance < minimalCalorieVariance) {\n        minimalCalorieVariance = currentVariance;\n        bestCandidate = template;\n    }\n}\n\n// 5. Trả về kết quả\nif (bestCandidate) {\n    return [{ json: { candidateFound: true, matchedTemplate: bestCandidate } }];\n} else {\n    return [{ json: { candidateFound: false, reason: \"No matching template found.\" } }];\n}"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -672,
        976
      ],
      "id": "2c6c9de7-e18b-4dde-955f-1d975fa52bcf",
      "name": "Code in JavaScript1"
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
        -1184,
        1088
      ],
      "id": "367ba13c-c1da-40b4-9e0e-f4e587ce2ecb",
      "name": "If2"
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
        -944,
        1184
      ],
      "id": "9e14c695-ae6c-4c04-b07f-d4c85c8c733f",
      "name": "Respond to Webhook2"
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
        -464,
        976
      ],
      "id": "b7028693-a161-4999-a1c0-4a95a44e9b1f",
      "name": "If3"
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
        -192,
        880
      ],
      "id": "2b7e173b-e76a-4e07-8e58-7b329569be41",
      "name": "Respond to Webhook3"
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
        "jsonBody": "={{\n  JSON.stringify({\n    targetCalories: $('Edit Fields1').first().json.tdee,\n    targetProtein: 140,\n    targetCarbs: 200,\n    targetFat: 65,\n    allergiesExclusions: $('Edit Fields1').first().json.allergies || [],\n    dietType: $('Edit Fields1').first().json.dietaryPreference,\n    minVarietyItems: 0,\n    maxVarietyItems: null,\n    activationGramThreshold: 1.0,\n    availableIngredients: $input.all().map(item => ({\n      id: item.json._id?.toString() || '',\n      name: item.json.name || '',\n      calories: item.json.calories_per_unit ?? 0,\n      protein: item.json.protein ?? 0,\n      carbs: item.json.carbs ?? 0,\n      fat: item.json.fat ?? 0,\n      allergenTags: [],\n      minLimitGram: 0,\n      maxLimitGram: 350\n    })).filter(ing => ing.id && ing.name && ing.calories > 0)\n  })\n}}",
        "options": {}
      },
      "id": "a343f5ab-751d-4421-a896-e15252364603",
      "name": "Invoke FastAPI Optimization Service",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        48,
        1168
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
        -208,
        1104
      ],
      "id": "edd65826-4f7a-4c40-afbf-7f592ad1bcd3",
      "name": "Load Ingredients1",
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
        "jsCode": "// UC-39: Transform LP solver allocation results into Gemini-friendly prompt\nconst fastapiResult = $input.first().json;\nconst editFields = $('Edit Fields1').first().json;\n\nconst allocation = fastapiResult.allocation || [];\nconst totals = fastapiResult.totals || {};\n\n// Build human-readable ingredient summary for Gemini prompt\nconst ingredientSummary = allocation\n  .map(item => `${Math.round(item.allocatedGrams)}g ${item.ingredientName}`)\n  .join(', ');\n\nreturn [{\n  json: {\n    clientId: editFields.clientId,\n    dietType: editFields.dietaryPreference,\n    ingredientSummary,\n    allocation,\n    totals,\n    targetCalories: Math.round(totals.calculatedCalories || 0),\n    targetProtein: Math.round(totals.calculatedProtein || 0),\n    targetCarbs: Math.round(totals.calculatedCarbs || 0),\n    targetFat: Math.round(totals.calculatedFat || 0)\n  }\n}];"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        272,
        1168
      ],
      "id": "52bf2d5b-ee26-4c4b-b0f5-99811cdb796b",
      "name": "Transform Optimized Ingredients"
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
      "id": "2ec78e9a-9143-4f51-b660-bce8c2d48d31",
      "name": "Save Plan to Backend API1",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        512,
        1168
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
        752,
        1168
      ],
      "id": "4f83208f-eac5-4f91-a698-7a77cb564244",
      "name": "Respond — AI Plan Success1"
    },
    {
      "parameters": {
        "collection": "recipes",
        "options": {},
        "query": "={{ JSON.stringify({ calories_per_unit: { $gt: 0 } }) }}"
      },
      "type": "n8n-nodes-base.mongoDb",
      "typeVersion": 1.3,
      "position": [
        -208,
        1280
      ],
      "id": "e0043ed8-dd11-43b1-91c3-1039beb6b2be",
      "name": "Load recipes",
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
        "collection": "recipesnutritons",
        "options": {},
        "query": "={{ JSON.stringify({ calories_per_unit: { $gt: 0 } }) }}"
      },
      "type": "n8n-nodes-base.mongoDb",
      "typeVersion": 1.3,
      "position": [
        -208,
        1440
      ],
      "id": "ffcb530e-10e0-4d5f-b20a-8236bd7d639d",
      "name": "Load recipes-nutrtion",
      "alwaysOutputData": false,
      "credentials": {
        "mongoDb": {
          "id": "Zghyt3NlT8HiuKH2",
          "name": "MongoDB account"
        }
      }
    }
  ],
  "connections": {
    "Webhook1": {
      "main": [
        [
          {
            "node": "Edit Fields1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Edit Fields1": {
      "main": [
        [
          {
            "node": "If2",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Find documents1": {
      "main": [
        [
          {
            "node": "Code in JavaScript1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Code in JavaScript1": {
      "main": [
        [
          {
            "node": "If3",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If2": {
      "main": [
        [
          {
            "node": "Find documents1",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Respond to Webhook2",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If3": {
      "main": [
        [
          {
            "node": "Respond to Webhook3",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Load Ingredients1",
            "type": "main",
            "index": 0
          },
          {
            "node": "Load recipes",
            "type": "main",
            "index": 0
          },
          {
            "node": "Load recipes-nutrtion",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Invoke FastAPI Optimization Service": {
      "main": [
        [
          {
            "node": "Transform Optimized Ingredients",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Load Ingredients1": {
      "main": [
        [
          {
            "node": "Invoke FastAPI Optimization Service",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Transform Optimized Ingredients": {
      "main": [
        [
          {
            "node": "Save Plan to Backend API1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Save Plan to Backend API1": {
      "main": [
        [
          {
            "node": "Respond — AI Plan Success1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Load recipes": {
      "main": [
        [
          {
            "node": "Invoke FastAPI Optimization Service",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Load recipes-nutrtion": {
      "main": [
        [
          {
            "node": "Invoke FastAPI Optimization Service",
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
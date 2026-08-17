const axios = require("axios");
const geminiService = require("./gemini.service");

class N8nService {
  async triggerTemplateMatch(payload) {
    const url =
      process.env.N8N_WEBHOOK_URL ||
      "http://localhost:5678/webhook-test/match-meal-plan-template";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          `N8N_HTTP_${response.status}${responseText ? `: ${responseText}` : ""}`,
        );
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        return response.json();
      }

      return response.text();
    } catch (error) {
      if (error?.name === "AbortError") {
        console.error(
          "❌ n8n Orchestration Network Pipe Failure: request timed out",
        );
      }

      console.error(
        "❌ n8n Orchestration Network Pipe Failure:",
        error.message,
      );
      throw new Error("N8N_TIMEOUT_OR_FAILURE");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async scanMealImage(file) {
    const url =
      process.env.N8N_SCAN_MEAL_WEBHOOK_URL ||
      "http://127.0.0.1:5678/webhook/scan-meal";

    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype });
    formData.append("image", blob, file.originalname || "image.jpg");

    try {
      const response = await axios.post(url, formData, {
        timeout: 2000, // 2s timeout waiting for n8n
      });

      let dataObj = response.data;
      if (Array.isArray(dataObj) && dataObj.length > 0) {
        dataObj = dataObj[0];
      }
      if (dataObj && typeof dataObj === 'object' && dataObj.data) {
        dataObj = dataObj.data;
      }

      // Post-process n8n response confidence if present (strictly cap 2D visual confidence at max 0.65)
      if (dataObj && typeof dataObj === 'object') {
        const rawConf = parseFloat(dataObj.confidence);
        dataObj.confidence = Math.min(0.65, Math.max(0.30, isNaN(rawConf) ? 0.55 : rawConf));
        if (!dataObj.note) {
          dataObj.note = "⚠️ Reference Warning: AI analysis from 2D camera images estimates ingredient amounts and calories based strictly on visual appearance. Actual portion weight (g) may vary depending on thickness and density. Please manually check and adjust actual weights before logging.";
        }
      }

      return dataObj;
    } catch (error) {
      console.warn("⚠️ [n8n Offline or Failed]:", error.message);

      const apiKey = process.env.GOOGLE_API_KEY;
      if (apiKey) {
        console.info("⚡ [Gemini Fallback]: Initiating direct Gemini Vision API analysis...");
        try {
          return await this.callGeminiVisionFallback(file, apiKey);
        } catch (geminiError) {
          console.error("❌ [Gemini Fallback Failed]:", geminiError.message);
          throw new Error("N8N_AND_GEMINI_FALLBACK_FAILURE");
        }
      }

      if (error.response) {
        throw new Error(
          `N8N_HTTP_${error.response.status}: ${typeof error.response.data === "object"
            ? JSON.stringify(error.response.data)
            : error.response.data
          }`,
        );
      }
      throw new Error("N8N_TIMEOUT_OR_FAILURE");
    }
  }

  async callGeminiVisionFallback(file, apiKey) {
    const models = [
      process.env.GEMINI_VISION_MODEL || 'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
    ];

    const prompt = [
      "You are an elite clinical research dietitian and expert culinary vision assistant.",
      "Analyze the meal image and return the estimated meal name, confidence score, ingredients list, and macro-nutritional totals.",
      "CRITICAL - 2D ESTIMATION: Camera photos are 2D representations without depth or density measurements. Weight estimations carry inherent visual uncertainty. Score confidence strictly between 0.30 and 0.65 for 2D portion estimates. Never score above 0.65.",
      "CRITICAL - NON-FOOD IMAGES: If the photo does NOT depict a food dish or meal plate (e.g. human face, person, document, animal, or non-food object), set 'is_valid_meal': false, 'meal_name': 'No Food Detected', 'confidence': 0, 'ingredients': [], and 'note': 'No valid meal detected in image. Please take a clear photo of your meal plate and try again.'",
      "You must output your response exclusively as a minified, valid JSON object that strictly adheres to the requested application schema. Do not append any conversational prefaces, explanation, or markdown fences (e.g. do not wrap with ```json).",
      "JSON schema:",
      "{",
      '  "is_valid_meal": boolean,',
      '  "meal_name": "string (creative name of the dish)",',
      '  "confidence": number (strictly between 0.30 and 0.65 for valid meals, or 0 for non-food),',
      '  "ingredients": [',
      '    {',
      '      "name": "string (simple singular ingredient name, e.g. Chicken breast)",',
      '      "estimated_amount": number,',
      '      "estimated_unit": "g|ml|piece|tbsp|tsp|cup|oz|kg|l",',
      '      "nutrition": { "kcal": number, "protein": number, "carbs": number, "fats": number }',
      '    }',
      '  ],',
      '  "totals": { "kcal": number, "protein": number, "carbs": number, "fats": number }',
      "}",
    ].join("\n");

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: file.mimetype || "image/jpeg",
                data: file.buffer.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    };

    const data = await geminiService.executeWithResilience(models, payload, { timeoutMs: 45000, maxRetriesPerModel: 3 });
    
    let text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join("\n");

    if (!text) {
      throw new Error("Gemini returned empty response");
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    }

    const parsed = JSON.parse(cleanText);

    if (parsed.is_valid_meal === false || (parseFloat(parsed.confidence) === 0) || !parsed.ingredients || parsed.ingredients.length === 0) {
      throw new Error("No valid meal detected in image. Please take a clear photo of your meal plate and try again.");
    }

    // Enforce strict confidence cap for 2D camera image analysis (max 0.65)
    const rawConfidence = parseFloat(parsed.confidence);
    const strictConfidence = Math.min(0.65, Math.max(0.30, isNaN(rawConfidence) ? 0.55 : rawConfidence));

    return {
      meal_name: parsed.meal_name || "Scanned Meal",
      confidence: strictConfidence,
      ingredients: (parsed.ingredients || []).map((item) => ({
        name: item.name || "Ingredient",
        estimated_amount: item.estimated_amount || 0,
        estimated_unit: item.estimated_unit || "g",
        nutrition: {
          kcal: item.nutrition?.kcal || 0,
          protein: item.nutrition?.protein || 0,
          carbs: item.nutrition?.carbs || 0,
          fats: item.nutrition?.fats || 0,
        },
      })),
      totals: {
        kcal: parsed.totals?.kcal || 0,
        protein: parsed.totals?.protein || 0,
        carbs: parsed.totals?.carbs || 0,
        fats: parsed.totals?.fats || 0,
      },
      note: "⚠️ Reference Warning: AI analysis from 2D camera images estimates ingredient amounts based strictly on visual appearance. Actual portion weight (g) may vary depending on thickness and density. Please manually check and adjust actual weights before logging.",
    };
  }

  async triggerAutoAdjustCalories(payload) {
    const url =
      process.env.N8N_AUTO_ADJUST_CALORIES_WEBHOOK_URL ||
      "http://127.0.0.1:5678/webhook-test/auto-adjust-calories";

    console.info(`⚡ [n8n Webhook]: Triggering UC-42 Auto-Adjust Calories at ${url}...`);

    try {
      const res = await axios.post(url, payload, { timeout: 10000 });
      console.info(`✅ [n8n Auto-Adjust Calories Success]: Webhook responded with status ${res.status}`);
      return { success: true, message: "Webhook triggered" };
    } catch (error) {
      console.warn(`⚠️ [n8n Auto-Adjust Calories Failed]: ${error.message} ${error.response?.status ? `(HTTP ${error.response.status})` : ''}`);
      return null;
    }
  }
}

module.exports = new N8nService();

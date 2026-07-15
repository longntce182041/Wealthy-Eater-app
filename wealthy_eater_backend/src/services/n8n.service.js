const axios = require("axios");

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
        timeout: 20000, // 20s timeout
      });

      return response.data;
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
          `N8N_HTTP_${error.response.status}: ${
            typeof error.response.data === "object"
              ? JSON.stringify(error.response.data)
              : error.response.data
          }`,
        );
      }
      throw new Error("N8N_TIMEOUT_OR_FAILURE");
    }
  }

  async callGeminiVisionFallback(file, apiKey) {
    const model = process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = [
      "You are an elite clinical research dietitian and expert culinary vision assistant.",
      "Analyze the meal image and return the estimated meal name, confidence score, ingredients list, and macro-nutritional totals.",
      "You must output your response exclusively as a minified, valid JSON object that strictly adheres to the requested application schema. Do not append any conversational prefaces, explanation, or markdown fences (e.g. do not wrap with ```json).",
      "JSON schema:",
      "{",
      '  "meal_name": "string (creative name of the dish)",',
      '  "confidence": number (between 0.0 and 1.0),',
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

    const response = await axios.post(url, payload, {
      timeout: 25000,
      headers: { "Content-Type": "application/json" },
    });

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      response.data?.candidates?.[0]?.content?.parts
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

    return {
      meal_name: parsed.meal_name || "Món ăn từ hình ảnh",
      confidence: parsed.confidence || 0.8,
      ingredients: (parsed.ingredients || []).map((item) => ({
        name: item.name || "Thành phần",
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
      note: "",
    };
  }
}

module.exports = new N8nService();

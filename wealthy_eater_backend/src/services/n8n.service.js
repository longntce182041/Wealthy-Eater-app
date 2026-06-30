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
}

module.exports = new N8nService();

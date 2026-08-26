import { handleMealAnalysis, type MealAnalysisEnv } from "./meal-analysis";

export default {
  fetch(request: Request, env: MealAnalysisEnv) {
    const url = new URL(request.url);
    if (url.pathname === "/api/analyze-meal" || url.pathname === "/") return handleMealAnalysis(request, env);
    return new Response("Not found", { status: 404 });
  },
};

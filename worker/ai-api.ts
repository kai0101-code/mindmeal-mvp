import { handleMealAnalysis, type MealAnalysisEnv } from "./meal-analysis";
import { handleFoodSearch } from "./food-search";
import { handleNextMealRecommendation } from "./next-meal";

export default {
  fetch(request: Request, env: MealAnalysisEnv) {
    const url = new URL(request.url);
    if (url.pathname === "/api/analyze-meal" || url.pathname === "/") return handleMealAnalysis(request, env);
    if (url.pathname === "/api/search-food") return handleFoodSearch(request, env);
    if (url.pathname === "/api/recommend-next-meal") return handleNextMealRecommendation(request, env);
    return new Response("Not found", { status: 404 });
  },
};

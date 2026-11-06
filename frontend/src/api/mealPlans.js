import { request } from "./http.js";

export function getMealPlans() {
  return request("/meal-plans");
}

export function getMealPlan(id) {
  return request(`/meal-plans/${encodeURIComponent(id)}`);
}

// plan = { name, weekStart: "2026-11-09", entries: [{ day, slot, recipeId }] }
export function createMealPlan(plan) {
  return request("/meal-plans", { method: "POST", body: plan });
}

export function updateMealPlan(id, plan) {
  return request(`/meal-plans/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: plan,
  });
}

export function deleteMealPlan(id) {
  return request(`/meal-plans/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// The API only needs day, slot, and recipeId for each entry;
// the server fills in recipeName itself
export function toEntryInput({ day, slot, recipeId }) {
  return { day, slot, recipeId };
}

// Recipes that reuse ingredients already in this plan
export function getPlanSuggestions(id) {
  return request(`/meal-plans/${encodeURIComponent(id)}/suggestions`);
}

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

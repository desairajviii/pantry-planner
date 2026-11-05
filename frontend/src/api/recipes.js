import { request } from "./http.js";

// Builds the query string, skipping empty values.
// getRecipes({ tags: ["vegan", "easy"], maxMinutes: 30, page: 2 })
// -> /recipes?tags=vegan,easy&maxMinutes=30&page=2
export function getRecipes(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        query.set(key, value.join(","));
      }
    } else if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  }
  const queryString = query.toString();
  return request(`/recipes${queryString ? `?${queryString}` : ""}`);
}

export function getRecipe(id) {
  return request(`/recipes/${encodeURIComponent(id)}`);
}

// The filter groups and options, for FilterPanel
export function getFilterGroups() {
  return request("/recipes/filters");
}

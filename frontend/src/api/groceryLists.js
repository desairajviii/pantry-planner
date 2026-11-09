import { request } from "./http.js";

// List the user's grocery lists, newest first
export function getGroceryLists() {
  return request("/grocery-lists");
}

// Get one grocery list with its items
// id = list id
export function getGroceryList(id) {
  return request(`/grocery-lists/${encodeURIComponent(id)}`);
}

// Generate a new list from a meal plan, skipping what the pantry covers
// mealPlanId = plan id, name is optional
export function createGroceryList(mealPlanId, name) {
  const body = { mealPlanId };
  if (name) {
    body.name = name;
  }
  return request("/grocery-lists", { method: "POST", body });
}

// Update a list's name and/or items
// changes = { name?, items? }, items replaces the whole array
export function updateGroceryList(id, changes) {
  return request(`/grocery-lists/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: changes,
  });
}

// Delete a grocery list
// id = list id
export function deleteGroceryList(id) {
  return request(`/grocery-lists/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

import { request } from "./http.js";

// List the user's pantry items alphabetically
export function getPantry() {
  return request("/pantry");
}

// Add one item
// item = { name, quantity?, useBy? } with useBy as "YYYY-MM-DD" or "" for none
export function addPantryItem(item) {
  return request("/pantry", { method: "POST", body: item });
}

// Edit one item, returns the updated item
// fields = any of { name, quantity, useBy }, useBy "" clears the date
export function updatePantryItem(id, fields) {
  return request(`/pantry/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: fields,
  });
}

// Remove one item; resolves to null (204)
export function deletePantryItem(id) {
  return request(`/pantry/${encodeURIComponent(id)}`, { method: "DELETE" });
}

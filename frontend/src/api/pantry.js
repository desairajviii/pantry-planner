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

// Format a date as the user's local "YYYY-MM-DD"
// date = Date to format, defaults to now
function localDate(date = new Date()) {
  const year = date.getFullYear(); // local year
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0"); // local day of month
  return `${year}-${month}-${day}`;
}

// Recipes ranked by pantry coverage, with missing, coverage and expiringUsed
// params = { tags, maxMinutes, maxSteps, maxMissing }, null/undefined values are skipped
// Always sends local date so "expiring soon" matches pantry page
export function searchPantry({ tags = [], ...limits } = {}) {
  const query = new URLSearchParams({ today: localDate() }); // user's calendar day
  if (tags.length > 0) {
    query.set("tags", tags.join(",")); // comma-separated
  }
  for (const [key, value] of Object.entries(limits)) {
    if (value !== null && value !== undefined) {
      query.set(key, value); // maxMinutes, maxSteps, maxMissing
    }
  }
  return request(`/pantry/search?${query}`);
}

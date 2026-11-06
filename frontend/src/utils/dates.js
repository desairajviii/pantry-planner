// Meal plan weeks are calendar dates stored as UTC midnight, so they're
// formatted in UTC. Local time would show the day before in US time zones.

// "2026-11-09T00:00:00.000Z" -> "2026-11-09", the format <input type="date"> uses
export function toDateInput(iso) {
  return iso.slice(0, 10);
}

// "2026-11-09T00:00:00.000Z" -> "Nov 9, 2026"
export function formatDate(iso, options) {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

// The date a number of days after a week's start, as an ISO string
export function addDays(iso, days) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

// The next Monday in the user's own time zone (today, if it's Monday),
// as "YYYY-MM-DD". Used as the default week for a new plan.
export function upcomingMonday() {
  const date = new Date();
  const daysUntilMonday = (8 - date.getDay()) % 7;
  date.setDate(date.getDate() + daysUntilMonday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

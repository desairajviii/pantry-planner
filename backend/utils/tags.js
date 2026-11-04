// filter tags from dataset
export const FILTER_TAGS = [
  "vegetarian",
  "vegan",
  "kosher",
  "healthy",
  "5-ingredients-or-less",
];

// Time limits for filters, derived from dataset tags
export const MAX_MINUTES = [15, 30, 60];

// Step limit for filters, derived from dataset tags
export const MAX_STEPS = [3];

// Parse and validate filters
// raw = comma-separated query string, e.g. "vegan,kosher"
export function parseTags(raw) {
  const value = Array.isArray(raw) ? raw.join(",") : raw; // accept both query forms
  if (typeof value !== "string") {
    return []; // missing or malformed
  }
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => FILTER_TAGS.includes(tag)); // drop anything not in FILTER_TAGS
}

// Check that the max minutes is a valid filter (15/30/60 mins)
// raw = query string value, e.g. "30"
export function parseMaxMinutes(raw) {
  const limit = Number(raw);
  return MAX_MINUTES.includes(limit) ? limit : null; // only allow valid time limits
}

// check that max steps entered is a valid filter (3 steps or less)
// raw = query string value, e.g. "3"
export function parseMaxSteps(raw) {
  const limit = Number(raw);
  return MAX_STEPS.includes(limit) ? limit : null; // only allow 3 steps or less
}

// Build the Mongo filter for the selected tags, time limit and step limit
// query = req.query from the route
export function buildFilter(query) {
  const filter = {};
  const tags = parseTags(query.tags); // allowed tags only
  const maxMinutes = parseMaxMinutes(query.maxMinutes); // allowed limit or null
  const maxSteps = parseMaxSteps(query.maxSteps); // allowed limit or null
  if (tags.length) {
    filter.tags = { $all: tags }; // filter recipes by tags
  }
  if (maxMinutes) {
    filter.minutes = { $lte: maxMinutes }; // filter recipes by time
  }
  if (maxSteps) {
    filter.stepCount = { $lte: maxSteps }; // filter recipes by steps
  }
  return filter;
}
// The one list of recipe filters, used by both the backend and the frontend.
// The backend validates queries against it, and GET /api/recipes/filters sends
// it to the browser, so FilterPanel never keeps its own copy.
//
// Most groups match recipe tags. Time and steps use the minutes and stepCount
// fields instead, because those tags are missing or wrong on many recipes.
// Diet labels say "tagged" because tags are set by Food.com and unverified.
export const FILTER_GROUPS = [
  {
    id: "diet",
    label: "Diet",
    type: "tags",
    options: [
      { value: "vegetarian", label: "Tagged vegetarian" },
      { value: "vegan", label: "Tagged vegan" },
      { value: "kosher", label: "Tagged kosher" },
      { value: "healthy", label: "Tagged healthy" },
      { value: "low-carb", label: "Tagged low-carb" },
      { value: "low-calorie", label: "Tagged low-calorie" },
    ],
  },
  {
    id: "course",
    label: "Course",
    type: "tags",
    options: [
      { value: "main-dish", label: "Main dish" },
      { value: "side-dishes", label: "Side dish" },
      { value: "desserts", label: "Dessert" },
      { value: "appetizers", label: "Appetizer" },
      { value: "salads", label: "Salad" },
      { value: "breakfast", label: "Breakfast" },
    ],
  },
  {
    id: "cuisine",
    label: "Cuisine",
    type: "tags",
    options: [
      { value: "american", label: "American" },
      { value: "european", label: "European" },
      { value: "asian", label: "Asian" },
      { value: "italian", label: "Italian" },
      { value: "mexican", label: "Mexican" },
      { value: "indian", label: "Indian" },
    ],
  },
  {
    id: "other",
    label: "Other",
    type: "tags",
    options: [
      { value: "easy", label: "Easy" },
      { value: "beginner-cook", label: "Beginner cook" },
      { value: "5-ingredients-or-less", label: "5 ingredients or less" },
      { value: "inexpensive", label: "Inexpensive" },
    ],
  },
  {
    id: "time",
    label: "Time",
    type: "maxMinutes",
    options: [
      { value: 15, label: "15 min or less" },
      { value: 30, label: "30 min or less" },
      { value: 60, label: "60 min or less" },
      { value: 240, label: "4 hours or less" },
    ],
  },
  {
    id: "steps",
    label: "Steps",
    type: "maxSteps",
    options: [{ value: 3, label: "3 steps or less" }],
  },
];

// The allowed values of one filter type, taken from the groups above
function valuesFor(type) {
  return FILTER_GROUPS.filter((group) => group.type === type).flatMap((group) =>
    group.options.map((option) => option.value),
  );
}

export const FILTER_TAGS = valuesFor("tags");
export const MAX_MINUTES = valuesFor("maxMinutes");
export const MAX_STEPS = valuesFor("maxSteps");

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

// Check that the max minutes is a valid filter (15/30/60/240 mins)
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

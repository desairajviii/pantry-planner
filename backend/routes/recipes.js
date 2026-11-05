import express from "express";
import { toObjectId } from "../utils/objectId.js";
import { getDb } from "../db/connection.js";
import { buildFilter, FILTER_GROUPS } from "../utils/tags.js";

const router = express.Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// Fields for the list view. Steps and description are only sent on the
// detail page, since they're the largest fields.
const LIST_FIELDS = {
  name: 1,
  minutes: 1,
  tags: 1,
  ingredients: 1,
  stepCount: 1,
};

// "3" -> 3; anything missing or invalid falls back to the default
function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function buildQuery(query) {
  const filter = buildFilter(query); // permitted tags, maxMinutes, maxSteps
  const search =
    typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  if (search) filter.$text = { $search: search }; // uses the name text index
  return { filter, hasSearch: Boolean(search) };
}

// GET /api/recipes/filters: the filter options, for FilterPanel
router.get("/filters", (req, res) => {
  res.json(FILTER_GROUPS);
});

// GET /api/recipes?tags=vegetarian,easy&maxMinutes=30&maxSteps=3&q=pasta&page=1
router.get("/", async (req, res) => {
  const { filter, hasSearch } = buildQuery(req.query);
  const page = toPositiveInt(req.query.page, 1);
  const limit = Math.min(
    toPositiveInt(req.query.limit, DEFAULT_LIMIT),
    MAX_LIMIT,
  );

  // With a search, best matches come first; otherwise alphabetical
  const projection = hasSearch
    ? { ...LIST_FIELDS, score: { $meta: "textScore" } }
    : LIST_FIELDS;
  const sort = hasSearch
    ? { score: { $meta: "textScore" }, _id: 1 }
    : { name: 1, _id: 1 };

  const recipes = getDb().collection("recipes");
  const [items, total] = await Promise.all([
    recipes
      .find(filter, { projection })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    recipes.countDocuments(filter),
  ]);

  res.json({
    recipes: items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

// GET /api/recipes/:id: one recipe with ingredients and steps
router.get("/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  const recipe = _id
    ? await getDb().collection("recipes").findOne({ _id })
    : null;

  if (!recipe) {
    return res.status(404).json({ error: "Recipe not found" });
  }
  res.json(recipe);
});

export default router;

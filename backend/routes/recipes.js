import express from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db/connection.js";

const router = express.Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_TAGS = 10;

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

// "vegetarian, Easy" -> ["vegetarian", "easy"]
function parseTags(value) {
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_TAGS);
}

// Turns query parameters into a MongoDB filter
function buildFilter(query) {
  const filter = {};

  // Selected tags combine with AND: a recipe must have every one
  const tags = parseTags(query.tags);
  if (tags.length > 0) {
    filter.tags = { $all: tags };
  }

  // Time and steps filter on the recipe fields, since those tags are unreliable
  const maxMinutes = toPositiveInt(query.maxMinutes, null);
  if (maxMinutes) {
    filter.minutes = { $lte: maxMinutes };
  }

  const maxSteps = toPositiveInt(query.maxSteps, null);
  if (maxSteps) {
    filter.stepCount = { $lte: maxSteps };
  }

  // Name search uses the text index from the seed script
  const search =
    typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  if (search) {
    filter.$text = { $search: search };
  }

  return { filter, hasSearch: Boolean(search) };
}

// GET /api/recipes?tags=vegetarian,easy&maxMinutes=30&maxSteps=3&q=pasta&page=1
router.get("/", async (req, res) => {
  const { filter, hasSearch } = buildFilter(req.query);
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
  const { id } = req.params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(404).json({ error: "Recipe not found" });
  }

  const recipe = await getDb()
    .collection("recipes")
    .findOne({ _id: new ObjectId(id) });

  if (!recipe) {
    return res.status(404).json({ error: "Recipe not found" });
  }
  res.json(recipe);
});

export default router;

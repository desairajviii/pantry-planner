import express from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db/connection.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { toObjectId } from "../utils/objectId.js";
import { isCovered } from "../utils/ingredientMatch.js";

const router = express.Router();

// Every meal plan route needs a logged-in user
router.use(requireAuth);

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const SLOTS = ["breakfast", "lunch", "dinner"];
const MAX_NAME = 100;

const mealPlans = () => getDb().collection("mealPlans");

// The owner's own ID doesn't need to go back to the browser
const HIDE_OWNER = { userId: 0 };

// "2026-11-09" -> Date at UTC midnight, or null if it isn't a real date.
// Impossible dates like "2026-02-30" roll over to another day in JavaScript,
// so the result has to match the input.
function toDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    ? date
    : null;
}

// Checks one entry list: valid day, meal, and recipe ID, with at most
// one recipe per day and meal. Returns { errors } or { entries }.
function parseEntries(rawEntries = []) {
  if (!Array.isArray(rawEntries)) {
    return { errors: ["Entries must be a list."] };
  }

  const seen = new Set();
  const entries = [];
  for (const entry of rawEntries) {
    const day = entry?.day;
    const slot = entry?.slot;
    const recipeId = toObjectId(entry?.recipeId);

    if (!DAYS.includes(day) || !SLOTS.includes(slot) || !recipeId) {
      return { errors: ["Each entry needs a valid day, meal, and recipe."] };
    }

    const key = `${day}-${slot}`;
    if (seen.has(key)) {
      return { errors: [`Only one recipe is allowed for ${day} ${slot}.`] };
    }
    seen.add(key);
    entries.push({ day, slot, recipeId });
  }
  return { entries };
}

// Checks the whole request body. Returns { errors } or { data }.
// Recipe names come from the database, not the browser, so a plan
// can't show a name that doesn't match its recipe.
async function parseMealPlan(body = {}) {
  const errors = [];

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME) {
    errors.push(`Name is required (up to ${MAX_NAME} characters).`);
  }

  const weekStart = toDate(body.weekStart);
  if (!weekStart) {
    errors.push("Week start must be a date like 2026-11-09.");
  }

  const parsed = parseEntries(body.entries);
  if (parsed.errors) {
    errors.push(...parsed.errors);
  }

  if (errors.length > 0) {
    return { errors };
  }

  // Look up each recipe's name, which also confirms it exists
  const ids = [...new Set(parsed.entries.map((e) => e.recipeId.toString()))];
  const found =
    ids.length === 0
      ? []
      : await getDb()
          .collection("recipes")
          .find(
            { _id: { $in: ids.map((id) => new ObjectId(id)) } },
            { projection: { name: 1 } },
          )
          .toArray();
  const names = new Map(found.map((r) => [r._id.toString(), r.name]));

  if (names.size !== ids.length) {
    return { errors: ["One or more recipes don't exist."] };
  }

  const entries = parsed.entries.map((e) => ({
    ...e,
    recipeName: names.get(e.recipeId.toString()),
  }));
  return { data: { name, weekStart, entries } };
}

// GET /api/meal-plans: the user's plans, newest week first
router.get("/", async (req, res) => {
  const plans = await mealPlans()
    .find({ userId: req.user._id }, { projection: HIDE_OWNER })
    .sort({ weekStart: -1, createdAt: -1 })
    .toArray();
  res.json(plans);
});

// POST /api/meal-plans: create a plan
router.post("/", async (req, res) => {
  const { errors, data } = await parseMealPlan(req.body);
  if (errors) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  const now = new Date();
  const result = await mealPlans().insertOne({
    userId: req.user._id,
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  res
    .status(201)
    .json({ _id: result.insertedId, ...data, createdAt: now, updatedAt: now });
});

// GET /api/meal-plans/:id: one plan
router.get("/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  const plan = _id
    ? await mealPlans().findOne(
        { _id, userId: req.user._id },
        { projection: HIDE_OWNER },
      )
    : null;

  if (!plan) {
    return res.status(404).json({ error: "Meal plan not found" });
  }
  res.json(plan);
});

// PUT /api/meal-plans/:id: replace the name, week, and entries
router.put("/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    return res.status(404).json({ error: "Meal plan not found" });
  }

  const { errors, data } = await parseMealPlan(req.body);
  if (errors) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  const updated = await mealPlans().findOneAndUpdate(
    { _id, userId: req.user._id },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after", projection: HIDE_OWNER },
  );
  if (!updated) {
    return res.status(404).json({ error: "Meal plan not found" });
  }
  res.json(updated);
});

// DELETE /api/meal-plans/:id
router.delete("/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  const result = _id
    ? await mealPlans().deleteOne({ _id, userId: req.user._id })
    : { deletedCount: 0 };

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Meal plan not found" });
  }
  res.status(204).end();
});

const MAX_SUGGESTIONS = 6;
const MIN_SHARED = 2;

// GET /api/meal-plans/:id/suggestions
// Recipes that reuse ingredients this plan already needs, so leftovers from
// one meal (half a cabbage, the rest of the cilantro) get used in another.
router.get("/:id/suggestions", async (req, res) => {
  const _id = toObjectId(req.params.id);
  const plan = _id
    ? await mealPlans().findOne(
        { _id, userId: req.user._id },
        { projection: { entries: 1 } },
      )
    : null;

  if (!plan) {
    return res.status(404).json({ error: "Meal plan not found" });
  }

  const plannedIds = [
    ...new Set(plan.entries.map((e) => e.recipeId.toString())),
  ].map((id) => new ObjectId(id));
  if (plannedIds.length === 0) {
    return res.json({ suggestions: [] });
  }

  const recipes = getDb().collection("recipes");
  const planned = await recipes
    .find({ _id: { $in: plannedIds } }, { projection: { ingredients: 1 } })
    .toArray();

  // Everything the plan already needs, minus staples like salt and oil that
  // everyone has anyway (isCovered with an empty pantry only checks staples)
  const leftovers = [...new Set(planned.flatMap((r) => r.ingredients))].filter(
    (ingredient) => !isCovered(ingredient, []),
  );
  if (leftovers.length === 0) {
    return res.json({ suggestions: [] });
  }

  const suggestions = await recipes
    .aggregate([
      // Recipes not already in the plan that use any of those ingredients
      {
        $match: { ingredients: { $in: leftovers }, _id: { $nin: plannedIds } },
      },
      // Which of the plan's ingredients each one reuses, and how many
      {
        $addFields: {
          sharedIngredients: { $setIntersection: ["$ingredients", leftovers] },
        },
      },
      { $addFields: { sharedCount: { $size: "$sharedIngredients" } } },
      { $match: { sharedCount: { $gte: MIN_SHARED } } },
      // Most reuse first; quicker recipes break ties
      { $sort: { sharedCount: -1, minutes: 1, _id: 1 } },
      { $limit: MAX_SUGGESTIONS },
      {
        $project: {
          name: 1,
          minutes: 1,
          tags: 1,
          ingredients: 1,
          stepCount: 1,
          sharedIngredients: 1,
        },
      },
    ])
    .toArray();

  res.json({ suggestions });
});

export default router;

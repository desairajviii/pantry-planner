// Grocery list routes: generate from a meal plan, list, get one, update, delete
// Mounted in server.js as app.use("/api/grocery-lists", groceryListsRouter)
import { Router } from "express";
import { getDb } from "../db/connection.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { toObjectId } from "../utils/objectId.js";
import {
  normalizeName,
  toPantryTerms,
  isCovered,
} from "../utils/ingredientMatch.js";

const router = Router();

const MAX_NAME = 100; // max characters for a list or item name
const MAX_QUANTITY = 50; // max characters for quantity
const MAX_ITEMS = 300; // cap list size on update
const HIDE_OWNER = { userId: 0 }; // hide owner id from browser

router.use(requireAuth);

// Get the groceryLists collection from db
const groceryLists = () => getDb().collection("groceryLists");

// Validate list name, returns the trimmed name, or null if invalid
// raw = name from the request body
function parseName(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  const name = raw.trim();
  return name && name.length <= MAX_NAME ? name : null;
}

// Validate full items array sent on update
// Returns { error } on bad input, otherwise { items }
// raw = items array from the request body
function parseItems(raw) {
  if (!Array.isArray(raw)) {
    return { error: "Items must be a list." };
  }
  if (raw.length > MAX_ITEMS) {
    return { error: `A list can have at most ${MAX_ITEMS} items.` };
  }

  const seen = new Set(); // names already in this list
  const items = [];
  for (const item of raw) {
    if (typeof item?.name !== "string") {
      return { error: "Each item needs a name." };
    }
    const name = normalizeName(item.name);
    if (!name || name.length > MAX_NAME) {
      return { error: `Item names must be 1-${MAX_NAME} characters.` };
    }
    if (seen.has(name)) return { error: `"${name}" is listed twice.` };
    seen.add(name);

    const quantity = item.quantity ?? ""; // optional
    if (typeof quantity !== "string" || quantity.trim().length > MAX_QUANTITY) {
      return {
        error: `Quantity must be text up to ${MAX_QUANTITY} characters.`,
      };
    }

    const recipeCount = item.recipeCount ?? 0; // custom items have no recipes
    if (!Number.isInteger(recipeCount) || recipeCount < 0) {
      return { error: "Recipe count must be a whole number, 0 or more." };
    }

    items.push({
      name,
      recipeCount,
      quantity: quantity.trim(),
      checked: item.checked === true,
      custom: item.custom === true,
    });
  }
  return { items };
}

// Union planned recipes' ingredients, count recipes per ingredient, drop pantry-covered ones
// plannedRecipes = one recipe doc per plan entry, pantryTerms = output of toPantryTerms()
function buildItems(plannedRecipes, pantryTerms) {
  const counts = new Map();
  for (const recipe of plannedRecipes) {
    const unique = new Set(recipe.ingredients.map(normalizeName)); // count each ingredient once per recipe
    for (const name of unique) {
      // skip blanks and pantry/staple matches
      if (!name || isCovered(name, pantryTerms)) {
        continue;
      }
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, recipeCount]) => ({
      name,
      recipeCount,
      quantity: "",
      checked: false,
      custom: false,
    }));
}

// GET /api/grocery-lists - the user's lists, newest first, without items
router.get("/", async (req, res, next) => {
  try {
    const lists = await groceryLists()
      .find(
        { userId: req.user._id },
        { projection: { ...HIDE_OWNER, items: 0 } },
      ) // index view only needs summaries
      .sort({ createdAt: -1 }) // newest first
      .toArray();
    res.json(lists);
  } catch (err) {
    next(err);
  }
});

// POST /api/grocery-lists - generate a list from { mealPlanId, name? }
router.post("/", async (req, res, next) => {
  try {
    const db = getDb();
    const planId = toObjectId(req.body?.mealPlanId);
    if (!planId) {
      return res.status(400).json({ error: "A valid meal plan is required." });
    }
    const plan = await db
      .collection("mealPlans")
      .findOne({ _id: planId, userId: req.user._id });
    if (!plan) {
      return res.status(404).json({ error: "Meal plan not found." });
    }
    if (!plan.entries?.length) {
      return res
        .status(400)
        .json({ error: "This meal plan has no recipes yet." });
    }

    // optional custom name, otherwise derived from the plan
    let name = `Groceries: ${plan.name}`.slice(0, MAX_NAME);
    if (req.body.name !== undefined) {
      name = parseName(req.body.name);
      if (!name) {
        return res
          .status(400)
          .json({ error: `Name must be 1-${MAX_NAME} characters.` });
      }
    }

    // fetch each distinct planned recipe once (recipeId is stored as ObjectId)
    const ids = [
      ...new Map(
        plan.entries.map((e) => [e.recipeId.toString(), e.recipeId]),
      ).values(),
    ];
    const recipes = await db
      .collection("recipes")
      .find({ _id: { $in: ids } }, { projection: { ingredients: 1 } }) // only ingredients needed
      .toArray();
    const byId = new Map(recipes.map((r) => [r._id.toString(), r]));
    const planned = plan.entries
      .map((e) => byId.get(e.recipeId.toString())) // one recipe per entry
      .filter(Boolean); // skip recipes that no longer exist

    // load this user's pantry as match terms
    const names = await db
      .collection("pantry")
      .find({ userId: req.user._id }, { projection: { name: 1 } })
      .map((item) => item.name)
      .toArray();

    const now = new Date(); // same timestamp for created and updated
    const list = {
      mealPlanId: planId,
      name,
      items: buildItems(planned, toPantryTerms(names)),
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await groceryLists().insertOne({
      userId: req.user._id,
      ...list,
    });
    res.status(201).json({ _id: insertedId, ...list }); // return the saved list without userId
  } catch (err) {
    next(err);
  }
});

// GET /api/grocery-lists/:id - one list with its items
router.get("/:id", async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id);
    const list = id
      ? await groceryLists().findOne(
          { _id: id, userId: req.user._id },
          { projection: HIDE_OWNER },
        )
      : null;
    if (!list) {
      return res.status(404).json({ error: "Grocery list not found." });
    }
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// PUT /api/grocery-lists/:id - update { name?, items? }, items replaces the whole array
// Checking off, editing quantities and adding custom items all send the full items array
router.put("/:id", async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) {
      return res.status(404).json({ error: "Grocery list not found." });
    }
    const body = req.body ?? {};
    const update = {};
    if (body.name !== undefined) {
      update.name = parseName(body.name);
      if (!update.name) {
        return res
          .status(400)
          .json({ error: `Name must be 1-${MAX_NAME} characters.` });
      }
    }
    if (body.items !== undefined) {
      const { error, items } = parseItems(body.items);
      if (error) {
        return res.status(400).json({ error });
      }
      update.items = items;
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nothing to update." });
    }

    // updateOne + findOne, matching pantry.js
    const owned = { _id: id, userId: req.user._id }; // userId filter blocks editing others' lists
    const { matchedCount } = await groceryLists().updateOne(owned, {
      $set: { ...update, updatedAt: new Date() },
    });
    if (!matchedCount) {
      return res.status(404).json({ error: "Grocery list not found." });
    }
    res.json(await groceryLists().findOne(owned, { projection: HIDE_OWNER })); // updated list
  } catch (err) {
    next(err);
  }
});

// DELETE /api/grocery-lists/:id - remove a list
router.delete("/:id", async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id);
    const { deletedCount } = id
      ? await groceryLists().deleteOne({ _id: id, userId: req.user._id })
      : { deletedCount: 0 };
    if (!deletedCount)
      return res.status(404).json({ error: "Grocery list not found." });
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;

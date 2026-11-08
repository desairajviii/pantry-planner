// Pantry routes: list, add, edit, delete items, and pantry-based recipe search
// Mounted in server.js as app.use("/api/pantry", pantryRouter)
import { Router } from "express";
import { toObjectId } from "../utils/objectId.js";
import { getDb } from "../db/connection.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { buildFilter } from "../utils/tags.js";
import {
  normalizeName,
  escapeRegex,
  isStaple,
  toPantryTerms,
  scoreIngredients,
} from "../utils/ingredientMatch.js";

const router = Router();

const MAX_NAME = 100; // max characters for an item name
const MAX_QUANTITY = 50; // max characters for free-text quantity
const DEFAULT_MAX_MISSING = 3; // search default
const RESULT_LIMIT = 50; // cap search payload size
const SOON_DAYS = 3; // expiring soon window (days)
const DAY_MS = 24 * 60 * 60 * 1000; // one day in milliseconds

router.use(requireAuth);

// Get the pantry collection from db
const pantry = () => getDb().collection("pantry");

// Parse a use-by date from "YYYY-MM-DD" into a Date at UTC midnight
// Returns { value: Date }, { value: null } to clear it, or { error } on bad input
// raw = body.useBy
function parseUseBy(raw) {
  if (raw === null || raw === "") {
    return { value: null }; // empty clears the date
  }
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { error: "Use-by date must be YYYY-MM-DD." };
  }
  const date = new Date(`${raw}T00:00:00Z`); // UTC midnight

  // Reject invalid dates
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    return { error: "Use-by date is not a real date." };
  }
  return { value: date };
}

// Validate and clean name, quantity, and use-by date from a request body
// partial = true for PUT
function parseItem(body, partial) {
  const fields = {};

  // name required on create, optional on edit
  if (body.name !== undefined || !partial) {
    if (typeof body.name !== "string") {
      return { error: "Name is required." };
    }
    const name = normalizeName(body.name);
    if (!name) {
      return { error: "Name cannot be empty." };
    }
    if (name.length > MAX_NAME) {
      return { error: `Name must be ${MAX_NAME} characters or fewer.` };
    }
    fields.name = name;
  }

  // quantity is optional free text
  if (body.quantity !== undefined) {
    if (typeof body.quantity !== "string") {
      return { error: "Quantity must be text." };
    }
    const quantity = body.quantity.trim();
    if (quantity.length > MAX_QUANTITY) {
      return { error: `Quantity must be ${MAX_QUANTITY} characters or fewer.` };
    }
    fields.quantity = quantity;
  }

  // useBy is optional, "" or null clears it
  if (body.useBy !== undefined) {
    const { error, value } = parseUseBy(body.useBy);
    if (error) {
      return { error };
    }
    fields.useBy = value;
  }

  // edit must change something
  if (partial && Object.keys(fields).length === 0) {
    return { error: "Nothing to update." };
  }
  return { fields };
}

// Check if user already has an item with this name
// exclude = item being edited - so renaming to its own name isn't a conflict
async function nameTaken(userId, name, exclude) {
  const filter = { userId, name };
  if (exclude) {
    filter._id = { $ne: exclude }; // ignore item being edited
  }
  const match = await pantry().findOne(filter, { projection: { _id: 1 } });
  return Boolean(match);
}

// Parse "?maxMissing=" into a non-negative integer
// raw = req.query.maxMissing
function parseMaxMissing(raw) {
  if (raw === undefined || raw === "") {
    return DEFAULT_MAX_MISSING; // return the default if missing, null if invalid
  }
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

// Resolve "today" for the expiring window as milliseconds at UTC midnight
// Uses the client's local date (?today=YYYY-MM-DD) when it is within one day of the
// server's UTC date otherwise falls back to the UTC date
// raw = req.query.today, now = current time
function resolveToday(raw, now = new Date()) {
  const utcToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ); // server's date at UTC midnight
  const { error, value } = parseUseBy(raw ?? "");
  if (error || !value) {
    return utcToday; // keep the old UTC behavior
  }
  const offset = Math.abs(value.getTime() - utcToday); // distance from the server's date
  return offset <= DAY_MS ? value.getTime() : utcToday; // reject dates no real timezone could produce
}

// Pick names of items whose use-by date falls between today & today + SOON_DAYS (inclusive)
// Expired items are excluded
/// items = pantry docs with name and useBy, today = output of resolveToday()
function expiringTerms(items, today) {
  const last = today + SOON_DAYS * DAY_MS; // last day of the "soon" window
  const soon = items
    .filter((item) => item.useBy) // only items with a date
    .filter((item) => {
      const day = item.useBy.getTime(); // stored at UTC midnight
      return day >= today && day <= last; // inside the window, not expired
    })
    .map((item) => item.name); // keep the name only
  return toPantryTerms(soon); // normalize
}

// GET /api/pantry - list user's pantry alphabetically
router.get("/", async (req, res, next) => {
  try {
    const items = await pantry()
      .find({ userId: req.user._id })
      .sort({ name: 1 })
      .toArray();
    res.json(items);
  } catch (err) {
    next(err); // send errors to error handler in server.js
  }
});

// GET /api/pantry/search?tags=&maxMinutes=&maxSteps=&maxMissing= - recipes ranked by pantry coverage
router.get("/search", async (req, res, next) => {
  try {
    const maxMissing = parseMaxMissing(req.query.maxMissing);
    if (maxMissing === null) {
      return res
        .status(400)
        .json({ error: "maxMissing must be a whole number, 0 or more." });
    }

    // load user's pantry names and use-by dates
    const items = await pantry()
      .find({ userId: req.user._id }, { projection: { name: 1, useBy: 1 } })
      .toArray();
    const terms = toPantryTerms(items.map((item) => item.name)); // all match terms
    const soonTerms = expiringTerms(items, resolveToday(req.query.today)); // subset expiring soon, for ranking

    // staples don't drive the candidate query
    const queryTerms = terms.filter((term) => !isStaple(term));
    if (queryTerms.length === 0) {
      return res.json([]);
    }

    const filter = buildFilter(req.query);
    filter.ingredients = {
      $in: queryTerms.map((term) => new RegExp(escapeRegex(term))), // substring match per term
    };

    const candidates = await getDb()
      .collection("recipes")
      .find(filter, { projection: { steps: 0, description: 0 } })
      .toArray();

    // score recipe ingredients, keep those within maxMissing, rank, cap
    const results = candidates
      .map((recipe) => ({
        ...recipe,
        ...scoreIngredients(recipe.ingredients, terms, soonTerms),
      }))
      .filter((recipe) => recipe.missing.length <= maxMissing)
      .sort(
        (a, b) =>
          a.missing.length - b.missing.length || // sort by fewest missing
          b.expiringUsed - a.expiringUsed || // then most soon-to-expire items used
          b.coverage - a.coverage, // then highest coverage
      )
      .slice(0, RESULT_LIMIT);

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// POST /api/pantry - add an item
router.post("/", async (req, res, next) => {
  try {
    const { error, fields } = parseItem(req.body ?? {}, false);
    if (error) {
      return res.status(400).json({ error });
    }

    // reject duplicates so search and grocery matching see one entry per item
    if (await nameTaken(req.user._id, fields.name)) {
      return res
        .status(409)
        .json({ error: `"${fields.name}" is already in your pantry.` });
    }

    const now = new Date(); // same timestamp for created and updated
    const item = {
      userId: req.user._id,
      name: fields.name,
      quantity: fields.quantity ?? "", // quantity is optional, default empty
      useBy: fields.useBy ?? null, // optional, null when not set
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await pantry().insertOne(item);
    res.status(201).json({ ...item, _id: insertedId }); // return saved item
  } catch (err) {
    next(err);
  }
});

// PUT /api/pantry/:id - edit name, quantity, and/or useBy
router.put("/:id", async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) {
      return res.status(404).json({ error: "Item not found." });
    }

    const { error, fields } = parseItem(req.body ?? {}, true);
    if (error) {
      return res.status(400).json({ error });
    }

    // renaming onto another existing item is a conflict
    if (fields.name && (await nameTaken(req.user._id, fields.name, id))) {
      return res
        .status(409)
        .json({ error: `"${fields.name}" is already in your pantry.` });
    }

    const owned = { _id: id, userId: req.user._id }; // userId filter blocks editing others' items
    const { matchedCount } = await pantry().updateOne(owned, {
      $set: { ...fields, updatedAt: new Date() },
    });
    if (!matchedCount) {
      return res.status(404).json({ error: "Item not found." });
    }
    res.json(await pantry().findOne(owned)); // respond with the updated item
  } catch (err) {
    next(err);
  }
});

// DELETE /api/pantry/:id - remove an item
router.delete("/:id", async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(404).json({ error: "Item not found." });

    const { deletedCount } = await pantry().deleteOne({
      _id: id,
      userId: req.user._id,
    });
    if (!deletedCount)
      return res.status(404).json({ error: "Item not found." });
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;

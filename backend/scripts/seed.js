// Usage: npm run seed   (run from backend/, --env-file in the npm script loads .env)
// Production: MONGO_URI="<Atlas string>" npm run seed
import { readFile } from "fs/promises";
import { connect, close } from "../db/connection.js";

const MIN_RECIPES = 1000; // min records as required by rubric
const DATA_FILE = new URL("../../data/recipes.json", import.meta.url);

// Load the raw recipe array from the json file
async function loadSource() {
  const text = await readFile(DATA_FILE, "utf8");
  return JSON.parse(text);
}

// Validate one raw record and add stepCount field
// recipe = one object from the json file
function toRecipe(recipe) {
  // Reject records with no name or no steps array
  if (!recipe.name || !Array.isArray(recipe.steps)) {
    return null;
  }
  // Keep all fields
  // stepCount turns "3 steps or less" filter into plain indexed query
  return { ...recipe, stepCount: recipe.steps.length };
}

// Convert raw records to recipe documents and drop invalid ones
// source = parsed array from loadSource()
function buildRecipes(source) {
  const recipes = source.map(toRecipe).filter(Boolean); // drop records toRecipe rejected (null)

  console.log(`Loaded ${source.length} recipes - ${recipes.length} valid.`);
  return recipes;
}

// Replace live recipes collection via a staging collection
// Build and index the new data first, then swap it in
// failure before the rename leaves the live data untouched
// db = db connection handle; recipes = validated documents
async function replaceRecipes(db, recipes) {
  const staging = db.collection("recipes_staging");

  await staging.drop().catch(() => {}); // clear leftovers from a failed run, ignore if none
  await staging.insertMany(recipes, { ordered: false });

  await staging.createIndexes([
    { key: { tags: 1 } },
    { key: { ingredients: 1 } },
    { key: { minutes: 1 } },
    { key: { stepCount: 1 } },
    { key: { name: "text" } },
  ]);

  await staging.rename("recipes", { dropTarget: true }); // replace the live collection
}

// Run the full seed
async function seed() {
  const recipes = buildRecipes(await loadSource()); // load and validate recipes

  // Throw error if too few recipes survived validation
  if (recipes.length < MIN_RECIPES) {
    throw new Error(
      `Only ${recipes.length} recipes (minimum ${MIN_RECIPES}); database left unchanged.`,
    );
  }

  const db = await connect();
  await replaceRecipes(db, recipes); // swap in the new data

  // Check that the data landed and stepCount is queryable
  const col = db.collection("recipes");
  const total = await col.countDocuments(); // count recipes
  const shortCount = await col.countDocuments({ stepCount: { $lte: 3 } }); // count recipes with 3 steps or less
  console.log(
    `Complete. ${total} recipes in "${db.databaseName}", ${shortCount} with 3 steps or less.`,
  );
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(close);

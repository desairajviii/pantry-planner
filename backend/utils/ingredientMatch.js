// Shared pantry-matching logic to be used by pantry search and grocery list generation
 
const STAPLES = ["salt", "pepper", "water", "oil"];
 
// normalize ingredient/pantry item name
// name = raw ingredient or pantry item name
export function normalizeName(name) {
  return String(name) 
    .trim() 
    .toLowerCase() 
    .replace(/\s+/g, " ");
}
 
// Escape regex characters so a pantry item name matches in Mongo $regex
// name = normalized pantry item name
export function escapeRegex(name) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
 
// Check whether a pantry item name is a staple
// name = normalized pantry item name
export function isStaple(name) {
  return STAPLES.includes(name);
}
 
// Turn pantry item names into valid  terms
// names = array of pantry item names
export function toPantryTerms(names) {
  const terms = names
    .map(normalizeName) // normalize each name
    .filter(Boolean); // drop empty strings
  return [...new Set(terms)]; // remove duplicates
}
 
// Deetermine if one recipe ingredient is covered by the pantry
// i.e, if ingredient is a staple or pantry term
// ingredient = recipe ingredient, pantryTerms = output of toPantryTerms()
export function isCovered(ingredient, pantryTerms) {
  const item = normalizeName(ingredient);
  const contains = (term) => item.includes(term); 
  return STAPLES.some(contains) || pantryTerms.some(contains);
}
 
// Score a recipe's ingredients against the pantry items
// ingredients = recipe ingredient, pantryTerms = output of toPantryTerms()
export function scoreIngredients(ingredients, pantryTerms) {
  const missing = ingredients.filter((ing) => !isCovered(ing, pantryTerms)); // uncovered ingredients
  const total = ingredients.length;
  const coverage = total ? (total - missing.length) / total : 0; // avoid zero division
  return { missing, coverage };
}

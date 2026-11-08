import { useEffect, useState } from "react";
import { getFilterGroups } from "../../api/recipes.js";
import { searchPantry } from "../../api/pantry.js";
import AddToPlanDialog from "../AddToPlanDialog/AddToPlanDialog.jsx";
import FilterPanel from "../FilterPanel/FilterPanel.jsx";
import RecipeCard from "../RecipeCard/RecipeCard.jsx";
import RecipeDetail from "../RecipeDetail/RecipeDetail.jsx";
import "./PantrySearch.css";

const EMPTY_FILTERS = { tags: [], maxMinutes: null, maxSteps: null };
const MISSING_OPTIONS = [0, 1, 2, 3, 5]; // options for "missing at most"
const DEFAULT_MAX_MISSING = 3; // matches backend
const RESULT_LIMIT = 50; // max results returned by backend

// One string per search, to checj if the results on screen
// match the current filters
function searchKey(filters, maxMissing) {
  return JSON.stringify([filters, maxMissing]);
}

// Text for result count line
function countText(loading, count) {
  if (loading) {
    return "Finding recipes…";
  }
  if (count === RESULT_LIMIT) {
    return `Top ${RESULT_LIMIT} matches`; 
  }
  return `${count} ${count === 1 ? "recipe" : "recipes"}`;
}

// Recipes ranked by pantry coverage of ingredients, with filters,
// a cap on missing ingredients, and detail view + add-to-plan flow
function PantrySearch() {
  const [groups, setGroups] = useState([]); // filter groups from the API
  const [groupsError, setGroupsError] = useState(""); // filter load failure
  const [filters, setFilters] = useState(EMPTY_FILTERS); // tags/time/steps
  const [maxMissing, setMaxMissing] = useState(DEFAULT_MAX_MISSING); // missing ingredient cap
  const [response, setResponse] = useState({
    key: null,
    results: [],
    error: "",
  });
  const [selectedId, setSelectedId] = useState(null); // recipe being viewed
  const [recipeToAdd, setRecipeToAdd] = useState(null); // open in the dialog

  // Load filter options once
  useEffect(() => {
    let ignore = false; // set on unmount so late response is dropped
    getFilterGroups()
      .then((data) => {
        if (!ignore) setGroups(data);
      })
      .catch((err) => {
        if (!ignore) setGroupsError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Search whenever filters or missing cap change
  // a response that arrives after a new search started is ignored
  useEffect(() => {
    const key = searchKey(filters, maxMissing); // identifies the request
    let ignore = false;

    searchPantry({ ...filters, maxMissing })
      .then((results) => {
        if (!ignore) setResponse({ key, results, error: "" });
      })
      .catch((err) => {
        if (!ignore) setResponse({ key, results: [], error: err.message });
      });

    return () => {
      ignore = true;
    };
  }, [filters, maxMissing]);

  // Loading until the response matches the current selection
  const loading = response.key !== searchKey(filters, maxMissing);
  const { results, error } = response;

  // Shown on top of either results or  detail view
  const dialog = recipeToAdd && (
    <AddToPlanDialog
      recipe={recipeToAdd}
      onClose={() => setRecipeToAdd(null)}
    />
  );

  // Show one recipe instead of results 
  // PantrySearch stays mounted so filters and results are preserved when the user goes back
  if (selectedId) {
    return (
      <>
        <RecipeDetail
          recipeId={selectedId}
          onBack={() => setSelectedId(null)}
          onAddToPlan={setRecipeToAdd}
        />
        {dialog}
      </>
    );
  }

  return (
    <section className="pantry-search">
      <h1 className="pantry-search_title">Cook from pantry</h1>
      <p className="pantry-search_intro">
        Recipes with the fewest missing ingredients come first. Among equals,
        recipes that use items expiring soon rank higher. Salt, pepper, water
        and oil count as always on hand.
      </p>

      <div className="pantry-search_layout">
        <FilterPanel
          groups={groups}
          selected={filters}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />

        <div className="pantry-search_results">
          <div className="pantry-search_missing-cap">
            <label htmlFor="pantry-search-max-missing">
              Missing ingredients, at most
            </label>
            <select
              id="pantry-search-max-missing"
              value={maxMissing}
              onChange={(e) => setMaxMissing(Number(e.target.value))} // select values are strings
            >
              {MISSING_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {(groupsError || error) && (
            <p className="pantry-search_error" role="alert">
              {error || groupsError}
            </p>
          )}

          <p className="pantry-search_count" aria-live="polite">
            {countText(loading, results.length)}
          </p>

          {!loading && !error && results.length === 0 && (
            <p className="pantry-search_empty">
              No recipes found. Add items to your pantry, allow more missing
              ingredients, or remove a filter.
            </p>
          )}

          <ul className="pantry-search_grid">
            {results.map((recipe) => (
              <li key={recipe._id}>
                {recipe.expiringUsed > 0 && (
                  <p className="pantry-search_expiring">
                    Uses {recipe.expiringUsed}{" "}
                    {recipe.expiringUsed === 1 ? "item" : "items"} expiring soon
                  </p>
                )}
                <RecipeCard
                  recipe={recipe}
                  onSelect={setSelectedId}
                  onAddToPlan={setRecipeToAdd}
                  missingIngredients={recipe.missing}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {dialog}
    </section>
  );
}

export default PantrySearch;

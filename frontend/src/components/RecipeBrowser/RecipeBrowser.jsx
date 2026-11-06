import { useEffect, useState } from "react";
import { getFilterGroups, getRecipes } from "../../api/recipes.js";
import AddToPlanDialog from "../AddToPlanDialog/AddToPlanDialog.jsx";
import FilterPanel from "../FilterPanel/FilterPanel.jsx";
import RecipeCard from "../RecipeCard/RecipeCard.jsx";
import RecipeDetail from "../RecipeDetail/RecipeDetail.jsx";
import "./RecipeBrowser.css";

const EMPTY_FILTERS = { tags: [], maxMinutes: null, maxSteps: null };
const PAGE_SIZE = 12;

// One string per search, used to tell whether the results on screen
// match what's currently selected
function searchKey(filters, search, page) {
  return JSON.stringify([filters, search, page]);
}

// Search, filter, and page through recipes, open one to see its details,
// and add recipes to a meal plan
function RecipeBrowser() {
  const [groups, setGroups] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState(""); // what's typed
  const [search, setSearch] = useState(""); // what was submitted
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState({
    key: null,
    data: null,
    error: "",
  });
  const [selectedId, setSelectedId] = useState(null); // recipe being viewed
  const [recipeToAdd, setRecipeToAdd] = useState(null); // open in the dialog

  // Load the filter options once
  useEffect(() => {
    getFilterGroups()
      .then(setGroups)
      .catch((err) => setResponse((prev) => ({ ...prev, error: err.message })));
  }, []);

  // Fetch recipes whenever the filters, search, or page change.
  // If the user changes filters again before a request finishes, the older
  // response is ignored, so the list never shows outdated results.
  useEffect(() => {
    const key = searchKey(filters, search, page);
    let ignore = false;

    getRecipes({ ...filters, q: search, page, limit: PAGE_SIZE })
      .then((data) => {
        if (!ignore) setResponse({ key, data, error: "" });
      })
      .catch((err) => {
        if (!ignore) setResponse({ key, data: null, error: err.message });
      });

    return () => {
      ignore = true;
    };
  }, [filters, search, page]);

  // Results are loading until the response matches the current selection
  const loading = response.key !== searchKey(filters, search, page);
  const recipes = response.data?.recipes ?? [];
  const total = response.data?.total ?? 0;
  const pages = response.data?.pages ?? 1;

  // Any change to the filters or search goes back to page 1
  function updateFilters(next) {
    setFilters(next);
    setPage(1);
  }

  function handleSearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  // Shown on top of either the grid or the detail view
  const dialog = recipeToAdd && (
    <AddToPlanDialog
      recipe={recipeToAdd}
      onClose={() => setRecipeToAdd(null)}
    />
  );

  // Show one recipe instead of the grid. RecipeBrowser stays mounted, so
  // the filters, search, and page are still there when the user goes back.
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
    <section className="recipe-browser">
      <h1 className="recipe-browser_title">Recipes</h1>

      <form
        className="recipe-browser_search"
        role="search"
        onSubmit={handleSearch}
      >
        <label htmlFor="recipe-search" className="recipe-browser_search-label">
          Search by name
        </label>
        <input
          id="recipe-search"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="e.g. pasta, curry, soup"
        />
        <button type="submit">Search</button>
      </form>

      <div className="recipe-browser_layout">
        <FilterPanel
          groups={groups}
          selected={filters}
          onChange={updateFilters}
          onClear={() => updateFilters(EMPTY_FILTERS)}
        />

        <div className="recipe-browser_results">
          {response.error && (
            <p className="recipe-browser_error" role="alert">
              {response.error}
            </p>
          )}

          {search && (
            <p className="recipe-browser_active-search">
              Showing results for “{search}”{" "}
              <button
                type="button"
                className="recipe-browser_clear-search"
                onClick={clearSearch}
              >
                Clear search
              </button>
            </p>
          )}

          <p className="recipe-browser_count" aria-live="polite">
            {loading
              ? "Loading recipes…"
              : `${total.toLocaleString("en-US")} ${total === 1 ? "recipe" : "recipes"}`}
          </p>

          {!loading && !response.error && recipes.length === 0 && (
            <p className="recipe-browser_empty">
              No recipes match these filters. Try removing one.
            </p>
          )}

          <ul className="recipe-browser_grid">
            {recipes.map((recipe) => (
              <li key={recipe._id}>
                <RecipeCard
                  recipe={recipe}
                  onSelect={setSelectedId}
                  onAddToPlan={setRecipeToAdd}
                />
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav className="recipe-browser_pager" aria-label="Recipe pages">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1 || loading}
              >
                Previous
              </button>
              <span>
                Page {page} of {pages.toLocaleString("en-US")}
              </span>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= pages || loading}
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </div>

      {dialog}
    </section>
  );
}

export default RecipeBrowser;

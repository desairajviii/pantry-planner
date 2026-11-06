import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { getPlanSuggestions } from "../../api/mealPlans.js";
import RecipeCard from "../RecipeCard/RecipeCard.jsx";
import AddToPlanDialog from "../AddToPlanDialog/AddToPlanDialog.jsx";
import "./ReuseSuggestions.css";

// Suggests recipes that reuse ingredients the plan already needs, so
// leftovers from one meal go into another instead of the trash.
// planVersion changes every time the plan is saved, which reloads the list.
function ReuseSuggestions({ planId, planVersion, mealCount, onPlanChanged }) {
  const key = `${planId}:${planVersion}`;
  const [result, setResult] = useState({
    key: null,
    suggestions: [],
    error: "",
  });
  const [dialogRecipe, setDialogRecipe] = useState(null);

  useEffect(() => {
    let ignore = false;
    getPlanSuggestions(planId)
      .then((data) => {
        if (!ignore)
          setResult({ key, suggestions: data.suggestions, error: "" });
      })
      .catch((err) => {
        if (!ignore) setResult({ key, suggestions: [], error: err.message });
      });
    return () => {
      ignore = true;
    };
  }, [planId, key]);

  const loading = result.key !== key;

  // The dialog may have added a meal, so the planner reloads the plan
  function handleDialogClose() {
    setDialogRecipe(null);
    onPlanChanged();
  }

  return (
    <section className="reuse-suggestions" aria-labelledby="reuse-heading">
      <h2 id="reuse-heading" className="reuse-suggestions_title">
        Use up what you&apos;re buying
      </h2>
      <p className="reuse-suggestions_intro">
        These recipes share ingredients with meals already in this plan, so
        leftovers don&apos;t go to waste.
      </p>

      {loading && <p className="reuse-suggestions_status">Finding recipes…</p>}

      {!loading && result.error && (
        <p className="reuse-suggestions_error" role="alert">
          {result.error}
        </p>
      )}

      {!loading && !result.error && result.suggestions.length === 0 && (
        <p className="reuse-suggestions_status">
          {mealCount === 0
            ? "Add a few meals to this plan to see recipes that reuse their ingredients."
            : "No other recipes share two or more ingredients with this plan yet."}
        </p>
      )}

      {!loading && result.suggestions.length > 0 && (
        <ul className="reuse-suggestions_list">
          {result.suggestions.map((recipe) => (
            <li key={recipe._id} className="reuse-suggestions_item">
              <RecipeCard recipe={recipe} onAddToPlan={setDialogRecipe} />
              <p className="reuse-suggestions_shared">
                Reuses {recipe.sharedIngredients.length}:{" "}
                {recipe.sharedIngredients.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {dialogRecipe && (
        <AddToPlanDialog
          recipe={dialogRecipe}
          initialPlanId={planId}
          onClose={handleDialogClose}
        />
      )}
    </section>
  );
}

ReuseSuggestions.propTypes = {
  planId: PropTypes.string.isRequired,
  planVersion: PropTypes.string.isRequired,
  mealCount: PropTypes.number.isRequired,
  onPlanChanged: PropTypes.func.isRequired,
};

export default ReuseSuggestions;

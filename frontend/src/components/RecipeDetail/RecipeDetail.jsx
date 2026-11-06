import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { getRecipe } from "../../api/recipes.js";
import "./RecipeDetail.css";

// One recipe with its ingredients and steps
function RecipeDetail({ recipeId, onBack, onAddToPlan }) {
  const [response, setResponse] = useState({
    id: null,
    recipe: null,
    error: "",
  });

  // Load the recipe; ignore the answer if a different recipe was opened meanwhile
  useEffect(() => {
    let ignore = false;

    getRecipe(recipeId)
      .then((recipe) => {
        if (!ignore) setResponse({ id: recipeId, recipe, error: "" });
      })
      .catch((err) => {
        if (!ignore) {
          setResponse({ id: recipeId, recipe: null, error: err.message });
        }
      });

    return () => {
      ignore = true;
    };
  }, [recipeId]);

  const loading = response.id !== recipeId;
  const { recipe, error } = response;

  return (
    <article className="recipe-detail">
      <button type="button" className="recipe-detail_back" onClick={onBack}>
        ← Back to recipes
      </button>

      {loading && <p className="recipe-detail_status">Loading recipe…</p>}

      {!loading && error && (
        <p className="recipe-detail_error" role="alert">
          {error}
        </p>
      )}

      {!loading && recipe && (
        <>
          <h1 className="recipe-detail_name">{recipe.name}</h1>
          <p className="recipe-detail_meta">
            {recipe.minutes} min, {recipe.ingredients.length} ingredients,{" "}
            {recipe.steps.length} steps
          </p>

          {recipe.description && (
            <p className="recipe-detail_description">{recipe.description}</p>
          )}

          {onAddToPlan && (
            <button
              type="button"
              className="recipe-detail_add"
              onClick={() => onAddToPlan(recipe)}
            >
              Add to plan
            </button>
          )}

          <div className="recipe-detail_columns">
            <section aria-labelledby="recipe-ingredients-heading">
              <h2 id="recipe-ingredients-heading">Ingredients</h2>
              <ul className="recipe-detail_ingredients">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={`${index}-${ingredient}`}>{ingredient}</li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="recipe-steps-heading">
              <h2 id="recipe-steps-heading">Steps</h2>
              <ol className="recipe-detail_steps">
                {recipe.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </section>
          </div>

          <p className="recipe-detail_source">
            Recipe from Food.com, via the Food.com Recipes and Interactions
            dataset on Kaggle (CC BY 4.0).
          </p>
        </>
      )}
    </article>
  );
}

RecipeDetail.propTypes = {
  recipeId: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
  onAddToPlan: PropTypes.func,
};

export default RecipeDetail;

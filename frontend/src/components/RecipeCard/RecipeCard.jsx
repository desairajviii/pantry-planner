import PropTypes from "prop-types";
import "./RecipeCard.css";

// Diet tags worth showing on the card. They're labeled "tagged" because
// Food.com sets them and they aren't verified.
const BADGE_TAGS = ["vegetarian", "vegan"];

// One recipe in a list. Used by the recipe browser and by pantry search.
// - onSelect: opens the recipe's detail view (optional)
// - onAddToPlan: shows an "Add to plan" button (optional)
// - missingIngredients: pantry search passes what the user doesn't have (optional)
function RecipeCard({ recipe, onSelect, onAddToPlan, missingIngredients }) {
  const tags = recipe.tags ?? [];
  const badges = tags.filter((tag) => BADGE_TAGS.includes(tag));
  const ingredientCount = recipe.ingredients?.length ?? 0;

  return (
    <article className="recipe-card">
      <h3 className="recipe-card_name">
        {onSelect ? (
          <button
            type="button"
            className="recipe-card_name-button"
            onClick={() => onSelect(recipe._id)}
          >
            {recipe.name}
          </button>
        ) : (
          recipe.name
        )}
      </h3>

      <p className="recipe-card_meta">
        {recipe.minutes} min, {ingredientCount} ingredients
        {recipe.stepCount !== undefined && `, ${recipe.stepCount} steps`}
      </p>

      {badges.length > 0 && (
        <ul className="recipe-card_badges">
          {badges.map((tag) => (
            <li key={tag} className="recipe-card_badge">
              Tagged {tag}
            </li>
          ))}
        </ul>
      )}

      {missingIngredients &&
        (missingIngredients.length === 0 ? (
          <p className="recipe-card_missing recipe-card_missing--none">
            You have everything for this recipe.
          </p>
        ) : (
          <p className="recipe-card_missing">
            Missing: {missingIngredients.join(", ")}
          </p>
        ))}

      {onAddToPlan && (
        <button
          type="button"
          className="recipe-card_add"
          onClick={() => onAddToPlan(recipe)}
        >
          Add to plan
        </button>
      )}
    </article>
  );
}

RecipeCard.propTypes = {
  recipe: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    minutes: PropTypes.number.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string),
    ingredients: PropTypes.arrayOf(PropTypes.string),
    stepCount: PropTypes.number,
  }).isRequired,
  onSelect: PropTypes.func,
  onAddToPlan: PropTypes.func,
  missingIngredients: PropTypes.arrayOf(PropTypes.string),
};

export default RecipeCard;

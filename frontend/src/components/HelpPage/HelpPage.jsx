import PropTypes from "prop-types";
import { SOON_DAYS } from "../../utils/expiry.js";
import "./HelpPage.css";

// Page sections in order
const SECTIONS = [
  { id: "help-recipes", title: "Find recipes" },
  { id: "help-plans", title: "Plan your week" },
  { id: "help-pantry", title: "Your pantry" },
  { id: "help-cook", title: "Cook from pantry" },
  { id: "help-use-up", title: "Use up ingredients" },
  { id: "help-grocery", title: "Grocery lists" },
  { id: "help-data", title: "About the data" },
];

const DATASET_URL =
  "https://www.kaggle.com/datasets/shuyangli94/food-com-recipes-and-user-interactions"; // Food.com source on Kaggle

// One help section - heading from SECTIONS plus its content
// id = SECTIONS id, children = section content
function HelpSection({ id, children }) {
  const { title } = SECTIONS.find((section) => section.id === id);
  return (
    <section
      id={id}
      className="help-page_section"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`} className="help-page_section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

HelpSection.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

// Usage instructions for every screen, with links to each section
function HelpPage() {
  return (
    <article className="help-page">
      {/* page heading and intro */}
      <h1 className="help-page_title">How to use Pantry Planner</h1>
      <p className="help-page_intro">
        Pantry Planner helps you plan a week of meals around what you already
        have. Keep your pantry up to date, find recipes that use it, plan your
        week, then generate a grocery list of only what’s missing.
      </p>

      {/* in-page links, one per section */}
      <nav className="help-page_toc" aria-labelledby="help-toc-title">
        <h2 id="help-toc-title" className="help-page_toc-title">
          On this page
        </h2>
        <ul className="help-page_toc-list">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Recipes screen */}
      <HelpSection id="help-recipes">
        <ol className="help-page_steps">
          <li>
            Open <strong>Recipes</strong>. Type part of a recipe name under{" "}
            <strong>Search by name</strong> and choose <strong>Search</strong>,
            or page through all recipes with <strong>Previous</strong> and{" "}
            <strong>Next</strong>.
          </li>
          <li>
            Narrow the list with <strong>Filters</strong>. Ticked boxes combine,
            so a recipe must match every one; ticking two cuisines or two
            courses usually finds nothing. Time and Steps take one choice, or{" "}
            <strong>Any</strong>. <strong>Clear filters</strong> resets them.
          </li>
          <li>
            Select a recipe’s name to see its ingredients and steps.{" "}
            <strong>Back to recipes</strong> returns you to the same results,
            with your filters still set.
          </li>
          <li>
            Choose <strong>Add to plan</strong> on a recipe card or recipe page
            to put it in a meal plan.
          </li>
        </ol>
      </HelpSection>

      {/* Meal plans screen and the add-to-plan dialog */}
      <HelpSection id="help-plans">
        <ol className="help-page_steps">
          <li>
            Open <strong>Meal plans</strong>. Under <strong>New plan</strong>,
            enter a name and the <strong>Week starting</strong> date (the coming
            Monday by default), then choose <strong>Create plan</strong>. The
            new plan opens straight away.
          </li>
          <li>
            A plan is a grid of 21 meals: breakfast, lunch and dinner for each
            day of the week.
          </li>
          <li>
            To fill a meal, choose <strong>Add to plan</strong> on any recipe.
            Pick the plan, day and meal, then choose{" "}
            <strong>Add to plan</strong> again. If that meal already has a
            recipe, you’ll see a warning that it will be replaced.
          </li>
          <li>
            In the plan, <strong>Remove</strong> clears a meal, and{" "}
            <strong>Save details</strong> saves a new name or week.
          </li>
        </ol>
        <p className="help-page_note">
          Deleting a plan can’t be undone. Grocery lists made from it are kept.
        </p>
      </HelpSection>

      {/* Pantry screen */}
      <HelpSection id="help-pantry">
        <ol className="help-page_steps">
          <li>
            Open <strong>Pantry</strong>. Under <strong>Add an item</strong>,
            enter a name and, if you like, a quantity and use-by date, then
            choose <strong>Add item</strong>.
          </li>
          <li>
            Use short, general names. An item counts when its name appears in a
            recipe ingredient, so “onion” covers “red onion”, but “red onion”
            doesn’t cover “onion”.
          </li>
          <li>
            Choose <strong>Edit</strong> to change an item or{" "}
            <strong>Remove</strong> to take it out as you use it up.
          </li>
        </ol>
        <p className="help-page_note">
          Salt, pepper, water and oil always count as on hand, so you don’t need
          to add them.
        </p>
      </HelpSection>

      {/* Cook from pantry screen */}
      <HelpSection id="help-cook">
        <ol className="help-page_steps">
          <li>
            Open <strong>Cook from pantry</strong>. Recipes missing the fewest
            ingredients come first. Each card lists what’s missing, or says you
            have everything.
          </li>
          <li>
            Change <strong>Missing ingredients, at most</strong> to allow more
            or fewer. Choose 0 to see only recipes you can make now. The default
            is 3.
          </li>
          <li>
            The same filters as Recipes apply. Up to 50 matches are shown.
          </li>
          <li>
            Open a recipe or choose <strong>Add to plan</strong>, as on Recipes.{" "}
            <strong>Back to recipes</strong> returns you to these results.
          </li>
        </ol>
      </HelpSection>

      {/* stretch features - reuse suggestions and use-by dates */}
      <HelpSection id="help-use-up">
        <p>Two features help you waste less food.</p>

        <h3 className="help-page_subtitle">Reuse suggestions</h3>
        <p>
          Open a meal plan and scroll to{" "}
          <strong>Use up what you’re buying</strong>. It lists recipes that
          share two or more ingredients with meals already in the plan, and
          names the shared ones. Choose <strong>Add to plan</strong> to add one.
          Suggestions appear once the plan has a few meals and update as you
          change it.
        </p>

        <h3 className="help-page_subtitle">Use-by dates</h3>
        <p>
          Give pantry items the <strong>Use by</strong> date from the package.
          Items due within {SOON_DAYS} days are marked “Use soon”, and items
          past their date are marked “Expired”, with a count at the top of the
          pantry. <strong>Cook from pantry</strong> ranks recipes that use
          soon-to-expire items higher and labels them “Uses N items expiring
          soon”.
        </p>
        <p className="help-page_note">
          Expired items still count as in stock for recipe search and grocery
          lists, so remove anything you’ve thrown out.
        </p>
      </HelpSection>

      {/* Grocery lists screen */}
      <HelpSection id="help-grocery">
        <ol className="help-page_steps">
          <li>
            Open <strong>Grocery lists</strong>. Under{" "}
            <strong>New list from a meal plan</strong>, choose a plan and,
            optionally, a name, then choose <strong>Generate list</strong>.
            Plans with no meals can’t be chosen.
          </li>
          <li>
            The list has every ingredient in the plan except those your pantry
            or the staples cover. Each item shows how many planned meals use it.
          </li>
          <li>
            Tick items off as you shop. Use <strong>Edit</strong> and{" "}
            <strong>Remove</strong> on any item, or add your own (like paper
            towels) under <strong>Add an item</strong>. Every change saves
            straight away.
          </li>
          <li>
            <strong>Rename</strong> changes the list’s name, and{" "}
            <strong>Back to grocery lists</strong> returns to all your lists.
          </li>
        </ol>
        <p className="help-page_note">
          A list is made once, from the plan and pantry as they were. If either
          changes, generate a new list. Matching is by name, so an ingredient is
          occasionally left off (“red bell pepper” matches the staple “pepper”).
          Add it yourself if so.
        </p>
      </HelpSection>

      {/* data source and its limits */}
      <HelpSection id="help-data">
        <p>
          Recipes come from the{" "}
          <a href={DATASET_URL} target="_blank" rel="noreferrer">
            Food.com Recipes and Interactions
          </a>{" "}
          dataset (Shuyang Li, Kaggle, 2019, CC BY 4.0): 8,000 recipes chosen at
          random from about 230,000.
        </p>
        <p>
          The Diet, Course, Cuisine and Other filters use tags added on
          Food.com, which aren’t verified. That’s why diet options read “Tagged
          vegetarian” and so on. Check the ingredients if a diet or allergy
          matters. Time filters use each recipe’s listed minutes, and the steps
          filter counts its actual steps.
        </p>
        <p>
          Ingredient names are written by recipe authors, which is why pantry
          and grocery matching is approximate. Use-by dates are only what you
          enter; the app doesn’t estimate shelf life.
        </p>
      </HelpSection>
    </article>
  );
}

export default HelpPage;

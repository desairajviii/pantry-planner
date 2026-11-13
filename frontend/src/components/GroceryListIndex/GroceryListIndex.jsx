import { useEffect, useState } from "react";
import {
  createGroceryList,
  deleteGroceryList,
  getGroceryLists,
} from "../../api/groceryLists.js";
import { getMealPlans } from "../../api/mealPlans.js";
import { formatDate } from "../../utils/dates.js";
import GroceryListView from "../GroceryListView/GroceryListView.jsx";
import "./GroceryListIndex.css";

// Show a creation timestamp as a date in the user's time zone
// iso = createdAt from the API
function formatCreated(iso) {
  return formatDate(iso, { timeZone: undefined });
}

// The user's grocery lists - generate one from a meal plan, open, and delete
function GroceryListIndex() {
  const [lists, setLists] = useState(null);
  const [plans, setPlans] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

  const [planId, setPlanId] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  // Load lists and meal plans together on first view and whenever reloadKey changes
  useEffect(() => {
    let ignore = false; // skip state updates if the view closes mid-request
    Promise.all([getGroceryLists(), getMealPlans()])
      .then(([listData, planData]) => {
        if (ignore) {
          return;
        }
        setLists(listData);
        setPlans(planData);
        setLoadError("");
      })
      .catch((err) => {
        if (!ignore) {
          setLoadError(err.message);
        }
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // Generate a list from the chosen plan and open it
  async function handleCreate(event) {
    event.preventDefault();
    setFormError("");
    setCreating(true);
    try {
      const list = await createGroceryList(planId, name.trim());
      setName(""); // clear
      setSelectedId(list._id); // index reloads when the user goes back
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // Confirm, delete, and drop the list locally
  async function handleDelete(list) {
    if (!window.confirm(`Delete "${list.name}"? This can't be undone.`)) {
      return;
    }
    try {
      await deleteGroceryList(list._id);
      setLists((current) => current.filter((l) => l._id !== list._id));
    } catch (err) {
      setLoadError(err.message);
    }
  }

  // Show one list instead of the index
  if (selectedId) {
    return (
      <GroceryListView
        listId={selectedId}
        onBack={() => {
          setSelectedId(null);
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  const planNames = new Map(plans?.map((plan) => [plan._id, plan.name]));
  const chosenPlan = planNames.get(planId); // name placeholder

  return (
    <section className="grocery-list-index">
      <h1 className="grocery-list-index_title">Grocery lists</h1>

      <form className="grocery-list-index_form" onSubmit={handleCreate}>
        <h2 className="grocery-list-index_form-title">
          New list from a meal plan
        </h2>
        <div className="grocery-list-index_fields">
          <label htmlFor="grocery-plan">Meal plan</label>
          <select
            id="grocery-plan"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            required
          >
            <option value="">Choose a plan</option>
            {/* a plan with no meals would be rejected by the server, so it can't be picked */}
            {plans?.map((plan) => (
              <option
                key={plan._id}
                value={plan._id}
                disabled={plan.entries.length === 0}
              >
                {plan.name}
                {plan.entries.length === 0 ? " (no meals yet)" : ""}
              </option>
            ))}
          </select>
          <label htmlFor="grocery-name">Name</label>
          <input
            id="grocery-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder={chosenPlan ? `Groceries: ${chosenPlan}` : "Optional"}
          />
          {/* disabled until plans load, so the select isn't empty by mistake */}
          <button type="submit" disabled={creating || plans === null}>
            {creating ? "Generating…" : "Generate list"}
          </button>
        </div>
        <p className="grocery-list-index_hint">
          The list includes every ingredient in the plan except what your pantry
          already covers.
        </p>
        {plans?.length === 0 && (
          <p className="grocery-list-index_hint">
            You have no meal plans yet. Create one on the Meal plans screen
            first.
          </p>
        )}
        {formError && (
          <p className="grocery-list-index_error" role="alert">
            {formError}
          </p>
        )}
      </form>

      {loadError && (
        <p className="grocery-list-index_error" role="alert">
          {loadError}
        </p>
      )}

      {lists === null && !loadError && (
        <p className="grocery-list-index_status">Loading lists…</p>
      )}

      {lists?.length === 0 && (
        <p className="grocery-list-index_empty">
          No grocery lists yet. Choose a meal plan above to generate one.
        </p>
      )}

      {lists?.length > 0 && (
        <ul className="grocery-list-index_items">
          {lists.map((list) => (
            <li key={list._id} className="grocery-list-index_item">
              <div>
                <h3 className="grocery-list-index_name">{list.name}</h3>
                <p className="grocery-list-index_meta">
                  Created {formatCreated(list.createdAt)},{" "}
                  {planNames.has(list.mealPlanId)
                    ? `from ${planNames.get(list.mealPlanId)}`
                    : "meal plan deleted"}
                </p>
              </div>
              <div className="grocery-list-index_actions">
                <button type="button" onClick={() => setSelectedId(list._id)}>
                  Open
                </button>
                <button
                  type="button"
                  className="grocery-list-index_delete"
                  onClick={() => handleDelete(list)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default GroceryListIndex;

import { useEffect, useState } from "react";
import {
  createMealPlan,
  deleteMealPlan,
  getMealPlans,
} from "../../api/mealPlans.js";
import { formatDate, upcomingMonday } from "../../utils/dates.js";
import MealPlanner from "../MealPlanner/MealPlanner.jsx";
import "./MealPlanList.css";

// The user's meal plans: create, open, and delete
function MealPlanList() {
  const [plans, setPlans] = useState(null); // null while loading
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0); // bump to reload the list
  const [selectedId, setSelectedId] = useState(null); // plan being viewed

  const [name, setName] = useState("");
  const [weekStart, setWeekStart] = useState(upcomingMonday);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  // Load the plans on first view, and again whenever reloadKey changes
  useEffect(() => {
    let ignore = false;
    getMealPlans()
      .then((data) => {
        if (!ignore) {
          setPlans(data);
          setLoadError("");
        }
      })
      .catch((err) => {
        if (!ignore) setLoadError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  function reload() {
    setReloadKey((key) => key + 1);
  }

  async function handleCreate(event) {
    event.preventDefault();
    setFormError("");
    setCreating(true);
    try {
      const plan = await createMealPlan({
        name: name.trim(),
        weekStart,
        entries: [],
      });
      setName("");
      reload();
      setSelectedId(plan._id); // open the new plan right away
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(plan) {
    if (!window.confirm(`Delete "${plan.name}"? This can't be undone.`)) {
      return;
    }
    try {
      await deleteMealPlan(plan._id);
      reload();
    } catch (err) {
      setLoadError(err.message);
    }
  }

  // Show one plan instead of the list
  if (selectedId) {
    return (
      <MealPlanner
        planId={selectedId}
        onBack={() => {
          setSelectedId(null);
          reload(); // meal counts may have changed
        }}
      />
    );
  }

  return (
    <section className="meal-plan-list">
      <h1 className="meal-plan-list_title">Meal plans</h1>

      <form className="meal-plan-list_form" onSubmit={handleCreate}>
        <h2 className="meal-plan-list_form-title">New plan</h2>
        <div className="meal-plan-list_fields">
          <label htmlFor="plan-name">Name</label>
          <input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            placeholder="e.g. Busy week"
          />
          <label htmlFor="plan-week">Week starting</label>
          <input
            id="plan-week"
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            required
          />
          <button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create plan"}
          </button>
        </div>
        {formError && (
          <p className="meal-plan-list_error" role="alert">
            {formError}
          </p>
        )}
      </form>

      {loadError && (
        <p className="meal-plan-list_error" role="alert">
          {loadError}
        </p>
      )}

      {plans === null && !loadError && (
        <p className="meal-plan-list_status">Loading plans…</p>
      )}

      {plans?.length === 0 && (
        <p className="meal-plan-list_empty">
          No meal plans yet. Create one above, then add recipes to it from the
          Recipes screen.
        </p>
      )}

      {plans?.length > 0 && (
        <ul className="meal-plan-list_items">
          {plans.map((plan) => (
            <li key={plan._id} className="meal-plan-list_item">
              <div>
                <h3 className="meal-plan-list_name">{plan.name}</h3>
                <p className="meal-plan-list_meta">
                  Week of {formatDate(plan.weekStart)}, {plan.entries.length}{" "}
                  {plan.entries.length === 1 ? "meal" : "meals"}
                </p>
              </div>
              <div className="meal-plan-list_actions">
                <button type="button" onClick={() => setSelectedId(plan._id)}>
                  Open
                </button>
                <button
                  type="button"
                  className="meal-plan-list_delete"
                  onClick={() => handleDelete(plan)}
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

export default MealPlanList;

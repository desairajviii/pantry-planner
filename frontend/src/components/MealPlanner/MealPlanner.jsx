import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  getMealPlan,
  toEntryInput,
  updateMealPlan,
} from "../../api/mealPlans.js";
import { DAYS, SLOTS } from "../../config/mealSlots.js";
import { addDays, formatDate, toDateInput } from "../../utils/dates.js";
import "./MealPlanner.css";

// One meal plan as a weekly grid: edit the name and week, remove meals
function MealPlanner({ planId, onBack }) {
  const [response, setResponse] = useState({
    id: null,
    plan: null,
    error: "",
  });
  const [name, setName] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  // Load the plan, and fill the form with its name and week
  useEffect(() => {
    let ignore = false;
    getMealPlan(planId)
      .then((plan) => {
        if (ignore) return;
        setResponse({ id: planId, plan, error: "" });
        setName(plan.name);
        setWeekStart(toDateInput(plan.weekStart));
      })
      .catch((err) => {
        if (!ignore)
          setResponse({ id: planId, plan: null, error: err.message });
      });
    return () => {
      ignore = true;
    };
  }, [planId]);

  const loading = response.id !== planId;
  const { plan } = response;

  // Sends the whole plan with the given changes, since PUT replaces it
  async function save(changes, successMessage) {
    setSaving(true);
    setSaveError("");
    setMessage("");
    try {
      const updated = await updateMealPlan(planId, {
        name: plan.name,
        weekStart: toDateInput(plan.weekStart),
        entries: plan.entries.map(toEntryInput),
        ...changes,
      });
      setResponse({ id: planId, plan: updated, error: "" });
      setMessage(successMessage);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDetailsSubmit(event) {
    event.preventDefault();
    save({ name: name.trim(), weekStart }, "Plan details saved.");
  }

  function removeEntry(day, slot) {
    const entries = plan.entries
      .filter((entry) => !(entry.day === day && entry.slot === slot))
      .map(toEntryInput);
    save({ entries }, "Meal removed.");
  }

  function entryFor(day, slot) {
    return plan.entries.find((e) => e.day === day && e.slot === slot);
  }

  return (
    <section className="meal-planner">
      <button type="button" className="meal-planner_back" onClick={onBack}>
        ← Back to meal plans
      </button>

      {loading && <p className="meal-planner_status">Loading plan…</p>}

      {!loading && response.error && (
        <p className="meal-planner_error" role="alert">
          {response.error}
        </p>
      )}

      {!loading && plan && (
        <>
          <h1 className="meal-planner_title">{plan.name}</h1>
          <p className="meal-planner_meta">
            Week of {formatDate(plan.weekStart)}, {plan.entries.length} of 21
            meals planned
          </p>

          <form className="meal-planner_details" onSubmit={handleDetailsSubmit}>
            <label htmlFor="planner-name">Name</label>
            <input
              id="planner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
            <label htmlFor="planner-week">Week starting</label>
            <input
              id="planner-week"
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              required
            />
            <button type="submit" disabled={saving}>
              Save details
            </button>
          </form>

          <p className="meal-planner_status" aria-live="polite">
            {saving ? "Saving…" : message}
          </p>
          {saveError && (
            <p className="meal-planner_error" role="alert">
              {saveError}
            </p>
          )}

          <div className="meal-planner_grid-wrap">
            <table className="meal-planner_grid">
              <thead>
                <tr>
                  <th scope="col">Meal</th>
                  {DAYS.map((day, index) => (
                    <th scope="col" key={day.id}>
                      {day.label}
                      <span className="meal-planner_date">
                        {formatDate(addDays(plan.weekStart, index), {
                          year: undefined,
                        })}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot) => (
                  <tr key={slot.id}>
                    <th scope="row">{slot.label}</th>
                    {DAYS.map((day) => {
                      const entry = entryFor(day.id, slot.id);
                      return (
                        <td key={day.id}>
                          {entry ? (
                            <div className="meal-planner_entry">
                              <span className="meal-planner_recipe">
                                {entry.recipeName}
                              </span>
                              <button
                                type="button"
                                className="meal-planner_remove"
                                onClick={() => removeEntry(day.id, slot.id)}
                                disabled={saving}
                                aria-label={`Remove ${entry.recipeName} from ${day.name} ${slot.label}`}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <span className="meal-planner_empty">Empty</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="meal-planner_hint">
            To add meals, open Recipes and choose Add to plan on any recipe.
          </p>
        </>
      )}
    </section>
  );
}

MealPlanner.propTypes = {
  planId: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default MealPlanner;

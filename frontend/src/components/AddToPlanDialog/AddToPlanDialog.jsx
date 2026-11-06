import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  getMealPlans,
  toEntryInput,
  updateMealPlan,
} from "../../api/mealPlans.js";
import { DAYS, SLOTS } from "../../config/mealSlots.js";
import { toDateInput } from "../../utils/dates.js";
import "./AddToPlanDialog.css";

// Pick a plan, day, and meal for one recipe.
// Uses the built-in <dialog> element, which closes with Esc and keeps
// keyboard focus inside while it's open.
// initialPlanId (optional): the plan to start on, e.g. when opened from
// that plan's own suggestions. Otherwise the first plan is selected.
function AddToPlanDialog({ recipe, initialPlanId, onClose }) {
  const dialogRef = useRef(null);
  const [plans, setPlans] = useState(null); // null while loading
  const [loadError, setLoadError] = useState("");
  const [planId, setPlanId] = useState("");
  const [day, setDay] = useState("mon");
  const [slot, setSlot] = useState("dinner");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  // Open as a modal as soon as it appears. StrictMode runs effects twice in
  // development, and showModal() throws if the dialog is already open.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  // Load the user's plans and pick which one to start on
  useEffect(() => {
    let ignore = false;
    getMealPlans()
      .then((data) => {
        if (ignore) return;
        setPlans(data);
        if (data.length === 0) return;
        // Start on the plan the dialog was opened from, if there is one
        const start = data.find((p) => p._id === initialPlanId) ?? data[0];
        setPlanId(start._id);
      })
      .catch((err) => {
        if (!ignore) setLoadError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [initialPlanId]);

  const plan = plans?.find((p) => p._id === planId);
  const existing = plan?.entries.find((e) => e.day === day && e.slot === slot);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSavedMessage("");
    try {
      // Replace whatever is in that day and meal with this recipe
      const entries = plan.entries
        .filter((e) => !(e.day === day && e.slot === slot))
        .map(toEntryInput);
      entries.push({ day, slot, recipeId: recipe._id });

      const updated = await updateMealPlan(plan._id, {
        name: plan.name,
        weekStart: toDateInput(plan.weekStart),
        entries,
      });
      setPlans((current) =>
        current.map((p) => (p._id === updated._id ? updated : p)),
      );

      const dayName = DAYS.find((d) => d.id === day).name;
      const slotLabel = SLOTS.find((s) => s.id === slot).label.toLowerCase();
      setSavedMessage(`Added to ${dayName} ${slotLabel} in "${plan.name}".`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="add-to-plan"
      onClose={onClose}
      aria-labelledby="add-to-plan-title"
    >
      <h2 id="add-to-plan-title" className="add-to-plan_title">
        Add “{recipe.name}” to a plan
      </h2>

      {plans === null && !loadError && (
        <p className="add-to-plan_status">Loading your plans…</p>
      )}

      {loadError && (
        <p className="add-to-plan_error" role="alert">
          {loadError}
        </p>
      )}

      {plans?.length === 0 && (
        <p className="add-to-plan_status">
          You don&apos;t have any meal plans yet. Create one on the Meal plans
          screen first.
        </p>
      )}

      {plan && (
        <form className="add-to-plan_form" onSubmit={handleSubmit}>
          <label htmlFor="add-plan">Plan</label>
          <select
            id="add-plan"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>

          <label htmlFor="add-day">Day</label>
          <select
            id="add-day"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            {DAYS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <label htmlFor="add-slot">Meal</label>
          <select
            id="add-slot"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
          >
            {SLOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {existing && existing.recipeId !== recipe._id && (
            <p className="add-to-plan_warning">
              This replaces “{existing.recipeName}”.
            </p>
          )}

          {error && (
            <p className="add-to-plan_error" role="alert">
              {error}
            </p>
          )}
          {savedMessage && (
            <p className="add-to-plan_saved" role="status">
              {savedMessage}
            </p>
          )}

          <div className="add-to-plan_buttons">
            <button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add to plan"}
            </button>
          </div>
        </form>
      )}

      <button
        type="button"
        className="add-to-plan_close"
        onClick={() => dialogRef.current.close()}
      >
        {savedMessage ? "Done" : "Cancel"}
      </button>
    </dialog>
  );
}

AddToPlanDialog.propTypes = {
  recipe: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  initialPlanId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default AddToPlanDialog;

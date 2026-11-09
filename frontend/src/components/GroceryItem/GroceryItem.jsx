import { useId, useState } from "react";
import PropTypes from "prop-types";
import "./GroceryItem.css";

// Describe where an item came from
// recipeCount counts plan entries, so a recipe planned twice counts 2
// item = one grocery item
function itemSource(item) {
  if (item.custom) {
    return "Added by you";
  }
  const n = item.recipeCount;
  return `In ${n} planned ${n === 1 ? "meal" : "meals"}`;
}

// One grocery row - checkbox + inline form for edit, remove button
function GroceryItem({ item, disabled, onSave, onRemove }) {
  const idBase = useId(); // unique input ids per row
  const [draft, setDraft] = useState(null); // edit-form fields, null when not editing
  const [error, setError] = useState("");

  // Run save/remove through parent and show any error
  // Returns true on success
  // action = function returning the parent's save promise
  async function run(action) {
    setError("");
    try {
      await action();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  // Tick or untick the item
  function handleToggle() {
    run(() => onSave(item.name, { checked: !item.checked }));
  }

  // Open the edit form with the item's current values
  function startEdit() {
    setError("");
    setDraft({ name: item.name, quantity: item.quantity });
  }

  // Close the edit form, discard the draft and any error
  function cancelEdit() {
    setError("");
    setDraft(null);
  }

  // Copy one edit-form input into the draft, input names match draft keys
  function handleFieldChange(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  }

  // Save draft, stay in edit mode on error
  async function handleSave(event) {
    event.preventDefault();
    if (await run(() => onSave(item.name, draft))) {
      setDraft(null);
    }
  }

  // Remove item
  function handleRemove() {
    run(() => onRemove(item.name));
  }

  return (
    <li
      className={`grocery-item${item.checked ? " grocery-item-checked" : ""}`}
    >
      {draft ? (
        <form className="grocery-item_form" onSubmit={handleSave}>
          <label htmlFor={`${idBase}-name`}>Name</label>
          <input
            id={`${idBase}-name`}
            name="name"
            value={draft.name}
            onChange={handleFieldChange}
            required
            maxLength={100}
          />
          <label htmlFor={`${idBase}-quantity`}>Quantity</label>
          <input
            id={`${idBase}-quantity`}
            name="quantity"
            value={draft.quantity}
            onChange={handleFieldChange}
            maxLength={50}
          />
          <div className="grocery-item_actions">
            <button type="submit" disabled={disabled}>
              Save
            </button>
            <button
              type="button"
              className="grocery-item_secondary"
              onClick={cancelEdit}
              disabled={disabled}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="grocery-item_view">
          <div>
            {/* wrapping label makes the name clickable */}
            <label className="grocery-item_check">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={handleToggle}
                disabled={disabled}
              />
              <span className="grocery-item_name">{item.name}</span>
            </label>
            <p className="grocery-item_meta">
              {/* quantity is optional, so show only when set */}
              {[item.quantity, itemSource(item)].filter(Boolean).join(", ")}
            </p>
          </div>
          <div className="grocery-item_actions">
            <button type="button" onClick={startEdit} disabled={disabled}>
              Edit
            </button>
            <button
              type="button"
              className="grocery-item_delete"
              onClick={handleRemove}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="grocery-item_error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

GroceryItem.propTypes = {
  item: PropTypes.shape({
    name: PropTypes.string.isRequired,
    quantity: PropTypes.string,
    recipeCount: PropTypes.number.isRequired,
    checked: PropTypes.bool.isRequired,
    custom: PropTypes.bool.isRequired,
  }).isRequired,
  disabled: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default GroceryItem;

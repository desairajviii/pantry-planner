import { useState } from "react";
import PropTypes from "prop-types";
import { formatDate, toDateInput } from "../../utils/dates.js";
import "./PantryItem.css";

const BADGES = { expired: "Expired", soon: "Use soon" }; // badge text per status

// One pantry row: shows the item and switches to an inline form for editing
function PantryItem({ item, status, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null); // edit-form fields while editing
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); // a save or delete is in flight

  // Open the edit form prefilled with the item's current values
  function startEdit() {
    setDraft({
      name: item.name,
      quantity: item.quantity,
      useBy: item.useBy ? toDateInput(item.useBy) : "", // ISO -> "YYYY-MM-DD"
    });
    setError("");
    setEditing(true);
  }

  // Copy one edit-form input into the draft, input names match the draft keys
  function handleFieldChange(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  }

  // Save the draft through the parent, stay in edit mode on error
  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSave(item._id, draft); // useBy "" clears the date on the server
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Confirm, then delete through the parent. The row unmounts on success
  async function handleDelete() {
    if (!window.confirm(`Remove "${item.name}" from your pantry?`)) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      await onDelete(item._id);
    } catch (err) {
      setError(err.message);
      setBusy(false); // only reset on failure, on success the row is gone
    }
  }

  const idBase = `pantry-${item._id}`; // unique input ids per row

  return (
    <li className={`pantry-item${status ? ` pantry-item-${status}` : ""}`}>
      {editing ? (
        <form className="pantry-item_form" onSubmit={handleSave}>
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
          <label htmlFor={`${idBase}-use-by`}>Use by</label>
          <input
            id={`${idBase}-use-by`}
            name="useBy"
            type="date"
            value={draft.useBy}
            onChange={handleFieldChange}
          />
          <div className="pantry-item_actions">
            <button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="pantry-item_secondary"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="pantry-item_view">
          <div>
            <h3 className="pantry-item_name">
              {item.name}
              {status && (
                <span
                  className={`pantry-item_badge pantry-item_badge-${status}`}
                >
                  {BADGES[status]}
                </span>
              )}
            </h3>
            <p className="pantry-item_meta">
              {/* quantity and date are both optional, show whichever exist */}
              {[item.quantity, item.useBy && `Use by ${formatDate(item.useBy)}`]
                .filter(Boolean)
                .join(", ") || "No quantity or use-by date"}
            </p>
          </div>
          <div className="pantry-item_actions">
            <button type="button" onClick={startEdit} disabled={busy}>
              Edit
            </button>
            <button
              type="button"
              className="pantry-item_delete"
              onClick={handleDelete}
              disabled={busy}
            >
              Remove
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="pantry-item_error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

PantryItem.propTypes = {
  item: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    quantity: PropTypes.string,
    useBy: PropTypes.string, // ISO date string or null
  }).isRequired,
  status: PropTypes.oneOf(["expired", "soon"]), // null when nothing to flag
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default PantryItem;

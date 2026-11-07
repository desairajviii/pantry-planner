import { useEffect, useState } from "react";
import {
  addPantryItem,
  deletePantryItem,
  getPantry,
  updatePantryItem,
} from "../../api/pantry.js";
import { SOON_DAYS, expiryStatus } from "../../utils/expiry.js";
import PantryItem from "../PantryItem/PantryItem.jsx";
import "./PantryManager.css";

const EMPTY_FORM = { name: "", quantity: "", useBy: "" }; // blank add form

// Keep items alphabetical after a local add or rename, matching the API's sort
// items = array of pantry items
function sortByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

// Build the expiry summary line
// Returns "" when nothing is flagged
// expired, soon = counts of flagged items
function expirySummary(expired, soon) {
  const plural = (n) => `${n} ${n === 1 ? "item" : "items"}`; // "1 item" / "2 items"
  const parts = [];
  if (expired) {
    parts.push(`${plural(expired)} expired.`);
  }
  if (soon) {
    parts.push(`${plural(soon)} to use within ${SOON_DAYS} days.`);
  }
  return parts.join(" ");
}

// The user's pantry - list items, add new ones, and flag expiring or expired items
function PantryManager() {
  const [items, setItems] = useState(null); // null while loading
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM); // add-form fields
  const [formError, setFormError] = useState("");
  const [adding, setAdding] = useState(false);

  // Load the pantry once on first view
  useEffect(() => {
    let ignore = false; // skip state updates if view closes mid-request
    getPantry()
      .then((data) => {
        if (!ignore) setItems(data);
      })
      .catch((err) => {
        if (!ignore) setLoadError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Copy one add form input into form state, input names match form keys
  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  // Add an item, then insert the saved version into the list
  async function handleAdd(event) {
    event.preventDefault();
    setFormError("");
    setAdding(true);
    try {
      const item = await addPantryItem(form);
      setItems((current) => sortByName([...current, item]));
      setForm(EMPTY_FORM); // clear for the next item
    } catch (err) {
      setFormError(err.message);
    } finally {
      setAdding(false);
    }
  }

  // Save edits to one item and swap in the updated version
  async function handleSave(id, fields) {
    const updated = await updatePantryItem(id, fields);
    setItems((current) =>
      sortByName(current.map((item) => (item._id === id ? updated : item))),
    );
  }

  // Delete one item and drop it from the list
  async function handleDelete(id) {
    await deletePantryItem(id);
    setItems((current) => current.filter((item) => item._id !== id));
  }

  // Pair each item with its expiry status once per render
  const now = new Date();
  const rows = items?.map((item) => ({
    item,
    status: expiryStatus(item.useBy, now),
  }));
  const count = (status) =>
    rows?.filter((row) => row.status === status).length ?? 0;
  const summary = expirySummary(count("expired"), count("soon"));

  return (
    <section className="pantry-manager">
      <h1 className="pantry-manager_title">Pantry</h1>

      <form className="pantry-manager_form" onSubmit={handleAdd}>
        <h2 className="pantry-manager_form-title">Add an item</h2>
        <div className="pantry-manager_fields">
          <label htmlFor="pantry-name">Name</label>
          <input
            id="pantry-name"
            name="name"
            value={form.name}
            onChange={handleFieldChange}
            required
            maxLength={100}
            placeholder="e.g. chickpeas"
          />
          <label htmlFor="pantry-quantity">Quantity</label>
          <input
            id="pantry-quantity"
            name="quantity"
            value={form.quantity}
            onChange={handleFieldChange}
            maxLength={50}
            placeholder="e.g. 2 cans"
          />
          <label htmlFor="pantry-use-by">Use by</label>
          <input
            id="pantry-use-by"
            name="useBy"
            type="date"
            value={form.useBy}
            onChange={handleFieldChange}
          />
          {/* disabled until the list loads, so an add can't land in a list that failed to load */}
          <button type="submit" disabled={adding || items === null}>
            {adding ? "Adding…" : "Add item"}
          </button>
        </div>
        {formError && (
          <p className="pantry-manager_error" role="alert">
            {formError}
          </p>
        )}
      </form>

      {loadError && (
        <p className="pantry-manager_error" role="alert">
          {loadError}
        </p>
      )}

      {items === null && !loadError && (
        <p className="pantry-manager_status">Loading pantry…</p>
      )}

      {items?.length === 0 && (
        <p className="pantry-manager_empty">
          Your pantry is empty. Add what you have on hand, then use Cook from
          pantry to find recipes that use it.
        </p>
      )}

      {summary && (
        <div className="pantry-manager_summary" role="status">
          <p>{summary}</p>
          {count("expired") > 0 && (
            <p className="pantry-manager_hint">
              Expired items still count as in stock for recipe search and
              grocery lists. Remove any you&apos;ve thrown out.
            </p>
          )}
        </div>
      )}

      {rows?.length > 0 && (
        <ul className="pantry-manager_items">
          {rows.map(({ item, status }) => (
            <PantryItem
              key={item._id}
              item={item}
              status={status}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default PantryManager;

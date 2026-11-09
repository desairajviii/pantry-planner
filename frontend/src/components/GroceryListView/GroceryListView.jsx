import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { getGroceryList, updateGroceryList } from "../../api/groceryLists.js";
import GroceryItem from "../GroceryItem/GroceryItem.jsx";
import "./GroceryListView.css";

const EMPTY_FORM = { name: "", quantity: "" };

// Keep items alphabetical after a local add or rename, matching generation order
// items = array of grocery items
function sortByName(items) {
  const key = (item) => item.name.trim().toLowerCase();
  return [...items].sort((a, b) => key(a).localeCompare(key(b)));
}

// One grocery list - rename, check off, edit and remove items, add custom items
function GroceryListView({ listId, onBack }) {
  const [list, setList] = useState(null); // null while loading
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState(""); // rename field
  const [nameError, setNameError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM); // add-item fields
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false); // PUT is in progress

  // Load the list and fill the rename field
  useEffect(() => {
    let ignore = false; // skip state updates if view closes mid-request
    getGroceryList(listId)
      .then((data) => {
        if (ignore) {
          return;
        }
        setList(data);
        setName(data.name);
      })
      .catch((err) => {
        if (!ignore) {
          setLoadError(err.message);
        }
      });
    return () => {
      ignore = true;
    };
  }, [listId]);

  // Send changes and show saved list
  // Controls are disabled while saving, so two full-array PUTs never overlap
  // Throws on failure
  // changes = { name?, items? }
  async function save(changes) {
    setSaving(true);
    try {
      setList(await updateGroceryList(listId, changes));
    } finally {
      setSaving(false);
    }
  }

  // Merge fields into one item under its current name and save
  // Names are unique within a list, so name identifies the item
  function saveItem(itemName, fields) {
    const items = list.items.map((item) =>
      item.name === itemName ? { ...item, ...fields } : item,
    );
    return save({ items: sortByName(items) });
  }

  // Drop one item and save
  function removeItem(itemName) {
    return save({ items: list.items.filter((item) => item.name !== itemName) });
  }

  // Rename the list
  async function handleRename(event) {
    event.preventDefault();
    setNameError("");
    try {
      await save({ name: name.trim() });
    } catch (err) {
      setNameError(err.message);
    }
  }

  // Copy one add-form input into form state, input names match form keys
  function handleFieldChange(event) {
    const { name: field, value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
  }

  // Add item and save
  async function handleAdd(event) {
    event.preventDefault();
    setFormError("");
    const item = { ...form, recipeCount: 0, checked: false, custom: true };
    try {
      await save({ items: sortByName([...list.items, item]) });
      setForm(EMPTY_FORM); // clear
    } catch (err) {
      setFormError(err.message);
    }
  }

  const checkedCount = list?.items.filter((item) => item.checked).length ?? 0;

  return (
    <section className="grocery-list-view">
      <button type="button" className="grocery-list-view_back" onClick={onBack}>
        ← Back to grocery lists
      </button>

      {list === null && !loadError && (
        <p className="grocery-list-view_status">Loading list…</p>
      )}

      {loadError && (
        <p className="grocery-list-view_error" role="alert">
          {loadError}
        </p>
      )}

      {list && (
        <>
          <h1 className="grocery-list-view_title">{list.name}</h1>
          <p className="grocery-list-view_meta">
            {checkedCount} of {list.items.length} items checked off
          </p>

          <form className="grocery-list-view_fields" onSubmit={handleRename}>
            <label htmlFor="grocery-list-name">List name</label>
            <input
              id="grocery-list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
            <button type="submit" disabled={saving}>
              Rename
            </button>
          </form>
          {nameError && (
            <p className="grocery-list-view_error" role="alert">
              {nameError}
            </p>
          )}

          <p className="grocery-list-view_status" aria-live="polite">
            {saving ? "Saving…" : ""}
          </p>

          {list.items.length === 0 ? (
            <p className="grocery-list-view_empty">
              Your pantry covers everything in this plan. Add anything else you
              need below.
            </p>
          ) : (
            <ul className="grocery-list-view_items">
              {list.items.map((item) => (
                <GroceryItem
                  key={item.name}
                  item={item}
                  disabled={saving}
                  onSave={saveItem}
                  onRemove={removeItem}
                />
              ))}
            </ul>
          )}

          <p className="grocery-list-view_hint">
            Ingredients covered by your pantry or by salt, pepper, water and oil
            are left off. Matching is by name, so an item you need can
            occasionally be skipped. Add it below if so.
          </p>

          <form className="grocery-list-view_add" onSubmit={handleAdd}>
            <h2 className="grocery-list-view_form-title">Add an item</h2>
            <div className="grocery-list-view_fields">
              <label htmlFor="grocery-add-name">Name</label>
              <input
                id="grocery-add-name"
                name="name"
                value={form.name}
                onChange={handleFieldChange}
                required
                maxLength={100}
                placeholder="e.g. paper towels"
              />
              <label htmlFor="grocery-add-quantity">Quantity</label>
              <input
                id="grocery-add-quantity"
                name="quantity"
                value={form.quantity}
                onChange={handleFieldChange}
                maxLength={50}
                placeholder="e.g. 2 rolls"
              />
              <button type="submit" disabled={saving}>
                Add item
              </button>
            </div>
            {formError && (
              <p className="grocery-list-view_error" role="alert">
                {formError}
              </p>
            )}
          </form>
        </>
      )}
    </section>
  );
}

GroceryListView.propTypes = {
  listId: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default GroceryListView;

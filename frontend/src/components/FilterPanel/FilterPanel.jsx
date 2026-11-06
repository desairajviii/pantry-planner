import PropTypes from "prop-types";
import "./FilterPanel.css";

// Shows the filter groups from GET /api/recipes/filters.
// Tag groups are checkboxes (pick any); time and steps are radio buttons
// (pick one, or "Any"). The panel doesn't keep its own state: RecipeBrowser
// passes in what's selected and gets every change back through onChange.
function FilterPanel({ groups, selected, onChange, onClear }) {
  function toggleTag(tag) {
    const tags = selected.tags.includes(tag)
      ? selected.tags.filter((t) => t !== tag)
      : [...selected.tags, tag];
    onChange({ ...selected, tags });
  }

  // type is "maxMinutes" or "maxSteps"; value is a number, or null for "Any"
  function setLimit(type, value) {
    onChange({ ...selected, [type]: value });
  }

  return (
    <aside className="filter-panel" aria-labelledby="filter-panel-heading">
      <h2 id="filter-panel-heading" className="filter-panel_heading">
        Filters
      </h2>

      {groups.map((group) => (
        <fieldset key={group.id} className="filter-panel_group">
          <legend className="filter-panel_legend">{group.label}</legend>

          {group.type === "tags" ? (
            group.options.map((option) => (
              <label key={option.value} className="filter-panel_option">
                <input
                  type="checkbox"
                  checked={selected.tags.includes(option.value)}
                  onChange={() => toggleTag(option.value)}
                />
                {option.label}
              </label>
            ))
          ) : (
            <>
              <label className="filter-panel_option">
                <input
                  type="radio"
                  name={group.id}
                  checked={(selected[group.type] ?? null) === null}
                  onChange={() => setLimit(group.type, null)}
                />
                Any
              </label>
              {group.options.map((option) => (
                <label key={option.value} className="filter-panel_option">
                  <input
                    type="radio"
                    name={group.id}
                    checked={selected[group.type] === option.value}
                    onChange={() => setLimit(group.type, option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </>
          )}
        </fieldset>
      ))}

      <button type="button" className="filter-panel_clear" onClick={onClear}>
        Clear filters
      </button>
    </aside>
  );
}

FilterPanel.propTypes = {
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.oneOf(["tags", "maxMinutes", "maxSteps"]).isRequired,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
            .isRequired,
          label: PropTypes.string.isRequired,
        }),
      ).isRequired,
    }),
  ).isRequired,
  selected: PropTypes.shape({
    tags: PropTypes.arrayOf(PropTypes.string).isRequired,
    maxMinutes: PropTypes.number,
    maxSteps: PropTypes.number,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

export default FilterPanel;

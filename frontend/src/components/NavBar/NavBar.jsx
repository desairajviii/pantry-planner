import PropTypes from "prop-types";
import "./NavBar.css";

// Top bar: screen links, who's logged in, and logout.
// It doesn't track the current screen itself; App passes it in.
function NavBar({ views, currentView, onNavigate, username, onLogout }) {
  return (
    <header className="navbar">
      <span className="navbar_brand">Pantry Planner</span>

      <nav aria-label="Main">
        <ul className="navbar_links">
          {views.map((view) => (
            <li key={view.id}>
              <button
                type="button"
                className="navbar_link"
                aria-current={view.id === currentView ? "page" : undefined}
                onClick={() => onNavigate(view.id)}
              >
                {view.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="navbar_user">
        <span className="navbar_username">Signed in as {username}</span>
        <button type="button" className="navbar_logout" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

NavBar.propTypes = {
  views: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  currentView: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  username: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default NavBar;

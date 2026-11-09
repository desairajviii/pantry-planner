import { useEffect, useState } from "react";
import { getCurrentUser, logout } from "../../api/auth.js";
import AuthForm from "../AuthForm/AuthForm.jsx";
import NavBar from "../NavBar/NavBar.jsx";
import "./App.css";
import RecipeBrowser from "../RecipeBrowser/RecipeBrowser.jsx";
import MealPlanList from "../MealPlanList/MealPlanList.jsx";
import PantryManager from "../PantryManager/PantryManager.jsx";
import PantrySearch from "../PantrySearch/PantrySearch.jsx";
import GroceryListIndex from "../GroceryListIndex/GroceryListIndex.jsx";

// The screens in the nav, in order
const VIEWS = [
  { id: "recipes", label: "Recipes" },
  { id: "plans", label: "Meal plans" },
  { id: "pantry", label: "Pantry" },
  { id: "pantry-search", label: "Cook from pantry" },
  { id: "grocery", label: "Grocery lists" },
  { id: "help", label: "How to use" },
];

// Shows the current screen. Placeholders are replaced by their real
// components as we build them.
function renderView(viewId) {
  if (viewId === "recipes") {
    return <RecipeBrowser />;
  }

  if (viewId === "plans") {
    return <MealPlanList />;
  }

  if (viewId === "pantry") {
    return <PantryManager />;
  }

  if (viewId === "pantry-search") {
    return <PantrySearch />;
  }

  if (viewId === "grocery") {
    return <GroceryListIndex />;
  }

  const view = VIEWS.find((v) => v.id === viewId);
  return (
    <section>
      <h1>{view.label}</h1>
      <p>This screen is being built.</p>
    </section>
  );
}

function App() {
  // undefined = still checking the session; null = logged out
  const [user, setUser] = useState(undefined);
  const [view, setView] = useState("recipes");
  const [error, setError] = useState("");

  // On first load, check whether the browser already has a login session
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => {
        setUser(null);
        setError("Couldn't reach the server. Try refreshing the page.");
      });
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      // Show the login screen even if the request failed
      setUser(null);
      setView("recipes");
    }
  }

  if (user === undefined) {
    return <p className="app_status">Loading…</p>;
  }

  if (!user) {
    return (
      <main className="app_auth">
        <h1 className="app_title">Pantry Planner</h1>
        <p className="app_tagline">
          Plan your week from what you already have.
        </p>
        {error && (
          <p className="app_error" role="alert">
            {error}
          </p>
        )}
        <AuthForm onAuthenticated={setUser} />
      </main>
    );
  }

  return (
    <>
      <NavBar
        views={VIEWS}
        currentView={view}
        onNavigate={setView}
        username={user.username}
        onLogout={handleLogout}
      />
      <main className="app_main">{renderView(view)}</main>
    </>
  );
}

export default App;

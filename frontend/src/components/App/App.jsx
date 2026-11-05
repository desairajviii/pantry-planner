import { useEffect, useState } from "react";
import { getRecipes } from "../../api/recipes.js";
import RecipeCard from "../RecipeCard/RecipeCard.jsx";
import "./App.css";

function App() {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    getRecipes({ tags: ["vegetarian"], limit: 3 }).then((data) =>
      setRecipes(data.recipes),
    );
  }, []);

  return (
    <main>
      <h1>Pantry Planner</h1>
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe._id}
          recipe={recipe}
          onSelect={(id) => console.log("select", id)}
          onAddToPlan={(r) => console.log("add to plan", r.name)}
          missingIngredients={["onion"]}
        />
      ))}
    </main>
  );
}

export default App;

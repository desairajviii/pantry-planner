import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./db/connection.js";
import recipesRouter from "./routes/recipes.js";
import mealPlansRouter from "./routes/mealPlans.js";

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIST = fileURLToPath(
  new URL("../frontend/dist", import.meta.url),
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/recipes", recipesRouter);
app.use("/api/meal-plans", mealPlansRouter);

// Unknown API paths return JSON, not the React page
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// In production, Express serves the built React app from the same origin,
// so the frontend never needs CORS. Any other path returns index.html.
app.use(express.static(FRONTEND_DIST));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

// Unexpected errors return JSON instead of Express's default HTML page.
// Express needs all four arguments to treat this as an error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

await connect();
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

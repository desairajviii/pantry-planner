import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./db/connection.js";

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIST = fileURLToPath(
  new URL("../frontend/dist", import.meta.url),
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API routes go here as they're built, e.g.:
// app.use("/api/recipes", recipesRouter);

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

await connect();
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

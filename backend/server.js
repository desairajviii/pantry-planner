import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./db/connection.js";
import recipesRouter from "./routes/recipes.js";
import mealPlansRouter from "./routes/mealPlans.js";
import session from "express-session";
import passport from "./auth/passport.js";
import authRouter from "./routes/auth.js";
import pantryRouter from "./routes/pantry.js";
import groceryListsRouter from "./routes/groceryLists.js";

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIST = fileURLToPath(
  new URL("../frontend/dist", import.meta.url),
);

app.use(express.json());

// Hosting services sit behind a proxy; this lets secure cookies work there
app.set("trust proxy", 1);

// Sessions keep users logged in between requests.
// The default store is in memory: fine locally, but sessions reset when the
// server restarts. Switch to connect-mongo before deploying.
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);
app.use(passport.session());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/recipes", recipesRouter);
app.use("/api/meal-plans", mealPlansRouter);
app.use("/api/auth", authRouter);
app.use("/api/pantry", pantryRouter);
app.use("/api/grocery-lists", groceryListsRouter);

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

const db = await connect();
// Unique usernames, enforced by the database
await db.collection("users").createIndex({ username: 1 }, { unique: true });

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

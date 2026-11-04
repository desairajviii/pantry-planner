import express from "express";
import passport from "../auth/passport.js";
import { hashPassword } from "../auth/passwords.js";
import { getDb } from "../db/connection.js";

const router = express.Router();

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

// What the browser gets about a user: never the password hash
const publicUser = (user) => ({ _id: user._id, username: user.username });

// req.login uses a callback; this lets the routes await it
function logIn(req, user) {
  return new Promise((resolve, reject) => {
    req.login(user, (err) => (err ? reject(err) : resolve()));
  });
}

// POST /api/auth/register: create an account and log in
router.post("/register", async (req, res) => {
  const username =
    typeof req.body?.username === "string"
      ? req.body.username.trim().toLowerCase()
      : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!USERNAME_PATTERN.test(username)) {
    return res.status(400).json({
      error: "Username must be 3 to 30 letters, numbers, or underscores.",
    });
  }
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return res.status(400).json({
      error: `Password must be ${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`,
    });
  }

  const user = {
    username,
    passwordHash: await hashPassword(password),
    createdAt: new Date(),
  };

  try {
    await getDb().collection("users").insertOne(user);
  } catch (err) {
    // 11000 is MongoDB's duplicate-key error, from the unique username index
    if (err.code === 11000) {
      return res.status(409).json({ error: "That username is taken." });
    }
    throw err;
  }

  await logIn(req, user);
  res.status(201).json(publicUser(user));
});

// POST /api/auth/login
router.post("/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res
        .status(401)
        .json({ error: info?.message || "Incorrect username or password." });
    }
    try {
      await logIn(req, user);
      res.json(publicUser(user));
    } catch (loginErr) {
      next(loginErr);
    }
  })(req, res, next);
});

// POST /api/auth/logout
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.status(204).end();
    });
  });
});

// GET /api/auth/me: who's logged in
router.get("/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  res.json(publicUser(req.user));
});

export default router;

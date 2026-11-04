// Lets the request through only if someone is logged in
export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Please log in." });
}

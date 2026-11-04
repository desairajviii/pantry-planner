import { ObjectId } from "mongodb";

// Week 1 stub: acts as if a fixed test user is logged in, so both of us can
// build routes before Passport is ready. Replaced by the real check later.
const TEST_USER = {
  _id: new ObjectId("000000000000000000000001"),
  username: "testuser",
};

export function requireAuth(req, res, next) {
  req.user = TEST_USER;
  next();
}

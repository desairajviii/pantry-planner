import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { ObjectId } from "mongodb";
import { getDb } from "../db/connection.js";
import { verifyPassword } from "./passwords.js";

const users = () => getDb().collection("users");

// Checks a username and password at login
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await users().findOne({
        username: username.trim().toLowerCase(),
      });
      // The same message for a wrong username or a wrong password, so the
      // response doesn't reveal which usernames exist
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return done(null, false, {
          message: "Incorrect username or password.",
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }),
);

// Only the user's ID is stored in the session
passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

// On each request, load the user from that ID, without the password hash
passport.deserializeUser(async (id, done) => {
  try {
    const user = await users().findOne(
      { _id: new ObjectId(id) },
      { projection: { passwordHash: 0 } },
    );
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

export default passport;

import { useState } from "react";
import PropTypes from "prop-types";
import { login, register } from "../../api/auth.js";
import "./AuthForm.css";

// One form for both logging in and creating an account
function AuthForm({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = isRegister
        ? await register(username, password)
        : await login(username, password);
      // App now shows the main screens, so this form goes away
      onAuthenticated(user);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setError("");
  }

  return (
    <section className="auth-form">
      <h2 className="auth-form_title">
        {isRegister ? "Create an account" : "Log in"}
      </h2>

      <form className="auth-form_fields" onSubmit={handleSubmit}>
        <label htmlFor="auth-username">Username</label>
        <input
          id="auth-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          minLength={3}
          maxLength={30}
          pattern="[A-Za-z0-9_]+"
        />

        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={isRegister ? 8 : undefined}
          maxLength={128}
        />

        {isRegister && (
          <p className="auth-form_hint">
            Username: 3 to 30 letters, numbers, or underscores. Password: at
            least 8 characters.
          </p>
        )}

        {error && (
          <p className="auth-form_error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="auth-form_submit"
          disabled={submitting}
        >
          {submitting
            ? "Please wait…"
            : isRegister
              ? "Create account"
              : "Log in"}
        </button>
      </form>

      <p className="auth-form_switch">
        {isRegister ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          className="auth-form_switch-button"
          onClick={switchMode}
        >
          {isRegister ? "Log in" : "Create an account"}
        </button>
      </p>
    </section>
  );
}

AuthForm.propTypes = {
  onAuthenticated: PropTypes.func.isRequired,
};

export default AuthForm;

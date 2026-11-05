import { request } from "./http.js";

export function register(username, password) {
  return request("/auth/register", {
    method: "POST",
    body: { username, password },
  });
}

export function login(username, password) {
  return request("/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

export function logout() {
  return request("/auth/logout", { method: "POST" });
}

// The logged-in user, or null if no one is logged in
export async function getCurrentUser() {
  try {
    return await request("/auth/me");
  } catch (err) {
    if (err.status === 401) {
      return null;
    }
    throw err;
  }
}

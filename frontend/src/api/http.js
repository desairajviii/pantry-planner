// Shared fetch helper. Every API module calls request() instead of fetch(),
// so JSON handling and errors work the same everywhere.
// Paths are relative to /api, e.g. request("/recipes").
export async function request(path, { method = "GET", body } = {}) {
  const options = { method, headers: {} };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, options);

  // Deletes and logout return 204 with no body
  if (res.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Not JSON (e.g. the dev server is down); handled below
  }

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

// src/api.js
// Small fetch wrapper for the EV Hub backend. Adds the JWT, parses JSON and turns errors into Error objects.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const TOKEN_KEY = 'ev_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Called when the server says our token is no longer valid (expired, user deleted or blocked).
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(method, path, body) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Please check that the backend is running.', 0);
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }

  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};

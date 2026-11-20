// Apps Script's POST redirect hop drops CORS headers, which browsers block
// silently as a generic fetch failure. GET-with-query-string avoids that,
// so apiPost is just an alias for apiGet.
async function apiPost(action, payload) {
  return apiGet(action, payload);
}

async function apiGet(action, params) {
  try {
    const qs = new URLSearchParams({ action, ...(params || {}) }).toString();
    const res = await fetch(`${CONFIG.SCRIPT_URL}?${qs}`, { method: 'GET' });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

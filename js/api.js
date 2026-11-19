async function apiPost(action, payload) {
  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
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

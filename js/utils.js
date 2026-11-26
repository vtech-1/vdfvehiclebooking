function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const _inFlightActions = new Set();

// Blocks a second submit of the same action while the first request is still
// pending (double-click / double-tap), and disables its button meanwhile.
async function runGuarded(actionKey, buttonId, fn) {
  if (_inFlightActions.has(actionKey)) return;
  _inFlightActions.add(actionKey);
  const btn = buttonId ? document.getElementById(buttonId) : null;
  if (btn) btn.disabled = true;
  try {
    await fn();
  } finally {
    _inFlightActions.delete(actionKey);
    if (btn) btn.disabled = false;
  }
}

function sameId(a, b) {
  return String(a) === String(b);
}

function vehicleNameFor(id) {
  if (!id) return '-';
  const v = (STATE.vehicles || []).find((x) => sameId(x.id, id));
  return v ? v.name : id;
}

function driverNameFor(id) {
  if (!id) return '-';
  const d = (STATE.drivers || []).find((x) => sameId(x.id, id));
  return d ? d.name : id;
}

function compareByDateTime(a, b) {
  const ka = `${a.date} ${a.fromTime}`;
  const kb = `${b.date} ${b.fromTime}`;
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

function badgeClassForStatus(status) {
  switch (status) {
    case 'Approved': return 'badge-green';
    case 'Pending': return 'badge-yellow';
    case 'Rejected': return 'badge-red';
    case 'Cancelled': return 'badge-gray';
    default: return 'badge-gray';
  }
}

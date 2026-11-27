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

// Lets people type a time as plain digits (e.g. "1430") and auto-inserts the
// colon ("14:30"), so they never have to fight a native time-picker widget.
function autoFormatTimeInput(inputEl) {
  inputEl.addEventListener('input', () => {
    let digits = inputEl.value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      inputEl.value = digits.slice(0, 2) + ':' + digits.slice(2);
    } else {
      inputEl.value = digits;
    }
  });
}

function isValidTimeString(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
}

// Validates a 12-hour "HH:MM" typed value (hour 1-12, minute 00-59).
function isValid12HourTime(value) {
  return /^(0?[1-9]|1[0-2]):[0-5]\d$/.test(String(value || '').trim());
}

// Converts a 12-hour "H:MM"/"HH:MM" + "AM"/"PM" pair into 24-hour "HH:MM".
function to24HourTime(value, ampm) {
  const [hStr, mStr] = String(value).trim().split(':');
  let h = parseInt(hStr, 10) % 12;
  if (String(ampm).toUpperCase() === 'PM') h += 12;
  return String(h).padStart(2, '0') + ':' + mStr;
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

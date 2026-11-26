function saveSession(user) {
  const expiry = Date.now() + CONFIG.SESSION_HOURS * 60 * 60 * 1000;
  const session = { id: user.id, name: user.name, role: user.role, forceChange: !!user.forceChange, expiry };
  localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(CONFIG.SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session.expiry || Date.now() > session.expiry) {
      clearSession();
      return null;
    }
    return session;
  } catch (err) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(CONFIG.SESSION_KEY);
}

function logout() {
  clearSession();
  STATE.currentUser = null;
  STATE.myBookings = [];
  STATE.pendingBookings = [];
  STATE.approvedBookings = [];
  STATE.vehicles = [];
  STATE.drivers = [];
  STATE.employees = [];
  STATE.activeApprovalBookingId = null;
  STATE.activeRejectBookingId = null;
  STATE.activeCancelBookingId = null;
  STATE.adminEditTarget = null;
  STATE.userSearchTerm = '';
  STATE.vehicleSearchTerm = '';
  STATE.driverSearchTerm = '';
  ['userSearchInput', 'vehicleSearchInput', 'driverSearchInput'].forEach((inputId) => {
    const el = document.getElementById(inputId);
    if (el) el.value = '';
  });
  showPage('page-login');
}

async function handleLogin(id, password) {
  const result = await apiPost('login', { id, password });
  if (!result.success) {
    return { success: false, error: result.error || 'Invalid ID or password' };
  }
  const user = result.user || result;
  STATE.currentUser = user;
  saveSession(user);
  if (user.forceChange) {
    showPage('page-change-password');
    return { success: true, forceChange: true };
  }
  goToRolePage();
  return { success: true };
}

async function handleChangePassword(newPassword) {
  const result = await apiPost('changePassword', {
    id: STATE.currentUser.id,
    newPassword
  });
  if (result.success) {
    STATE.currentUser.forceChange = false;
    saveSession(STATE.currentUser);
    goToRolePage();
  }
  return result;
}

function goToRolePage() {
  const role = STATE.currentUser && STATE.currentUser.role;
  switch (role) {
    case CONFIG.ROLES.EMPLOYEE:
      showPage('page-employee-home');
      break;
    case CONFIG.ROLES.DRIVER:
      showPage('page-driver-home');
      break;
    case CONFIG.ROLES.FLEETMANAGER:
    case CONFIG.ROLES.ADMIN:
      showPage('page-admin-home');
      break;
    default:
      showPage('page-login');
  }
}

function routeOnLoad() {
  const session = loadSession();
  if (!session) {
    showPage('page-login');
    return;
  }
  STATE.currentUser = session;
  if (session.forceChange) {
    showPage('page-change-password');
    return;
  }
  goToRolePage();
}

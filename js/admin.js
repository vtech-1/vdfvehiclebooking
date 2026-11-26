function renderAdminUsers() {
  const term = (STATE.userSearchTerm || '').toLowerCase();
  const users = (STATE.employees || []).filter((u) => !term ||
    [u.id, u.name, u.role, u.contact].some((f) => String(f || '').toLowerCase().includes(term)));
  const rows = users.map((u) => `
    <tr>
      <td>${escapeHtml(u.id)}</td>
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.role)}</td>
      <td>${escapeHtml(u.contact || '-')}</td>
      <td><span class="badge ${u.active === false ? 'badge-gray' : 'badge-green'}">${u.active === false ? 'Inactive' : 'Active'}</span></td>
      <td>
        <button class="btn btn-secondary btn-small" data-edit-user="${escapeHtml(u.id)}">Edit</button>
        <button class="btn btn-danger btn-small" data-deactivate-user="${escapeHtml(u.id)}">Deactivate</button>
      </td>
    </tr>
  `).join('');
  document.getElementById('adminUsersTableBody').innerHTML = rows ||
    '<tr><td colspan="6" class="empty-state">No users found.</td></tr>';
}

async function loadAdminUsers() {
  const result = await apiGet('getEmployees', {});
  STATE.employees = (result.success && result.employees) || [];
  renderAdminUsers();
  if (typeof renderDashboard === 'function') renderDashboard();
}

function renderAdminVehicles() {
  const term = (STATE.vehicleSearchTerm || '').toLowerCase();
  const vehicles = (STATE.vehicles || []).filter((v) => !term ||
    [v.id, v.name, v.registration, v.type].some((f) => String(f || '').toLowerCase().includes(term)));
  const rows = vehicles.map((v) => `
    <tr>
      <td>${escapeHtml(v.id)}</td>
      <td>${escapeHtml(v.name)}</td>
      <td>${escapeHtml(v.registration)}</td>
      <td>${escapeHtml(v.capacity)}</td>
      <td>${escapeHtml(v.type)}</td>
      <td><span class="badge ${v.active === false ? 'badge-gray' : 'badge-green'}">${v.active === false ? 'Inactive' : 'Active'}</span></td>
      <td>
        <button class="btn btn-secondary btn-small" data-edit-vehicle="${escapeHtml(v.id)}">Edit</button>
        <button class="btn btn-danger btn-small" data-deactivate-vehicle="${escapeHtml(v.id)}">Deactivate</button>
      </td>
    </tr>
  `).join('');
  document.getElementById('adminVehiclesTableBody').innerHTML = rows ||
    '<tr><td colspan="7" class="empty-state">No vehicles found.</td></tr>';
}

async function loadAdminVehicles() {
  const result = await apiGet('getVehicles', {});
  STATE.vehicles = (result.success && result.vehicles) || [];
  renderAdminVehicles();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderUtilization === 'function') renderUtilization();
}

function renderAdminDrivers() {
  const term = (STATE.driverSearchTerm || '').toLowerCase();
  const drivers = (STATE.drivers || []).filter((d) => !term ||
    [d.id, d.name, d.contact].some((f) => String(f || '').toLowerCase().includes(term)));
  const rows = drivers.map((d) => `
    <tr>
      <td>${escapeHtml(d.id)}</td>
      <td>${escapeHtml(d.name)}</td>
      <td>${escapeHtml(d.contact)}</td>
      <td><span class="badge ${d.active === false ? 'badge-gray' : 'badge-green'}">${d.active === false ? 'Inactive' : 'Active'}</span></td>
      <td>
        <button class="btn btn-secondary btn-small" data-edit-driver="${escapeHtml(d.id)}">Edit</button>
        <button class="btn btn-danger btn-small" data-deactivate-driver="${escapeHtml(d.id)}">Deactivate</button>
      </td>
    </tr>
  `).join('');
  document.getElementById('adminDriversTableBody').innerHTML = rows ||
    '<tr><td colspan="5" class="empty-state">No drivers found.</td></tr>';
}

async function loadAdminDrivers() {
  const result = await apiGet('getDrivers', {});
  STATE.drivers = (result.success && result.drivers) || [];
  renderAdminDrivers();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderUtilization === 'function') renderUtilization();
}

function openUserModal(user) {
  STATE.adminEditTarget = user || null;
  document.getElementById('userModalTitle').textContent = user ? 'Edit User' : 'Add User';
  document.getElementById('userIdInput').value = (user && user.id) || '';
  document.getElementById('userIdInput').disabled = !!user;
  document.getElementById('userNameInput').value = (user && user.name) || '';
  document.getElementById('userRoleInput').value = (user && user.role) || 'employee';
  document.getElementById('userContactInput').value = (user && user.contact) || '';
  openModal('userModal');
}

async function submitUser() {
  const id = document.getElementById('userIdInput').value.trim();
  const name = document.getElementById('userNameInput').value.trim();
  const role = document.getElementById('userRoleInput').value;
  const contact = document.getElementById('userContactInput').value.trim();

  if (!id || !name) {
    showToast('ID and Name are required', 'error');
    return;
  }

  const isEdit = !!STATE.adminEditTarget;
  const result = await apiPost(isEdit ? 'updateUser' : 'createUser', {
    actorId: STATE.currentUser.id, id, name, role, contact
  });

  if (result.success) {
    showToast(isEdit ? 'User updated' : 'User created', 'success');
    closeModal('userModal');
    if (isEdit) {
      const existing = STATE.employees.find((u) => u.id === id);
      if (existing) Object.assign(existing, { name, role, contact });
      renderAdminUsers();
    } else {
      loadAdminUsers();
    }
  } else {
    showToast(result.error || 'Could not save user', 'error');
  }
}

async function deactivateUser(id) {
  const result = await apiPost('deactivateUser', { actorId: STATE.currentUser.id, id });
  if (result.success) {
    showToast('User deactivated', 'success');
    // getEmployees only ever returns active users, so match that here
    // instead of leaving a stale inactive row a refetch would never show.
    STATE.employees = STATE.employees.filter((u) => u.id !== id);
    renderAdminUsers();
  } else {
    showToast(result.error || 'Could not deactivate user', 'error');
  }
}

function openVehicleModal(vehicle) {
  STATE.adminEditTarget = vehicle || null;
  document.getElementById('vehicleModalTitle').textContent = vehicle ? 'Edit Vehicle' : 'Add Vehicle';
  document.getElementById('vehicleIdInput').value = (vehicle && vehicle.id) || '';
  document.getElementById('vehicleIdInput').disabled = !!vehicle;
  document.getElementById('vehicleNameInput').value = (vehicle && vehicle.name) || '';
  document.getElementById('vehicleRegInput').value = (vehicle && vehicle.registration) || '';
  document.getElementById('vehicleCapacityInput').value = (vehicle && vehicle.capacity) || '';
  document.getElementById('vehicleTypeInput').value = (vehicle && vehicle.type) || '';
  openModal('vehicleModal');
}

async function submitVehicle() {
  const id = document.getElementById('vehicleIdInput').value.trim();
  const name = document.getElementById('vehicleNameInput').value.trim();
  const registration = document.getElementById('vehicleRegInput').value.trim();
  const capacity = document.getElementById('vehicleCapacityInput').value;
  const type = document.getElementById('vehicleTypeInput').value.trim();

  if (!name || !registration) {
    showToast('Name and Registration are required', 'error');
    return;
  }

  const isEdit = !!STATE.adminEditTarget;
  const result = await apiPost(isEdit ? 'updateVehicle' : 'createVehicle', {
    actorId: STATE.currentUser.id, id, name, registration, capacity, type
  });

  if (result.success) {
    showToast(isEdit ? 'Vehicle updated' : 'Vehicle created', 'success');
    closeModal('vehicleModal');
    if (isEdit) {
      const existing = STATE.vehicles.find((v) => v.id === id);
      if (existing) Object.assign(existing, { name, registration, capacity, type });
    } else {
      STATE.vehicles.push({ id: result.id, name, registration, capacity, type, active: true });
    }
    renderAdminVehicles();
  } else {
    showToast(result.error || 'Could not save vehicle', 'error');
  }
}

async function deactivateVehicle(id) {
  const result = await apiPost('deactivateVehicle', { actorId: STATE.currentUser.id, id });
  if (result.success) {
    showToast('Vehicle deactivated', 'success');
    STATE.vehicles = STATE.vehicles.filter((v) => v.id !== id);
    renderAdminVehicles();
  } else {
    showToast(result.error || 'Could not deactivate vehicle', 'error');
  }
}

function openDriverModal(driver) {
  STATE.adminEditTarget = driver || null;
  document.getElementById('driverModalTitle').textContent = driver ? 'Edit Driver' : 'Add Driver';
  document.getElementById('driverIdInput').value = (driver && driver.id) || '';
  document.getElementById('driverIdInput').disabled = !!driver;
  document.getElementById('driverNameInput').value = (driver && driver.name) || '';
  document.getElementById('driverContactInput').value = (driver && driver.contact) || '';
  openModal('driverModal');
}

async function submitDriver() {
  const id = document.getElementById('driverIdInput').value.trim();
  const name = document.getElementById('driverNameInput').value.trim();
  const contact = document.getElementById('driverContactInput').value.trim();

  if (!name) {
    showToast('Name is required', 'error');
    return;
  }

  const isEdit = !!STATE.adminEditTarget;
  const result = await apiPost(isEdit ? 'updateDriver' : 'createDriver', {
    actorId: STATE.currentUser.id, id, name, contact
  });

  if (result.success) {
    showToast(isEdit ? 'Driver updated' : 'Driver created', 'success');
    closeModal('driverModal');
    if (isEdit) {
      const existing = STATE.drivers.find((d) => d.id === id);
      if (existing) Object.assign(existing, { name, contact });
      renderAdminDrivers();
    } else {
      STATE.drivers.push({ id: result.id, name, contact, active: true });
      renderAdminDrivers();
    }
  } else {
    showToast(result.error || 'Could not save driver', 'error');
  }
}

async function deactivateDriver(id) {
  const result = await apiPost('deactivateDriver', { actorId: STATE.currentUser.id, id });
  if (result.success) {
    showToast('Driver deactivated', 'success');
    STATE.drivers = STATE.drivers.filter((d) => d.id !== id);
    renderAdminDrivers();
  } else {
    showToast(result.error || 'Could not deactivate driver', 'error');
  }
}

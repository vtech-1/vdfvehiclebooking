function renderUtilization() {
  renderVehicleUtilization();
  renderDriverUtilization();
}

function renderVehicleUtilization() {
  const tbody = document.getElementById('vehicleUtilizationTableBody');
  if (!tbody) return;

  const vehicles = STATE.vehicles || [];
  const bookings = STATE.approvedBookings || [];

  const tripCountByVehicleId = {};
  bookings.forEach((b) => {
    if (!b.vehicleId) return;
    tripCountByVehicleId[b.vehicleId] = (tripCountByVehicleId[b.vehicleId] || 0) + 1;
  });

  const rows = vehicles
    .map((v) => ({ v, trips: tripCountByVehicleId[v.id] || 0 }))
    .sort((a, b) => b.trips - a.trips)
    .map(({ v, trips }) => `
      <tr>
        <td>${escapeHtml(v.name)}</td>
        <td>${escapeHtml(v.registration)}</td>
        <td>${trips}</td>
      </tr>
    `).join('');

  tbody.innerHTML = rows || '<tr><td colspan="3" class="empty-state">No vehicles found.</td></tr>';
}

function renderDriverUtilization() {
  const tbody = document.getElementById('driverUtilizationTableBody');
  if (!tbody) return;

  const drivers = STATE.drivers || [];
  const bookings = STATE.approvedBookings || [];

  const tripCountByDriverId = {};
  bookings.forEach((b) => {
    if (!b.driverId) return;
    tripCountByDriverId[b.driverId] = (tripCountByDriverId[b.driverId] || 0) + 1;
  });

  const rows = drivers
    .map((d) => ({ d, trips: tripCountByDriverId[d.id] || 0 }))
    .sort((a, b) => b.trips - a.trips)
    .map(({ d, trips }) => `
      <tr>
        <td>${escapeHtml(d.name)}</td>
        <td>${escapeHtml(d.contact)}</td>
        <td>${trips}</td>
      </tr>
    `).join('');

  tbody.innerHTML = rows || '<tr><td colspan="3" class="empty-state">No drivers found.</td></tr>';
}

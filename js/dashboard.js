function renderDashboard() {
  const pendingEl = document.getElementById('statPendingCount');
  const todayTripsEl = document.getElementById('statTodayTripsCount');
  const vehiclesEl = document.getElementById('statActiveVehiclesCount');
  const driversEl = document.getElementById('statActiveDriversCount');
  if (!pendingEl) return;

  const today = todayISO();
  const todaysTrips = (STATE.approvedBookings || []).filter((b) => b.date === today);

  pendingEl.textContent = (STATE.pendingBookings || []).length;
  todayTripsEl.textContent = todaysTrips.length;
  vehiclesEl.textContent = (STATE.vehicles || []).length;
  driversEl.textContent = (STATE.drivers || []).length;

  renderTodaysTrips(todaysTrips);
}

function renderTodaysTrips(todaysTrips) {
  const list = document.getElementById('todaysTripsList');
  if (!list) return;
  if (todaysTrips.length === 0) {
    list.innerHTML = '<div class="empty-state">No trips today.</div>';
    return;
  }

  const vehicleNameById = {};
  (STATE.vehicles || []).forEach((v) => { vehicleNameById[v.id] = v.name; });
  const driverNameById = {};
  (STATE.drivers || []).forEach((d) => { driverNameById[d.id] = d.name; });

  const rows = todaysTrips.map((b) => `
    <tr>
      <td>${escapeHtml(b.employeeName)}</td>
      <td>${formatTime(b.fromTime)} - ${formatTime(b.toTime)}</td>
      <td>${escapeHtml(vehicleNameById[b.vehicleId] || b.vehicleId || '-')}</td>
      <td>${escapeHtml(driverNameById[b.driverId] || b.driverId || '-')}</td>
    </tr>
  `).join('');

  list.innerHTML = `
    <div class="table-wrap">
      <table class="records-table">
        <thead>
          <tr><th>Employee</th><th>Time</th><th>Vehicle</th><th>Driver</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

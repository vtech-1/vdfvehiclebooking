async function loadPendingBookings() {
  const result = await apiGet('getPendingBookings', {});
  if (!result.success) {
    showToast(result.error || 'Could not load pending requests', 'error');
    return;
  }
  STATE.pendingBookings = result.bookings || [];
  renderPendingBookings();
}

function renderPendingBookings() {
  const list = document.getElementById('pendingBookingsList');
  if (!list) return;
  if (STATE.pendingBookings.length === 0) {
    list.innerHTML = '<div class="empty-state">No pending requests.</div>';
    return;
  }
  list.innerHTML = STATE.pendingBookings.map(renderPendingCard).join('');
}

function renderPendingCard(b) {
  return `
    <div class="ticket-card ticket-red">
      <div class="ticket-card-title">
        ${escapeHtml(b.employeeName)}
        <span class="badge badge-yellow">Pending</span>
      </div>
      <div class="ticket-card-meta">Date: ${formatDate(b.date)} &middot; ${formatTime(b.fromTime)} - ${formatTime(b.toTime)}</div>
      <div class="ticket-card-meta">Purpose: ${escapeHtml(b.purpose)} &middot; People: ${escapeHtml(b.people)}</div>
      <div class="ticket-card-actions">
        <button class="btn btn-primary btn-small" data-approve-booking="${escapeHtml(b.id)}">Approve</button>
        <button class="btn btn-danger btn-small" data-reject-booking="${escapeHtml(b.id)}">Reject</button>
      </div>
    </div>
  `;
}

async function loadApprovedBookings() {
  const result = await apiGet('getApprovedBookings', {});
  if (!result.success) {
    showToast(result.error || 'Could not load approved bookings', 'error');
    return;
  }
  STATE.approvedBookings = result.bookings || [];
  renderApprovedBookings();
}

function renderApprovedBookings() {
  const list = document.getElementById('approvedBookingsList');
  if (!list) return;
  if (STATE.approvedBookings.length === 0) {
    list.innerHTML = '<div class="empty-state">No approved bookings.</div>';
    return;
  }
  const rows = STATE.approvedBookings.map((b) => `
    <tr>
      <td>${escapeHtml(b.employeeName)}</td>
      <td>${formatDate(b.date)}</td>
      <td>${formatTime(b.fromTime)} - ${formatTime(b.toTime)}</td>
      <td>${escapeHtml(b.purpose)}</td>
      <td>${escapeHtml(b.vehicleId || '-')}</td>
      <td>${escapeHtml(b.driverId || '-')}</td>
    </tr>
  `).join('');
  list.innerHTML = `
    <div class="table-wrap">
      <table class="records-table">
        <thead>
          <tr><th>Employee</th><th>Date</th><th>Time</th><th>Purpose</th><th>Vehicle</th><th>Driver</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function openApprovalModal(bookingId) {
  STATE.activeApprovalBookingId = bookingId;
  const [vehiclesRes, driversRes] = await Promise.all([
    apiGet('getVehicles', {}),
    apiGet('getDrivers', {})
  ]);
  const vehicles = (vehiclesRes.success && vehiclesRes.vehicles) || [];
  const drivers = (driversRes.success && driversRes.drivers) || [];

  const vehicleSelect = document.getElementById('approveVehicleSelect');
  vehicleSelect.innerHTML = '<option value="">Select vehicle</option>' +
    vehicles.map((v) => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)} (${escapeHtml(v.registration)})</option>`).join('');

  const driverSelect = document.getElementById('approveDriverSelect');
  driverSelect.innerHTML = '<option value="">Select driver</option>' +
    drivers.map((d) => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join('');

  openModal('approvalModal');
}

async function submitApproval() {
  const bookingId = STATE.activeApprovalBookingId;
  const vehicleId = document.getElementById('approveVehicleSelect').value;
  const driverId = document.getElementById('approveDriverSelect').value;

  if (!vehicleId || !driverId) {
    showToast('Select both vehicle and driver', 'error');
    return;
  }

  const result = await apiPost('approveBooking', {
    actorId: STATE.currentUser.id,
    bookingId,
    vehicleId,
    driverId
  });

  if (result.success) {
    showToast('Booking approved', 'success');
    closeModal('approvalModal');
    loadPendingBookings();
    loadApprovedBookings();
  } else {
    showToast(result.error || 'Could not approve booking', 'error');
  }
}

function openRejectionModal(bookingId) {
  STATE.activeRejectBookingId = bookingId;
  document.getElementById('rejectReasonInput').value = '';
  openModal('rejectionModal');
}

async function submitRejection() {
  const bookingId = STATE.activeRejectBookingId;
  const reason = document.getElementById('rejectReasonInput').value.trim();

  if (!reason) {
    showToast('Enter a reason for rejection', 'error');
    return;
  }

  const result = await apiPost('rejectBooking', {
    actorId: STATE.currentUser.id,
    bookingId,
    reason
  });

  if (result.success) {
    showToast('Booking rejected', 'success');
    closeModal('rejectionModal');
    loadPendingBookings();
  } else {
    showToast(result.error || 'Could not reject booking', 'error');
  }
}

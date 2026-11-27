async function loadPendingBookings() {
  const result = await apiGet('getPendingBookings', {});
  if (!result.success) {
    showToast(result.error || 'Could not load pending requests', 'error');
    return;
  }
  STATE.pendingBookings = result.bookings || [];
  renderPendingBookings();
  updatePendingCountBadge();
  if (typeof renderDashboard === 'function') renderDashboard();
}

function updatePendingCountBadge() {
  const badge = document.getElementById('pendingCountBadge');
  if (!badge) return;
  const count = STATE.pendingBookings.length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

function renderPendingBookings() {
  const list = document.getElementById('pendingBookingsList');
  if (!list) return;
  if (STATE.pendingBookings.length === 0) {
    list.innerHTML = '<div class="empty-state">No pending requests.</div>';
    return;
  }
  list.innerHTML = [...STATE.pendingBookings].sort(compareByDateTime).map(renderPendingCard).join('');
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
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderUtilization === 'function') renderUtilization();
}

function renderApprovedBookings() {
  const list = document.getElementById('approvedBookingsList');
  if (!list) return;
  if (STATE.approvedBookings.length === 0) {
    list.innerHTML = '<div class="empty-state">No approved bookings.</div>';
    return;
  }
  const today = todayISO();
  const nowTime = new Date().toTimeString().slice(0, 5);
  const rows = [...STATE.approvedBookings].sort(compareByDateTime).map((b) => {
    // "End Trip" only makes sense for a trip that is today and currently in
    // progress by the clock (started, not yet at its booked end time).
    const canEndTrip = b.date === today && nowTime > b.fromTime && nowTime < b.toTime;
    return `
    <tr>
      <td>${escapeHtml(b.employeeName)}</td>
      <td>${formatDate(b.date)}</td>
      <td>${formatTime(b.fromTime)} - ${formatTime(b.toTime)}</td>
      <td>${escapeHtml(b.purpose)}</td>
      <td>${escapeHtml(vehicleNameFor(b.vehicleId))}</td>
      <td>${escapeHtml(driverNameFor(b.driverId))}</td>
      <td>${canEndTrip ? `<button class="btn btn-small btn-secondary" data-end-trip="${escapeHtml(b.id)}">End Trip</button>` : '-'}</td>
    </tr>
  `;
  }).join('');
  list.innerHTML = `
    <div class="table-wrap">
      <table class="records-table">
        <thead>
          <tr><th>Employee</th><th>Date</th><th>Time</th><th>Purpose</th><th>Vehicle</th><th>Driver</th><th>Vehicle Returned?</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// Manager confirms the vehicle physically returned before its booked end
// time, so it (and the driver) become free for a new booking starting now.
async function submitEndTripEarly(bookingId) {
  await runGuarded('endTripEarly:' + bookingId, null, async () => {
    const result = await apiPost('endTripEarly', {
      actorId: STATE.currentUser.id,
      bookingId
    });
    if (result.success) {
      showToast(result.message || 'Trip ended. Vehicle is now free.', 'success');
      const booking = STATE.approvedBookings.find((b) => sameId(b.id, bookingId));
      if (booking) {
        const nowTime = new Date().toTimeString().slice(0, 5);
        if (booking.date === todayISO() && nowTime > booking.fromTime && nowTime < booking.toTime) {
          booking.toTime = nowTime;
        }
      }
      renderApprovedBookings();
      if (typeof renderUtilization === 'function') renderUtilization();
    } else {
      showToast(result.error || 'Could not end trip', 'error');
    }
  });
}

function _csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function downloadApprovedBookingsReport() {
  const bookings = [...STATE.approvedBookings].sort(compareByDateTime);

  const header = ['Date', 'Time', 'Vehicle', 'Person', 'Reason'];
  const rows = bookings.map((b) => [
    b.date,
    `${formatTime(b.fromTime)} - ${formatTime(b.toTime)}`,
    vehicleNameFor(b.vehicleId),
    b.employeeName,
    b.purpose
  ]);

  const csv = [header, ...rows].map((r) => r.map(_csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `approved-bookings-${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// page-admin-home already loads vehicles/drivers into STATE on every visit
// (loadAdminVehicles/loadAdminDrivers), so reuse that instead of re-fetching
// the same data again on every single "Approve" click. Only hits the network
// if STATE is empty, e.g. a direct deep link before the page finished loading.
async function openApprovalModal(bookingId) {
  STATE.activeApprovalBookingId = bookingId;

  let vehicles = STATE.vehicles;
  let drivers = STATE.drivers;
  if (!vehicles.length || !drivers.length) {
    const [vehiclesRes, driversRes] = await Promise.all([
      apiGet('getVehicles', {}),
      apiGet('getDrivers', {})
    ]);
    vehicles = (vehiclesRes.success && vehiclesRes.vehicles) || [];
    drivers = (driversRes.success && driversRes.drivers) || [];
  }

  const booking = STATE.pendingBookings.find((b) => sameId(b.id, bookingId));
  const people = booking ? Number(booking.people) || 0 : 0;

  const info = document.getElementById('approveBookingInfo');
  if (info) {
    info.innerHTML = booking
      ? `${escapeHtml(booking.employeeName)} &middot; ${formatDate(booking.date)} &middot; ${formatTime(booking.fromTime)} - ${formatTime(booking.toTime)} &middot; People: ${escapeHtml(booking.people)}`
      : '';
  }

  const vehicleSelect = document.getElementById('approveVehicleSelect');
  vehicleSelect.innerHTML = '<option value="">Select vehicle</option>' +
    vehicles.map((v) => {
      const capacity = Number(v.capacity) || 0;
      const tooSmall = people > 0 && capacity > 0 && capacity < people;
      return `<option value="${escapeHtml(v.id)}"${tooSmall ? ' disabled' : ''}>${escapeHtml(v.name)} (${escapeHtml(v.registration)}) – Cap: ${escapeHtml(v.capacity || '-')}${tooSmall ? ' – too small' : ''}</option>`;
    }).join('');

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

  await runGuarded('approveBooking', 'approvalConfirmBtn', async () => {
    const result = await apiPost('approveBooking', {
      actorId: STATE.currentUser.id,
      bookingId,
      vehicleId,
      driverId
    });

    if (result.success) {
      showToast('Booking approved', 'success');
      closeModal('approvalModal');
      const idx = STATE.pendingBookings.findIndex((b) => sameId(b.id, bookingId));
      if (idx !== -1) {
        const [booking] = STATE.pendingBookings.splice(idx, 1);
        booking.status = 'Approved';
        booking.vehicleId = vehicleId;
        booking.driverId = driverId;
        STATE.approvedBookings.push(booking);
      }
      renderPendingBookings();
      renderApprovedBookings();
      updatePendingCountBadge();
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof renderUtilization === 'function') renderUtilization();
    } else {
      showToast(result.error || 'Could not approve booking', 'error');
    }
  });
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

  await runGuarded('rejectBooking', 'rejectionConfirmBtn', async () => {
    const result = await apiPost('rejectBooking', {
      actorId: STATE.currentUser.id,
      bookingId,
      reason
    });

    if (result.success) {
      showToast('Booking rejected', 'success');
      closeModal('rejectionModal');
      STATE.pendingBookings = STATE.pendingBookings.filter((b) => !sameId(b.id, bookingId));
      renderPendingBookings();
      updatePendingCountBadge();
      if (typeof renderDashboard === 'function') renderDashboard();
    } else {
      showToast(result.error || 'Could not reject booking', 'error');
    }
  });
}

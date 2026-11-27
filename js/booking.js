async function loadMyBookings() {
  const user = STATE.currentUser;
  const list = document.getElementById('myBookingsList');
  if (list) list.innerHTML = '<div class="empty-state">Loading…</div>';
  const result = await apiGet('getMyBookings', { employeeId: user.id });
  if (!result.success) {
    showToast(result.error || 'Could not load bookings', 'error');
    return;
  }
  STATE.myBookings = result.bookings || [];
  renderMyBookings();
}

function renderMyBookings() {
  const list = document.getElementById('myBookingsList');
  if (!list) return;
  if (STATE.myBookings.length === 0) {
    list.innerHTML = '<div class="empty-state">No bookings yet. Tap + to request a vehicle.</div>';
    return;
  }
  const today = todayISO();
  const upcoming = STATE.myBookings.filter((b) => b.date >= today).sort(compareByDateTime);
  const past = STATE.myBookings.filter((b) => b.date < today).sort(compareByDateTime).reverse();
  list.innerHTML = [...upcoming, ...past].map(renderMyBookingCard).join('');
}

function renderMyBookingCard(b) {
  const canCancel = b.status === 'Pending';
  return `
    <div class="ticket-card ticket-blue">
      <div class="ticket-card-title">
        ${escapeHtml(b.purpose)}
        <span class="badge ${badgeClassForStatus(b.status)}">${escapeHtml(b.status)}</span>
      </div>
      <div class="ticket-card-meta">Date: ${formatDate(b.date)} &middot; ${formatTime(b.fromTime)} - ${formatTime(b.toTime)}</div>
      <div class="ticket-card-meta">People: ${escapeHtml(b.people)}</div>
      ${b.status === 'Approved' ? `<div class="ticket-card-meta">Vehicle: ${escapeHtml(b.vehicleName || vehicleNameFor(b.vehicleId))} &middot; Driver: ${escapeHtml(b.driverName || driverNameFor(b.driverId))}</div>` : ''}
      ${b.status === 'Rejected' && b.rejectReason ? `<div class="ticket-card-meta">Reason: ${escapeHtml(b.rejectReason)}</div>` : ''}
      ${canCancel ? `<div class="ticket-card-actions"><button class="btn btn-danger btn-small" data-cancel-booking="${escapeHtml(b.id)}">Cancel</button></div>` : ''}
    </div>
  `;
}

function openNewBookingModal() {
  document.getElementById('bookingForm').reset();
  document.getElementById('bookingDate').min = todayISO();
  openModal('newBookingModal');
}

async function submitNewBooking() {
  if (STATE.submittingBooking) return;

  const user = STATE.currentUser;
  const date = document.getElementById('bookingDate').value;
  const fromTimeRaw = document.getElementById('bookingFromTime').value;
  const toTimeRaw = document.getElementById('bookingToTime').value;
  const fromAmPm = document.getElementById('bookingFromAmPm').value;
  const toAmPm = document.getElementById('bookingToAmPm').value;
  const purpose = document.getElementById('bookingPurpose').value.trim();
  const people = document.getElementById('bookingPeople').value;

  if (!date || !fromTimeRaw || !toTimeRaw || !purpose || !people) {
    showToast('Please fill all fields', 'error');
    return;
  }
  if (!isValid12HourTime(fromTimeRaw) || !isValid12HourTime(toTimeRaw)) {
    showToast('Enter time as HH:MM, e.g. 02:30', 'error');
    return;
  }
  const fromTime = to24HourTime(fromTimeRaw, fromAmPm);
  const toTime = to24HourTime(toTimeRaw, toAmPm);
  if (date < todayISO()) {
    showToast('Booking date cannot be in the past', 'error');
    return;
  }
  if (toTime <= fromTime) {
    showToast('End time must be after start time', 'error');
    return;
  }

  const submitBtn = document.getElementById('bookingSubmitBtn');
  STATE.submittingBooking = true;
  if (submitBtn) submitBtn.disabled = true;

  try {
    const result = await apiPost('createBooking', {
      employeeId: user.id,
      employeeName: user.name,
      date,
      fromTime,
      toTime,
      purpose,
      people
    });

    if (result.success) {
      showToast('Booking request submitted', 'success');
      closeModal('newBookingModal');
      loadMyBookings();
    } else {
      showToast(result.error || 'Could not submit booking', 'error');
    }
  } finally {
    STATE.submittingBooking = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

function confirmCancelBooking(bookingId) {
  STATE.activeCancelBookingId = bookingId;
  openModal('cancelBookingModal');
}

async function submitCancelBooking() {
  const user = STATE.currentUser;
  const bookingId = STATE.activeCancelBookingId;
  await runGuarded('cancelBooking', 'cancelBookingConfirmBtn', async () => {
    const result = await apiPost('cancelBooking', { bookingId, employeeId: user.id });
    if (result.success) {
      showToast('Booking cancelled', 'success');
      closeModal('cancelBookingModal');
      loadMyBookings();
    } else {
      showToast(result.error || 'Could not cancel booking', 'error');
    }
  });
}

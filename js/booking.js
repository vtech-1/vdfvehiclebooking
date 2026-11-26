async function loadMyBookings() {
  const user = STATE.currentUser;
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
  list.innerHTML = STATE.myBookings.map(renderMyBookingCard).join('');
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
      ${b.status === 'Approved' ? `<div class="ticket-card-meta">Vehicle: ${escapeHtml(b.vehicleId || '-')} &middot; Driver: ${escapeHtml(b.driverId || '-')}</div>` : ''}
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
  const fromTime = document.getElementById('bookingFromTime').value;
  const toTime = document.getElementById('bookingToTime').value;
  const purpose = document.getElementById('bookingPurpose').value.trim();
  const people = document.getElementById('bookingPeople').value;

  if (!date || !fromTime || !toTime || !purpose || !people) {
    showToast('Please fill all fields', 'error');
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
  const result = await apiPost('cancelBooking', { bookingId, employeeId: user.id });
  if (result.success) {
    showToast('Booking cancelled', 'success');
    closeModal('cancelBookingModal');
    loadMyBookings();
  } else {
    showToast(result.error || 'Could not cancel booking', 'error');
  }
}

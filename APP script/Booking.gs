// Column positions (A=0 .. O=14) match VEHICLE_BOOKING_APP_LOGIC_V2_AVAILABILITY.md's
// direct data[i][n] access exactly. Do not reorder.
function _bookingRowToObject(row, rowIndex) {
  return {
    rowIndex: rowIndex,
    id: row[0],
    employeeName: row[1],
    employeeId: row[2],
    date: row[3],
    fromTime: row[4],
    toTime: row[5],
    purpose: row[6],
    people: row[7],
    status: row[8],
    vehicleId: row[9],
    driverId: row[10],
    rejectReason: row[11],
    requestedDate: row[12],
    approvedBy: row[13],
    approvedDate: row[14]
  };
}

function generateBookingId() {
  const data = bookingsSheet.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const match = String(data[i][0]).match(/^BK(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return 'BK' + String(max + 1).padStart(4, '0');
}

function createBooking(employeeId, employeeName, date, fromTime, toTime, purpose, people) {
  try {
    const bookingId = generateBookingId();
    const requestedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

    bookingsSheet.appendRow([
      bookingId, employeeName, employeeId, date, fromTime, toTime, purpose,
      people, 'Pending', '', '', '', requestedDate, '', ''
    ]);

    logAudit(employeeName, 'CREATE_BOOKING', bookingId, 'New booking request for ' + date);

    return { success: true, bookingId: bookingId };
  } catch (error) {
    logAudit('System', 'ERROR', '', error.toString());
    return { success: false, error: error.toString() };
  }
}

function getBookingById(id) {
  const data = bookingsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return _bookingRowToObject(data[i], i + 1);
    }
  }
  return null;
}

function getPendingBookings() {
  const data = bookingsSheet.getDataRange().getValues();
  const bookings = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][8] === 'Pending') {
      bookings.push(_bookingRowToObject(data[i], i + 1));
    }
  }
  return bookings;
}

function getApprovedBookings() {
  const data = bookingsSheet.getDataRange().getValues();
  const bookings = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][8] === 'Approved') {
      bookings.push(_bookingRowToObject(data[i], i + 1));
    }
  }
  return bookings;
}

function getMyBookings(employeeId) {
  const data = bookingsSheet.getDataRange().getValues();
  const bookings = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(employeeId)) {
      bookings.push(_bookingRowToObject(data[i], i + 1));
    }
  }
  return bookings;
}

function approveBooking(bookingId, vehicleId, driverId, approvedBy) {
  try {
    const booking = getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    const approvedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

    bookingsSheet.getRange(booking.rowIndex, 9).setValue('Approved');
    bookingsSheet.getRange(booking.rowIndex, 10).setValue(vehicleId);
    bookingsSheet.getRange(booking.rowIndex, 11).setValue(driverId);
    bookingsSheet.getRange(booking.rowIndex, 14).setValue(approvedBy);
    bookingsSheet.getRange(booking.rowIndex, 15).setValue(approvedDate);

    logAudit(approvedBy, 'APPROVE_BOOKING', bookingId, 'Assigned vehicle ' + vehicleId + ', driver ' + driverId);

    return { success: true, message: 'Booking approved' };
  } catch (error) {
    logAudit('System', 'ERROR', bookingId, error.toString());
    return { success: false, error: error.toString() };
  }
}

function rejectBooking(bookingId, reason, rejectedBy) {
  try {
    const booking = getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    bookingsSheet.getRange(booking.rowIndex, 9).setValue('Rejected');
    bookingsSheet.getRange(booking.rowIndex, 12).setValue(reason);

    logAudit(rejectedBy, 'REJECT_BOOKING', bookingId, 'Rejected. Reason: ' + reason);

    return { success: true, message: 'Booking rejected' };
  } catch (error) {
    logAudit('System', 'ERROR', bookingId, error.toString());
    return { success: false, error: error.toString() };
  }
}

function cancelBooking(bookingId, cancelledBy) {
  try {
    const booking = getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    bookingsSheet.getRange(booking.rowIndex, 9).setValue('Cancelled');

    logAudit(cancelledBy, 'CANCEL_BOOKING', bookingId, 'Cancelled by ' + cancelledBy);

    return { success: true, message: 'Booking cancelled' };
  } catch (error) {
    logAudit('System', 'ERROR', bookingId, error.toString());
    return { success: false, error: error.toString() };
  }
}

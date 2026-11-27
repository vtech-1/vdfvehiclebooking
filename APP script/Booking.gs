// Column positions (A=0 .. O=14) match VEHICLE_BOOKING_APP_LOGIC_V2_AVAILABILITY.md's
// direct data[i][n] access exactly. Do not reorder.
function _bookingRowToObject(row, rowIndex) {
  return {
    rowIndex: rowIndex,
    id: row[0],
    employeeName: row[1],
    employeeId: row[2],
    date: _formatDateValue(row[3]),
    fromTime: _formatTimeValue(row[4]),
    toTime: _formatTimeValue(row[5]),
    purpose: row[6],
    people: row[7],
    status: row[8],
    vehicleId: row[9],
    driverId: row[10],
    rejectReason: row[11],
    requestedDate: _formatDateTimeValue(row[12]),
    approvedBy: row[13],
    approvedDate: _formatDateTimeValue(row[14])
  };
}

// Sheets converts date/time-like strings written via appendRow into Date cells
// using the spreadsheet's timezone, so read them back in that same timezone.
function _sheetTimeZone() {
  return ss.getSpreadsheetTimeZone();
}

function _formatTimeValue(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, _sheetTimeZone(), 'HH:mm');
  }
  return value;
}

function _formatDateValue(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, _sheetTimeZone(), 'yyyy-MM-dd');
  }
  return String(value);
}

function _formatDateTimeValue(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, _sheetTimeZone(), 'yyyy-MM-dd HH:mm');
  }
  return value;
}

function _nowStamp() {
  return Utilities.formatDate(new Date(), _sheetTimeZone(), 'yyyy-MM-dd HH:mm');
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

// Guards against the same employee submitting the same slot twice. Only
// Pending/Approved bookings block a duplicate; Rejected/Cancelled do not.
function _isDuplicateBooking(employeeId, date, fromTime, toTime) {
  const data = bookingsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[8];
    if (status !== 'Pending' && status !== 'Approved') continue;
    if (String(row[2]) !== String(employeeId)) continue;
    if (_formatDateValue(row[3]) !== date) continue;
    if (_formatTimeValue(row[4]) !== fromTime) continue;
    if (_formatTimeValue(row[5]) !== toTime) continue;
    return true;
  }
  return false;
}

// date is "yyyy-MM-dd", fromTime/toTime are "HH:mm", so string comparison is safe.
function _isPastDate(date) {
  const today = Utilities.formatDate(new Date(), _sheetTimeZone(), 'yyyy-MM-dd');
  return date < today;
}

function _validateBookingInput(date, fromTime, toTime, purpose, people) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) ||
      !/^\d{2}:\d{2}$/.test(String(fromTime)) ||
      !/^\d{2}:\d{2}$/.test(String(toTime))) {
    return 'Invalid date or time';
  }
  if (!String(purpose || '').trim()) return 'Purpose is required';
  const n = Number(people);
  if (!Number.isInteger(n) || n < 1 || n > 50) return 'Number of people must be between 1 and 50';
  if (_isPastDate(date)) return 'Booking date cannot be in the past';
  if (toTime <= fromTime) return 'End time must be after start time';
  return null;
}

function createBooking(employeeId, employeeName, date, fromTime, toTime, purpose, people) {
  const validationError = _validateBookingInput(date, fromTime, toTime, purpose, people);
  if (validationError) return { success: false, error: validationError };

  // Lock so two concurrent requests can't get the same booking ID or both pass the duplicate check.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (_isDuplicateBooking(employeeId, date, fromTime, toTime)) {
      return { success: false, error: 'You already have a booking request for this date and time' };
    }

    const bookingId = generateBookingId();

    bookingsSheet.appendRow([
      bookingId, employeeName, employeeId, date, fromTime, toTime, String(purpose).trim(),
      Number(people), 'Pending', '', '', '', _nowStamp(), '', ''
    ]);

    logAudit(employeeName, 'CREATE_BOOKING', bookingId, 'New booking request for ' + date);

    return { success: true, bookingId: bookingId };
  } catch (error) {
    logAudit('System', 'ERROR', '', error.toString());
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
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

function _idToNameMap(sheet) {
  const data = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < data.length; i++) {
    map[String(data[i][0])] = data[i][1];
  }
  return map;
}

function getMyBookings(employeeId) {
  const data = bookingsSheet.getDataRange().getValues();
  const bookings = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(employeeId)) {
      bookings.push(_bookingRowToObject(data[i], i + 1));
    }
  }
  if (bookings.some(function (b) { return b.vehicleId || b.driverId; })) {
    const vehicleNames = _idToNameMap(vehiclesSheet);
    const driverNames = _idToNameMap(driversSheet);
    bookings.forEach(function (b) {
      b.vehicleName = vehicleNames[String(b.vehicleId)] || '';
      b.driverName = driverNames[String(b.driverId)] || '';
    });
  }
  return bookings;
}

// Two time ranges on the same date overlap unless one ends at or before the other starts.
function _timeRangesOverlap(aFrom, aTo, bFrom, bTo) {
  return aFrom < bTo && bFrom < aTo;
}

// Checks already-Approved bookings for the same vehicle or driver on the same
// date with an overlapping time range, excluding the booking being approved.
function _findApprovalConflict(bookingId, date, fromTime, toTime, vehicleId, driverId) {
  const data = bookingsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]) === String(bookingId)) continue;
    if (row[8] !== 'Approved') continue;
    if (_formatDateValue(row[3]) !== date) continue;
    const existingFrom = _formatTimeValue(row[4]);
    const existingTo = _formatTimeValue(row[5]);
    if (!_timeRangesOverlap(fromTime, toTime, existingFrom, existingTo)) continue;
    if (String(row[9]) === String(vehicleId)) return 'Vehicle ' + vehicleId + ' is already booked for an overlapping time';
    if (String(row[10]) === String(driverId)) return 'Driver ' + driverId + ' is already booked for an overlapping time';
  }
  return null;
}

// force=true skips the overlap check. Used when a manager has personally
// confirmed a vehicle/driver is actually free despite what the recorded
// booking times say (e.g. a trip that returned early but the booking end
// time wasn't updated to the exact minute). Always logged either way so
// there's a trail of when the check was overridden.
function approveBooking(bookingId, vehicleId, driverId, approvedBy, force) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const booking = getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };
    if (booking.status !== 'Pending') return { success: false, error: 'Booking is no longer pending' };

    const conflict = _findApprovalConflict(bookingId, booking.date, booking.fromTime, booking.toTime, vehicleId, driverId);
    if (conflict && !force) return { success: false, error: conflict, conflict: true };

    bookingsSheet.getRange(booking.rowIndex, 9).setValue('Approved');
    bookingsSheet.getRange(booking.rowIndex, 10).setValue(vehicleId);
    bookingsSheet.getRange(booking.rowIndex, 11).setValue(driverId);
    bookingsSheet.getRange(booking.rowIndex, 14).setValue(approvedBy);
    bookingsSheet.getRange(booking.rowIndex, 15).setValue(_nowStamp());

    const detail = 'Assigned vehicle ' + vehicleId + ', driver ' + driverId +
      (conflict && force ? ' (OVERRIDE: ' + conflict + ')' : '');
    logAudit(approvedBy, 'APPROVE_BOOKING', bookingId, detail);

    return { success: true, message: 'Booking approved' };
  } catch (error) {
    logAudit('System', 'ERROR', bookingId, error.toString());
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// Manager marks a trip as physically returned early. Shortens the booking's
// toTime to the actual return time so the vehicle/driver become free for any
// new booking that starts after that time (the overlap check in
// _findApprovalConflict compares against this same toTime).
function endTripEarly(bookingId, endedBy) {
  try {
    const booking = getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };
    if (booking.status !== 'Approved') return { success: false, error: 'Only approved trips can be ended' };

    const nowDate = Utilities.formatDate(new Date(), _sheetTimeZone(), 'yyyy-MM-dd');
    const nowTime = Utilities.formatDate(new Date(), _sheetTimeZone(), 'HH:mm');

    // Only shorten if the trip is today and actually still "in progress" by
    // the clock; otherwise leave toTime as-is (nothing to shorten).
    if (booking.date === nowDate && nowTime < booking.toTime && nowTime > booking.fromTime) {
      bookingsSheet.getRange(booking.rowIndex, 6).setValue(nowTime);
    }

    logAudit(endedBy, 'END_TRIP_EARLY', bookingId, 'Vehicle/driver freed from ' + nowTime);

    return { success: true, message: 'Trip ended. Vehicle and driver are now free.' };
  } catch (error) {
    logAudit('System', 'ERROR', bookingId, error.toString());
    return { success: false, error: error.toString() };
  }
}

function rejectBooking(bookingId, reason, rejectedBy) {
  try {
    const booking = getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };
    if (booking.status !== 'Pending') return { success: false, error: 'Booking is no longer pending' };

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
    if (booking.status !== 'Pending') return { success: false, error: 'Only pending bookings can be cancelled' };

    bookingsSheet.getRange(booking.rowIndex, 9).setValue('Cancelled');

    logAudit(cancelledBy, 'CANCEL_BOOKING', bookingId, 'Cancelled by ' + cancelledBy);

    return { success: true, message: 'Booking cancelled' };
  } catch (error) {
    logAudit('System', 'ERROR', bookingId, error.toString());
    return { success: false, error: error.toString() };
  }
}

// Shared sheet handles. Named exactly as Sprint 2's availability code expects
// (bookingsSheet.getDataRange() is called directly in that spec).
const ss = SpreadsheetApp.getActiveSpreadsheet();
const usersSheet = ss.getSheetByName('Users');
const vehiclesSheet = ss.getSheetByName('Vehicles');
const driversSheet = ss.getSheetByName('Drivers');
const bookingsSheet = ss.getSheetByName('Bookings');
const auditLogSheet = ss.getSheetByName('AuditLog');

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Re-validates role from the user's own stored record; never trust a client-sent role.
// Uses the same {success, error} envelope as every business function, so callers
// only ever check `success`, never a separate `ok` field.
function requireRole(userId, allowedRoles) {
  const user = getUserById(userId);
  if (!user) return { success: false, error: 'User not found' };
  if (!user.active) return { success: false, error: 'User is inactive' };
  if (allowedRoles.indexOf(user.role) === -1) return { success: false, error: 'Not authorized' };
  return { success: true, user: user };
}

// Every GET wraps its result in {success, <key>: ...} — the frontend reads
// result.bookings/vehicles/drivers/employees/user, never a bare array/object.
function doGet(e) {
  const action = e.parameter.action;
  try {
    switch (action) {
      case 'getUserById':
        return jsonResponse({ success: true, user: getUserById(e.parameter.id) });
      case 'getEmployees':
        return jsonResponse({ success: true, employees: getEmployees() });
      case 'getVehicles':
        return jsonResponse({ success: true, vehicles: getVehicles() });
      case 'getVehicleById':
        return jsonResponse({ success: true, vehicle: getVehicleById(e.parameter.id) });
      case 'getDrivers':
        return jsonResponse({ success: true, drivers: getDrivers() });
      case 'getDriverById':
        return jsonResponse({ success: true, driver: getDriverById(e.parameter.id) });
      case 'getPendingBookings':
        return jsonResponse({ success: true, bookings: getPendingBookings() });
      case 'getApprovedBookings':
        return jsonResponse({ success: true, bookings: getApprovedBookings() });
      case 'getMyBookings':
        return jsonResponse({ success: true, bookings: getMyBookings(e.parameter.employeeId) });
      case 'getBookingById':
        return jsonResponse({ success: true, booking: getBookingById(e.parameter.id) });
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// Role-gated writes carry `actorId` (the logged-in user's own id) separately from
// any record id being acted on, and the server re-derives the actor's name from
// their own record (approvedBy/rejectedBy) rather than trusting a client-sent name.
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Invalid JSON body' });
  }
  const action = body.action;
  try {
    switch (action) {
      case 'login':
        return jsonResponse(loginUser(body.id, body.password));
      case 'changePassword':
        return jsonResponse(changePassword(body.id, body.oldPassword, body.newPassword));
      case 'createUser': {
        const auth = requireRole(body.actorId, ['admin']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(createUser(body.id, body.name, body.role, body.contact, body.telegramId));
      }
      case 'updateUser': {
        const auth = requireRole(body.actorId, ['admin']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(updateUser(body.id, { name: body.name, role: body.role, contact: body.contact }));
      }
      case 'deactivateUser': {
        const auth = requireRole(body.actorId, ['admin']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(deactivateUser(body.id));
      }
      case 'createVehicle': {
        const auth = requireRole(body.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(createVehicle(body.name, body.registration, body.capacity, body.type));
      }
      case 'updateVehicle': {
        const auth = requireRole(body.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(updateVehicle(body.id, { name: body.name, registration: body.registration, capacity: body.capacity, type: body.type }));
      }
      case 'deactivateVehicle': {
        const auth = requireRole(body.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(deactivateVehicle(body.id));
      }
      case 'createDriver': {
        const auth = requireRole(body.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(createDriver(body.name, body.contact));
      }
      case 'updateDriver': {
        const auth = requireRole(body.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(updateDriver(body.id, { name: body.name, contact: body.contact }));
      }
      case 'deactivateDriver': {
        const auth = requireRole(body.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(deactivateDriver(body.id));
      }
      case 'createBooking':
        return jsonResponse(createBooking(body.employeeId, body.employeeName, body.date, body.fromTime, body.toTime, body.purpose, body.people));
      case 'approveBooking': {
        const auth = requireRole(body.actorId, ['fleetmanager', 'admin']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(approveBooking(body.bookingId, body.vehicleId, body.driverId, auth.user.name));
      }
      case 'rejectBooking': {
        const auth = requireRole(body.actorId, ['fleetmanager', 'admin']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(rejectBooking(body.bookingId, body.reason, auth.user.name));
      }
      case 'cancelBooking':
        return jsonResponse(cancelBooking(body.bookingId, body.employeeId));
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

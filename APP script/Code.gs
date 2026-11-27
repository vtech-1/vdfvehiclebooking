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

// All requests arrive as GET with action + params in the query string.
// Apps Script's POST redirect hop (script.google.com -> googleusercontent.com)
// drops CORS headers, which browsers block silently as a generic fetch failure,
// so GET-with-query-string is used everywhere instead of a JSON POST body.
// Every response wraps its result in {success, <key>: ...} — the frontend reads
// result.bookings/vehicles/drivers/employees/user, never a bare array/object.
function doGet(e) {
  const p = e.parameter;
  const action = p.action;
  try {
    switch (action) {
      case 'getUserById':
        return jsonResponse({ success: true, user: getUserById(p.id) });
      case 'getEmployees':
        return jsonResponse({ success: true, employees: getEmployees() });
      // Single round trip for everything the admin/fleetmanager dashboard needs
      // on load, instead of 5 separate HTTP requests (each with its own Apps
      // Script dispatch overhead) for employees/vehicles/drivers/pending/approved.
      case 'getAdminDashboardData':
        return jsonResponse({
          success: true,
          employees: getEmployees(),
          vehicles: getVehicles(),
          drivers: getDrivers(),
          pendingBookings: getPendingBookings(),
          approvedBookings: getApprovedBookings()
        });
      case 'getVehicles':
        return jsonResponse({ success: true, vehicles: getVehicles() });
      case 'getVehicleById':
        return jsonResponse({ success: true, vehicle: getVehicleById(p.id) });
      case 'getDrivers':
        return jsonResponse({ success: true, drivers: getDrivers() });
      case 'getDriverById':
        return jsonResponse({ success: true, driver: getDriverById(p.id) });
      case 'getPendingBookings':
        return jsonResponse({ success: true, bookings: getPendingBookings() });
      case 'getApprovedBookings':
        return jsonResponse({ success: true, bookings: getApprovedBookings() });
      case 'getMyBookings':
        return jsonResponse({ success: true, bookings: getMyBookings(p.employeeId) });
      case 'getBookingById':
        return jsonResponse({ success: true, booking: getBookingById(p.id) });
      case 'login':
        return jsonResponse(loginUser(p.id, p.password));
      case 'changePassword':
        return jsonResponse(changePassword(p.id, p.oldPassword, p.newPassword));
      case 'createUser': {
        const auth = requireRole(p.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(createUser(p.id, p.name, p.role, p.contact, p.telegramId));
      }
      case 'updateUser': {
        const auth = requireRole(p.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(updateUser(p.id, { name: p.name, role: p.role, contact: p.contact }));
      }
      case 'deactivateUser': {
        const auth = requireRole(p.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(deactivateUser(p.id));
      }
      case 'createVehicle': {
        const auth = requireRole(p.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(createVehicle(p.name, p.registration, p.capacity, p.type));
      }
      case 'updateVehicle': {
        const auth = requireRole(p.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(updateVehicle(p.id, { name: p.name, registration: p.registration, capacity: p.capacity, type: p.type }));
      }
      case 'deactivateVehicle': {
        const auth = requireRole(p.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(deactivateVehicle(p.id));
      }
      case 'createDriver': {
        const auth = requireRole(p.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(createDriver(p.name, p.contact));
      }
      case 'updateDriver': {
        const auth = requireRole(p.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(updateDriver(p.id, { name: p.name, contact: p.contact }));
      }
      case 'deactivateDriver': {
        const auth = requireRole(p.actorId, ['admin', 'fleetmanager']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(deactivateDriver(p.id));
      }
      case 'createBooking':
        return jsonResponse(createBooking(p.employeeId, p.employeeName, p.date, p.fromTime, p.toTime, p.purpose, p.people));
      case 'approveBooking': {
        const auth = requireRole(p.actorId, ['fleetmanager', 'admin']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(approveBooking(p.bookingId, p.vehicleId, p.driverId, auth.user.name));
      }
      case 'endTripEarly': {
        const auth = requireRole(p.actorId, ['fleetmanager', 'admin']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(endTripEarly(p.bookingId, auth.user.name));
      }
      case 'rejectBooking': {
        const auth = requireRole(p.actorId, ['fleetmanager', 'admin']);
        if (!auth.success) return jsonResponse(auth);
        return jsonResponse(rejectBooking(p.bookingId, p.reason, auth.user.name));
      }
      case 'cancelBooking':
        return jsonResponse(cancelBooking(p.bookingId, p.employeeId));
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

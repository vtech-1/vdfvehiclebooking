// One-time sheet creation. Run setupSheets() manually once from the Apps Script editor.

const USERS_HEADERS = ['id', 'name', 'passwordHash', 'role', 'forceChange', 'contact', 'telegramId', 'active'];
const VEHICLES_HEADERS = ['id', 'name', 'registration', 'capacity', 'type', 'active'];
const DRIVERS_HEADERS = ['id', 'name', 'contact', 'telegramId', 'active'];
// Exact 15-column order is a contract with Sprint 2's availability code, which
// reads data[i][0]..data[i][14] by position (see VEHICLE_BOOKING_APP_LOGIC_V2_AVAILABILITY.md).
const BOOKINGS_HEADERS = [
  'id', 'employeeName', 'employeeId', 'date', 'fromTime', 'toTime', 'purpose',
  'people', 'status', 'vehicleId', 'driverId', 'rejectReason',
  'requestedDate', 'approvedBy', 'approvedDate'
];
const AUDITLOG_HEADERS = ['timestamp', 'user', 'action', 'bookingId', 'details'];

function _formatHeader(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function _getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const users = _getOrCreateSheet(ss, 'Users');
  _formatHeader(users, USERS_HEADERS);

  const vehicles = _getOrCreateSheet(ss, 'Vehicles');
  _formatHeader(vehicles, VEHICLES_HEADERS);

  const drivers = _getOrCreateSheet(ss, 'Drivers');
  _formatHeader(drivers, DRIVERS_HEADERS);

  const bookings = _getOrCreateSheet(ss, 'Bookings');
  _formatHeader(bookings, BOOKINGS_HEADERS);

  const auditLog = _getOrCreateSheet(ss, 'AuditLog');
  _formatHeader(auditLog, AUDITLOG_HEADERS);

  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet) {
    ss.deleteSheet(defaultSheet);
  }

  // Bootstrap: without at least one admin, every role-gated action in Code.gs
  // (requireRole) is permanently unreachable since there's no admin to approve
  // the first one. Default password = the id itself, same convention as createUser.
  if (users.getLastRow() < 2) {
    const adminId = '0001';
    const passwordHash = _hashPassword(adminId);
    users.appendRow([adminId, 'Admin', passwordHash, 'admin', true, '', '', true]);
    Logger.log('Seeded default admin: id=' + adminId + ' password=' + adminId + ' (must change on first login)');
  }

  Logger.log('Sheets created/verified: Users, Vehicles, Drivers, Bookings, AuditLog');
}

let _driversCache = null;

function _driverRowToObject(row, rowIndex) {
  return {
    rowIndex: rowIndex,
    id: row[0],
    name: row[1],
    contact: row[2],
    telegramId: row[3],
    active: row[4] === true || row[4] === 'TRUE'
  };
}

function getDrivers() {
  if (_driversCache) return _driversCache;
  const data = driversSheet.getDataRange().getValues();
  const drivers = [];
  for (let i = 1; i < data.length; i++) {
    const driver = _driverRowToObject(data[i], i + 1);
    if (driver.active) drivers.push(driver);
  }
  _driversCache = drivers;
  return drivers;
}

function getDriverById(id) {
  const data = driversSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return _driverRowToObject(data[i], i + 1);
    }
  }
  return null;
}

function _generateDriverId() {
  const data = driversSheet.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const match = String(data[i][0]).match(/^D(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return 'D' + String(max + 1).padStart(3, '0');
}

function createDriver(name, contact, telegramId) {
  const id = _generateDriverId();
  driversSheet.appendRow([id, name, contact, telegramId || '', true]);
  _driversCache = null;
  return { success: true, id: id };
}

function updateDriver(id, fields) {
  const driver = getDriverById(id);
  if (!driver) return { success: false, error: 'Driver not found' };
  const colMap = { name: 2, contact: 3, telegramId: 4, active: 5 };
  Object.keys(fields || {}).forEach(function (key) {
    if (colMap[key]) {
      driversSheet.getRange(driver.rowIndex, colMap[key]).setValue(fields[key]);
    }
  });
  _driversCache = null;
  return { success: true };
}

function deactivateDriver(id) {
  const driver = getDriverById(id);
  if (!driver) return { success: false, error: 'Driver not found' };
  driversSheet.getRange(driver.rowIndex, 5).setValue(false);
  _driversCache = null;
  return { success: true };
}

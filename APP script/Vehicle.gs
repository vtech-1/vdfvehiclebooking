function _vehicleRowToObject(row, rowIndex) {
  return {
    rowIndex: rowIndex,
    id: row[0],
    name: row[1],
    registration: row[2],
    capacity: row[3],
    type: row[4],
    active: row[5] === true || row[5] === 'TRUE'
  };
}

function getVehicles() {
  const data = vehiclesSheet.getDataRange().getValues();
  const vehicles = [];
  for (let i = 1; i < data.length; i++) {
    const vehicle = _vehicleRowToObject(data[i], i + 1);
    if (vehicle.active) vehicles.push(vehicle);
  }
  return vehicles;
}

function getVehicleById(id) {
  const data = vehiclesSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return _vehicleRowToObject(data[i], i + 1);
    }
  }
  return null;
}

function _generateVehicleId() {
  const data = vehiclesSheet.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const match = String(data[i][0]).match(/^V(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return 'V' + String(max + 1).padStart(3, '0');
}

function createVehicle(name, registration, capacity, type) {
  const id = _generateVehicleId();
  vehiclesSheet.appendRow([id, name, registration, capacity, type, true]);
  return { success: true, id: id };
}

function updateVehicle(id, fields) {
  const vehicle = getVehicleById(id);
  if (!vehicle) return { success: false, error: 'Vehicle not found' };
  const colMap = { name: 2, registration: 3, capacity: 4, type: 5, active: 6 };
  Object.keys(fields || {}).forEach(function (key) {
    if (colMap[key]) {
      vehiclesSheet.getRange(vehicle.rowIndex, colMap[key]).setValue(fields[key]);
    }
  });
  return { success: true };
}

function deactivateVehicle(id) {
  const vehicle = getVehicleById(id);
  if (!vehicle) return { success: false, error: 'Vehicle not found' };
  vehiclesSheet.getRange(vehicle.rowIndex, 6).setValue(false);
  return { success: true };
}

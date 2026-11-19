let _employeesCache = null;

function _hashPassword(plain) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plain, Utilities.Charset.UTF_8);
  return digest.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function _userRowToObject(row, rowIndex) {
  return {
    rowIndex: rowIndex,
    id: row[0],
    name: row[1],
    passwordHash: row[2],
    role: row[3],
    forceChange: row[4] === true || row[4] === 'TRUE',
    contact: row[5],
    telegramId: row[6],
    active: row[7] === true || row[7] === 'TRUE'
  };
}

function getUserById(id) {
  const data = usersSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return _userRowToObject(data[i], i + 1);
    }
  }
  return null;
}

function getEmployees() {
  if (_employeesCache) return _employeesCache;
  const data = usersSheet.getDataRange().getValues();
  const employees = [];
  for (let i = 1; i < data.length; i++) {
    const user = _userRowToObject(data[i], i + 1);
    if (user.active) employees.push(user);
  }
  _employeesCache = employees;
  return employees;
}

function loginUser(id, password) {
  const user = getUserById(id);
  if (!user) return { success: false, error: 'User not found' };
  if (!user.active) return { success: false, error: 'User is inactive' };
  if (user.passwordHash !== _hashPassword(password)) {
    return { success: false, error: 'Incorrect password' };
  }
  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      forceChange: user.forceChange,
      contact: user.contact
    }
  };
}

// oldPassword is optional: the forced first-login flow only has a "new password"
// field (the user just authenticated via loginUser with the old one), so the
// check only runs when a caller actually supplies oldPassword.
function changePassword(id, oldPassword, newPassword) {
  const user = getUserById(id);
  if (!user) return { success: false, error: 'User not found' };
  if (oldPassword && user.passwordHash !== _hashPassword(oldPassword)) {
    return { success: false, error: 'Incorrect current password' };
  }
  usersSheet.getRange(user.rowIndex, 3).setValue(_hashPassword(newPassword));
  usersSheet.getRange(user.rowIndex, 5).setValue(false);
  _employeesCache = null;
  return { success: true };
}

function createUser(id, name, role, contact, telegramId) {
  if (getUserById(id)) return { success: false, error: 'User ID already exists' };
  usersSheet.appendRow([id, name, _hashPassword(String(id)), role, true, contact || '', telegramId || '', true]);
  _employeesCache = null;
  return { success: true, id: id };
}

function updateUser(id, fields) {
  const user = getUserById(id);
  if (!user) return { success: false, error: 'User not found' };
  const colMap = { name: 2, role: 4, forceChange: 5, contact: 6, telegramId: 7, active: 8 };
  Object.keys(fields || {}).forEach(function (key) {
    if (colMap[key]) {
      usersSheet.getRange(user.rowIndex, colMap[key]).setValue(fields[key]);
    }
  });
  _employeesCache = null;
  return { success: true };
}

function deactivateUser(id) {
  const user = getUserById(id);
  if (!user) return { success: false, error: 'User not found' };
  usersSheet.getRange(user.rowIndex, 8).setValue(false);
  _employeesCache = null;
  return { success: true };
}

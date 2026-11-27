function bindEvents() {
  const fromTimeEl = document.getElementById('bookingFromTime');
  const toTimeEl = document.getElementById('bookingToTime');
  if (fromTimeEl) autoFormatTimeInput(fromTimeEl);
  if (toTimeEl) autoFormatTimeInput(toTimeEl);

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('loginId').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    errorEl.classList.remove('show');
    const result = await handleLogin(id, password);
    if (!result.success) {
      errorEl.textContent = result.error;
      errorEl.classList.add('show');
    }
  });

  document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw1 = document.getElementById('newPassword').value;
    const pw2 = document.getElementById('confirmPassword').value;
    const errorEl = document.getElementById('changePasswordError');
    errorEl.classList.remove('show');
    if (pw1.length < 4) {
      errorEl.textContent = 'Password must be at least 4 characters';
      errorEl.classList.add('show');
      return;
    }
    if (pw1 !== pw2) {
      errorEl.textContent = 'Passwords do not match';
      errorEl.classList.add('show');
      return;
    }
    const result = await handleChangePassword(pw1);
    if (!result.success) {
      errorEl.textContent = result.error || 'Could not change password';
      errorEl.classList.add('show');
    }
  });

  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', logout);
  });

  const newBookingFab = document.getElementById('newBookingFab');
  if (newBookingFab) newBookingFab.addEventListener('click', openNewBookingModal);

  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitNewBooking();
    });
  }

  const cancelBookingConfirmBtn = document.getElementById('cancelBookingConfirmBtn');
  if (cancelBookingConfirmBtn) cancelBookingConfirmBtn.addEventListener('click', submitCancelBooking);

  const myBookingsList = document.getElementById('myBookingsList');
  if (myBookingsList) {
    myBookingsList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cancel-booking]');
      if (btn) confirmCancelBooking(btn.dataset.cancelBooking);
    });
  }

  const pendingBookingsList = document.getElementById('pendingBookingsList');
  if (pendingBookingsList) {
    pendingBookingsList.addEventListener('click', (e) => {
      const approveBtn = e.target.closest('[data-approve-booking]');
      if (approveBtn) openApprovalModal(approveBtn.dataset.approveBooking);
      const rejectBtn = e.target.closest('[data-reject-booking]');
      if (rejectBtn) openRejectionModal(rejectBtn.dataset.rejectBooking);
    });
  }

  const approvalConfirmBtn = document.getElementById('approvalConfirmBtn');
  if (approvalConfirmBtn) approvalConfirmBtn.addEventListener('click', submitApproval);

  const downloadApprovedReportBtn = document.getElementById('downloadApprovedReportBtn');
  if (downloadApprovedReportBtn) downloadApprovedReportBtn.addEventListener('click', downloadApprovedBookingsReport);

  const approvedBookingsList = document.getElementById('approvedBookingsList');
  if (approvedBookingsList) {
    approvedBookingsList.addEventListener('click', (e) => {
      const endTripBtn = e.target.closest('[data-end-trip]');
      if (endTripBtn) submitEndTripEarly(endTripBtn.dataset.endTrip);
    });
  }

  const rejectionConfirmBtn = document.getElementById('rejectionConfirmBtn');
  if (rejectionConfirmBtn) rejectionConfirmBtn.addEventListener('click', submitRejection);

  document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchAdminTab(btn, btn.dataset.adminTab));
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  const addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) addUserBtn.addEventListener('click', () => openUserModal(null));

  const userForm = document.getElementById('userForm');
  if (userForm) {
    userForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitUser();
    });
  }

  const adminUsersTableBody = document.getElementById('adminUsersTableBody');
  if (adminUsersTableBody) {
    adminUsersTableBody.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-user]');
      if (editBtn) {
        const user = STATE.employees.find((u) => sameId(u.id, editBtn.dataset.editUser));
        openUserModal(user);
      }
      const deactivateBtn = e.target.closest('[data-deactivate-user]');
      if (deactivateBtn) deactivateUser(deactivateBtn.dataset.deactivateUser);
    });
  }

  const userSearchInput = document.getElementById('userSearchInput');
  if (userSearchInput) {
    userSearchInput.addEventListener('input', (e) => {
      STATE.userSearchTerm = e.target.value;
      renderAdminUsers();
    });
  }

  const addVehicleBtn = document.getElementById('addVehicleBtn');
  if (addVehicleBtn) addVehicleBtn.addEventListener('click', () => openVehicleModal(null));

  const vehicleForm = document.getElementById('vehicleForm');
  if (vehicleForm) {
    vehicleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitVehicle();
    });
  }

  const adminVehiclesTableBody = document.getElementById('adminVehiclesTableBody');
  if (adminVehiclesTableBody) {
    adminVehiclesTableBody.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-vehicle]');
      if (editBtn) {
        const vehicle = STATE.vehicles.find((v) => sameId(v.id, editBtn.dataset.editVehicle));
        openVehicleModal(vehicle);
      }
      const deactivateBtn = e.target.closest('[data-deactivate-vehicle]');
      if (deactivateBtn) deactivateVehicle(deactivateBtn.dataset.deactivateVehicle);
    });
  }

  const vehicleSearchInput = document.getElementById('vehicleSearchInput');
  if (vehicleSearchInput) {
    vehicleSearchInput.addEventListener('input', (e) => {
      STATE.vehicleSearchTerm = e.target.value;
      renderAdminVehicles();
    });
  }

  const addDriverBtn = document.getElementById('addDriverBtn');
  if (addDriverBtn) addDriverBtn.addEventListener('click', () => openDriverModal(null));

  const driverForm = document.getElementById('driverForm');
  if (driverForm) {
    driverForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitDriver();
    });
  }

  const adminDriversTableBody = document.getElementById('adminDriversTableBody');
  if (adminDriversTableBody) {
    adminDriversTableBody.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-driver]');
      if (editBtn) {
        const driver = STATE.drivers.find((d) => sameId(d.id, editBtn.dataset.editDriver));
        openDriverModal(driver);
      }
      const deactivateBtn = e.target.closest('[data-deactivate-driver]');
      if (deactivateBtn) deactivateDriver(deactivateBtn.dataset.deactivateDriver);
    });
  }

  const driverSearchInput = document.getElementById('driverSearchInput');
  if (driverSearchInput) {
    driverSearchInput.addEventListener('input', (e) => {
      STATE.driverSearchTerm = e.target.value;
      renderAdminDrivers();
    });
  }
}

function onPageShown(pageId) {
  if (pageId === 'page-employee-home') {
    const nameEl = document.getElementById('employeeHeaderName');
    if (nameEl) nameEl.textContent = (STATE.currentUser && STATE.currentUser.name) || '';
    loadMyBookings();
  }
  if (pageId === 'page-admin-home') {
    loadAdminDashboardData();
  }
}

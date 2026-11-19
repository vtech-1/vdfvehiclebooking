let toastTimer = null;

function showToast(message, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast-message show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 3000);
}

function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('active');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
}

function switchAdminTab(tabBtn, panelId) {
  const bar = tabBtn.closest('.tab-bar');
  bar.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.remove('active'));
  tabBtn.classList.add('active');
  const panelGroup = document.getElementById(panelId).parentElement;
  panelGroup.querySelectorAll('.admin-tab-panel').forEach((p) => p.classList.remove('active'));
  document.getElementById(panelId).classList.add('active');
}

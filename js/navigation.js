function showPage(pageId) {
  document.querySelectorAll('.page').forEach((el) => el.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (!target) return;
  target.classList.add('active');
  STATE.currentPage = pageId;
  document.body.classList.toggle('page-is-admin', pageId === 'page-admin-home');
  window.scrollTo(0, 0);
  if (typeof onPageShown === 'function') onPageShown(pageId);
}

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  routeOnLoad();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

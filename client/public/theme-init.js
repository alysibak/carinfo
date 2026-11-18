/* global localStorage, window, document */
// Before the first paint: the display choices saved on this device
// (src/stores/displayStore.ts), so a light-theme reader never sees a dark flash.
// A file, not an inline script: the site's CSP allows scripts from itself only.
(function () {
  try {
    var raw = localStorage.getItem('carinfo-display');
    var state = (raw && JSON.parse(raw).state) || {};
    var theme = state.theme || 'dark';
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    var root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    if (state.textSize === 'large') root.setAttribute('data-text', 'large');
  } catch {
    // Storage blocked or unreadable: the default, dark and standard size.
  }
})();

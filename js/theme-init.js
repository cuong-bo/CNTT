// Runs in <head> before first paint so the saved theme never flashes.
(function () {
  try {
    // Store.saveTheme writes JSON, so the value is stored as "dark" with quotes.
    var raw = localStorage.getItem("cntt-onthi:theme");
    var saved = raw ? JSON.parse(raw) : null;
    var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();

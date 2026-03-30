// Footer stats loader — shows total emails sent count in footer
// Refreshes every 5 minutes

(function () {
  var API_URL = 'http://localhost:8787/stats';
  var REFRESH_INTERVAL = 5 * 60 * 1000;

  async function loadFooterStats() {
    try {
      var res = await fetch(API_URL);
      if (!res.ok) return;
      var data = await res.json();
      var el = document.getElementById('footer-email-count');
      if (el) el.textContent = Number(data.totalEmails).toLocaleString();
    } catch (err) {
      // Silently fail
    }
  }

  loadFooterStats();
  setInterval(loadFooterStats, REFRESH_INTERVAL);
})();

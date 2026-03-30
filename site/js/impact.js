// Impact page stats loader
// Fetches from /stats endpoint and refreshes every 5 minutes

(function () {
  var API_URL = 'http://localhost:8787/stats';
  var REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  function formatNumber(n) {
    return Number(n).toLocaleString();
  }

  async function loadStats() {
    try {
      var res = await fetch(API_URL);
      if (!res.ok) return;
      var data = await res.json();

      var totalEl = document.getElementById('total-emails');
      if (totalEl) totalEl.textContent = formatNumber(data.totalEmails);

      var subsEl = document.getElementById('total-subscribers');
      if (subsEl) subsEl.textContent = formatNumber(data.totalSubscribers);

      var tableBody = document.getElementById('district-table-body');
      if (tableBody && data.byDistrict) {
        tableBody.innerHTML = '';
        data.byDistrict.forEach(function (row) {
          var tr = document.createElement('tr');
          var tdDistrict = document.createElement('td');
          tdDistrict.textContent = row.district || 'Unknown';
          tdDistrict.style.cssText = 'padding:12px 16px;border-bottom:1px solid #E0E2E7;';
          var tdCount = document.createElement('td');
          tdCount.textContent = formatNumber(row.count);
          tdCount.style.cssText = 'padding:12px 16px;border-bottom:1px solid #E0E2E7;text-align:right;font-weight:600;';
          tr.appendChild(tdDistrict);
          tr.appendChild(tdCount);
          tableBody.appendChild(tr);
        });
      }
    } catch (err) {
      // Silently fail — page still shows placeholder
    }
  }

  loadStats();
  setInterval(loadStats, REFRESH_INTERVAL);
})();

// Newsletter subscription handler
// Hooks into .newsletter-form elements across all pages

(function () {
  // TODO: Replace with your Cloudflare Worker URL after deployment
  // const API_URL = 'https://movets-api.YOUR_ACCOUNT.workers.dev/subscribe';
  const API_URL = 'http://localhost:8787/subscribe';

  document.querySelectorAll('.newsletter-form').forEach(function (form) {
    form.removeAttribute('onsubmit');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const input = form.querySelector('input[type="email"]');
      const btn = form.querySelector('button[type="submit"]');
      const email = input ? input.value.trim() : '';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showPopup('Please enter a valid email address.', false);
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Subscribing...';

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (res.ok) {
          showPopup('Subscribed! We\'ll keep you updated on HB2089.', true);
          input.value = '';
        } else {
          showPopup(data.error || 'Something went wrong. Please try again.', false);
        }
      } catch (err) {
        showPopup('Connection error. Please try again.', false);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Subscribe';
      }
    });
  });

  function showPopup(text, success) {
    // Remove existing popup if any
    var existing = document.getElementById('subscribe-popup');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'subscribe-popup';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(14,18,30,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:40px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:48px;margin-bottom:16px;';
    icon.textContent = success ? '\u2705' : '\u274C';

    var heading = document.createElement('h3');
    heading.style.cssText = 'font-size:22px;font-weight:700;color:#0E121E;margin-bottom:12px;';
    heading.textContent = success ? 'You\'re Subscribed!' : 'Oops!';

    var msg = document.createElement('p');
    msg.style.cssText = 'font-size:16px;line-height:26px;color:#53565E;margin-bottom:24px;';
    msg.textContent = text;

    var closeBtn = document.createElement('button');
    closeBtn.textContent = success ? 'Got it' : 'Close';
    closeBtn.style.cssText = 'background:' + (success ? '#FF344C' : '#26385E') + ';color:#fff;border:none;padding:12px 32px;border-radius:80px;font-size:16px;font-weight:600;cursor:pointer;';

    function close() { overlay.remove(); }
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    box.appendChild(icon);
    box.appendChild(heading);
    box.appendChild(msg);
    box.appendChild(closeBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }
})();

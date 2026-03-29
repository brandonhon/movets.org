// Newsletter subscription handler
// Hooks into .newsletter-form elements across all pages

(function () {
  // TODO: Replace with your Cloudflare Worker URL after deployment
  const API_URL = 'https://movets-api.YOUR_ACCOUNT.workers.dev/subscribe';

  document.querySelectorAll('.newsletter-form').forEach(function (form) {
    form.removeAttribute('onsubmit');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const input = form.querySelector('input[type="email"]');
      const btn = form.querySelector('button[type="submit"]');
      const email = input ? input.value.trim() : '';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage(form, 'Please enter a valid email address.', '#DC1E35');
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
          showMessage(form, 'Subscribed! We\'ll keep you updated on HB2089.', '#16a34a');
          input.value = '';
        } else {
          showMessage(form, data.error || 'Something went wrong. Please try again.', '#DC1E35');
        }
      } catch (err) {
        showMessage(form, 'Connection error. Please try again.', '#DC1E35');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Subscribe';
      }
    });
  });

  function showMessage(form, text, color) {
    let msg = form.querySelector('.subscribe-msg');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'subscribe-msg';
      msg.style.cssText = 'font-size:13px;margin-top:8px;';
      form.appendChild(msg);
    }
    msg.textContent = text;
    msg.style.color = color;
  }
})();

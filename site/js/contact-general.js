// General contact form handler (contact page only)
// Sends messages to info@movets.org via the Worker

(function () {
  // TODO: Replace with your Cloudflare Worker URL after deployment
  // const API_URL = 'https://movets-api.YOUR_ACCOUNT.workers.dev/contact';
  const API_URL = 'http://localhost:8787/contact';

  const form = document.getElementById('contactForm');
  if (!form) return;

  const status = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    status.textContent = '';
    status.style.color = '';

    if (form.website && form.website.value) return;

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      status.textContent = 'Please fill in all fields.';
      status.style.color = '#DC1E35';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'Please enter a valid email address.';
      status.style.color = '#DC1E35';
      return;
    }

    // Turnstile token (skip if local dev)
    const isLocalDev = API_URL.includes('localhost');
    const turnstileEl = document.querySelector('[name="cf-turnstile-response"]');
    const turnstileToken = turnstileEl ? turnstileEl.value : '';
    if (!isLocalDev && turnstileEl && !turnstileToken) {
      status.textContent = 'Please complete the CAPTCHA verification.';
      status.style.color = '#DC1E35';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, turnstileToken, website: form.website?.value }),
      });

      const data = await res.json();

      if (res.ok) {
        status.textContent = 'Message sent! We\'ll get back to you soon.';
        status.style.color = '#16a34a';
        form.reset();
        if (typeof turnstile !== 'undefined') turnstile.reset();
      } else {
        status.textContent = data.error || 'Failed to send. Please try again.';
        status.style.color = '#DC1E35';
      }
    } catch (err) {
      status.textContent = 'Connection error. Please try again.';
      status.style.color = '#DC1E35';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
})();

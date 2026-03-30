// MoVets.org Cloudflare Worker — API for email, subscribe, and contact
const MAX_EMAILS_PER_IP = 75;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_BODY_SIZE = 10000; // 10KB max request body

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, MAX_MESSAGE_LENGTH);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidZip(zip) {
  return /^\d{5}$/.test(zip);
}

function isRepEmail(email) {
  return /^[^\s@]+@house\.mo\.gov$/i.test(email);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

async function verifyTurnstile(token, secretKey, ip) {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: ip,
    }),
  });
  const data = await res.json();
  return data.success === true;
}

async function sendViaBrevo(apiKey, { from, fromName, to, replyTo, subject, textContent, htmlContent }) {
  const payload = {
    sender: { email: from, name: fromName },
    to: [{ email: to }],
    subject,
  };
  if (replyTo) payload.replyTo = { email: replyTo };
  if (htmlContent) payload.htmlContent = htmlContent;
  if (textContent) payload.textContent = textContent;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo API error (${res.status}): ${err}`);
  }

  return res.json();
}

// --- Route handlers ---

async function handleSendEmail(request, env, origin) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_SIZE) {
    return json({ error: 'Request too large.' }, 413, origin);
  }

  const body = JSON.parse(rawBody);
  const {
    name, email, zip, message,
    repEmail, repName, district,
    messageType, website, turnstileToken,
  } = body;

  // Honeypot
  if (website) {
    return json({ success: true }, 200, origin);
  }

  // Required fields
  if (!name || !email || !zip || !message) {
    return json({ error: 'All fields are required.' }, 400, origin);
  }
  if (!isValidEmail(email)) {
    return json({ error: 'Invalid email address.' }, 400, origin);
  }
  if (!isValidZip(zip)) {
    return json({ error: 'Invalid ZIP code.' }, 400, origin);
  }
  const devMode = env.DEV_MODE === 'true';

  if (!repEmail || (!devMode && !isRepEmail(repEmail)) || (devMode && !isValidEmail(repEmail))) {
    return json({ error: 'Invalid representative email. Must be a @house.mo.gov address.' }, 400, origin);
  }

  // Turnstile verification (skipped in dev mode)
  if (!devMode) {
    if (!turnstileToken) {
      return json({ error: 'Please complete the CAPTCHA verification.' }, 400, origin);
    }

    const turnstileOk = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
    if (!turnstileOk) {
      return json({ error: 'CAPTCHA verification failed. Please try again.' }, 400, origin);
    }
  }

  // Check: has this email already sent?
  const existingSender = await env.DB.prepare(
    'SELECT id FROM emails WHERE sender_email = ?'
  ).bind(email.toLowerCase()).first();

  if (existingSender) {
    return json({ error: 'You have already sent a message. Each person may send one message.' }, 400, origin);
  }

  // Check: IP rate limit
  const ipCount = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM emails WHERE ip_address = ?'
  ).bind(ip).first();

  if (ipCount && ipCount.cnt >= MAX_EMAILS_PER_IP) {
    return json({ error: `Message limit reached from this location. Maximum ${MAX_EMAILS_PER_IP} messages allowed.` }, 429, origin);
  }

  // Sanitize
  const cleanName = sanitize(name);
  const cleanMessage = sanitize(message);
  const cleanZip = sanitize(zip);
  const cleanRepName = sanitize(repName || '');
  const cleanDistrict = sanitize(district || '');
  const msgType = messageType === 2 ? 2 : 1;

  const subject = `HB2089 Support: Message from ${cleanName}, ${cleanZip}`;

  const emailBody = [
    `Dear ${cleanRepName || 'Representative'},`,
    '',
    `My name is ${cleanName} and I am a constituent in ${cleanDistrict ? 'District ' + cleanDistrict : 'your district'} (ZIP: ${cleanZip}).`,
    '',
    cleanMessage,
    '',
    'Sincerely,',
    cleanName,
    email,
    '',
    '---',
    'Sent via MoVets.org \u2014 Non-partisan veteran advocacy for HB2089',
  ].join('\n');

  // Send via Brevo
  const actualRecipient = (devMode && env.DEV_TEST_EMAIL) ? env.DEV_TEST_EMAIL : repEmail;

  console.log(`[${devMode ? 'DEV' : 'PROD'}] Sending email:`);
  console.log(`  To: ${actualRecipient}${actualRecipient !== repEmail ? ` (original: ${repEmail})` : ''}`);
  console.log(`  Reply-To: ${email}`);
  console.log(`  Subject: ${subject}`);

  if (env.BREVO_API_KEY) {
    await sendViaBrevo(env.BREVO_API_KEY, {
      from: env.FROM_EMAIL || 'noreply@movets.org',
      fromName: env.FROM_NAME || 'MoVets.org',
      to: actualRecipient,
      replyTo: email,
      subject,
      textContent: emailBody,
    });
    console.log('  Status: Sent via Brevo');
  } else {
    console.log('  Status: Skipped (no BREVO_API_KEY)');
    console.log(`  Body:\n${emailBody}`);
  }

  // Log to D1
  await env.DB.prepare(
    `INSERT INTO emails (sender_email, sender_name, sender_zip, rep_email, rep_name, district, message_type, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    email.toLowerCase(), cleanName, cleanZip,
    repEmail, cleanRepName, cleanDistrict,
    msgType, ip
  ).run();

  return json({ success: true, message: 'Message sent successfully.' }, 200, origin);
}

function getWelcomeEmailHtml(unsubscribeUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MoVets.org</title>
  <style>
    body { margin: 0; padding: 0; background: #F7F8F9; font-family: 'Inter', Arial, Helvetica, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #26385E; padding: 32px 40px; text-align: center; }
    .header img { margin-bottom: 12px; }
    .header h1 { color: #ffffff; font-size: 24px; margin: 0; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.7); font-size: 14px; margin: 8px 0 0; }
    .body { padding: 40px; }
    .body h2 { color: #0E121E; font-size: 22px; margin: 0 0 16px; }
    .body p { color: #53565E; font-size: 16px; line-height: 26px; margin: 0 0 16px; }
    .body ul { color: #53565E; font-size: 16px; line-height: 26px; padding-left: 20px; margin: 0 0 16px; }
    .body a { color: #FF344C; }
    .cta { display: inline-block; background: #FF344C; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 80px; font-weight: 600; font-size: 16px; margin: 8px 0 24px; }
    .divider { border: none; border-top: 1px solid #E0E2E7; margin: 24px 0; }
    .footer { background: #0E121E; padding: 32px 40px; text-align: center; }
    .footer p { color: #717379; font-size: 13px; line-height: 22px; margin: 0 0 8px; }
    .footer a { color: #FF344C; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMzYgMzYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiByeD0iOCIgZmlsbD0iI0ZGMzQ0QyIvPjxwYXRoIGQ9Ik0xMCAxOEwxNCAxMEwxOCAxOEwyMiAxMEwyNiAxOCIgc3Ryb2tlPSIjRkZGIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTggMjRIMjgiIHN0cm9rZT0iI0ZGRiIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPgo=" alt="MoVets logo" width="48" height="48">
      <h1>MoVets.org</h1>
      <p>Non-partisan veteran advocacy for HB2089</p>
    </div>
    <div class="body">
      <h2>Welcome to MoVets.org!</h2>
      <p>Thank you for subscribing to updates on <strong>Missouri HB2089</strong> \u2014 the Disabled Veterans Homestead Exemption bill.</p>
      <p>Here\u2019s what you can expect:</p>
      <ul>
        <li>Updates on HB2089\u2019s progress through the Missouri legislature</li>
        <li>Calls to action when your voice is needed most</li>
        <li>News about veteran property tax relief in Missouri</li>
      </ul>
      <p>In the meantime, the best thing you can do right now is <strong>contact your state representative</strong> and let them know you support HB2089.</p>
      <p>And please <strong>share MoVets.org</strong> with fellow veterans, family, friends, and anyone who supports Missouri\u2019s disabled veterans. Every voice matters \u2014 the more people who speak up, the harder it is for legislators to ignore.</p>
      <hr class="divider">
      <p style="text-align:center;">
        <a href="https://movets.org/take-action.html" class="cta">Take Action Now</a>
      </p>
    </div>
    <div class="footer">
      <p>You received this because you subscribed to updates on <a href="https://movets.org">MoVets.org</a>.</p>
      <p><a href="https://movets.org">Visit MoVets.org</a></p>
      <p style="margin-top:16px;"><a href="${unsubscribeUrl}" style="color:#717379;font-size:12px;">Unsubscribe</a></p>
      <p style="margin-top:8px;font-size:12px;color:#53565E;">&copy; 2026 MoVets.org. Not affiliated with the State of Missouri.</p>
    </div>
  </div>
</body>
</html>`;
}

function getWelcomeEmailText(unsubscribeUrl) {
  return `Welcome to MoVets.org!

Thank you for subscribing to updates on Missouri HB2089 \u2014 the Disabled Veterans Homestead Exemption bill.

Here\u2019s what you can expect:
- Updates on HB2089\u2019s progress through the Missouri legislature
- Calls to action when your voice is needed most
- News about veteran property tax relief in Missouri

In the meantime, the best thing you can do right now is contact your state representative and let them know you support HB2089.

Please share MoVets.org with fellow veterans, family, friends, and anyone who supports Missouri's disabled veterans. Every voice matters -- the more people who speak up, the harder it is for legislators to ignore.

Take Action: https://movets.org/take-action.html
Share: https://movets.org

---
You received this because you subscribed to updates on MoVets.org.
Visit: https://movets.org

Unsubscribe: ${unsubscribeUrl}`;
}

async function handleSubscribe(request, env, origin) {
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_SIZE) {
    return json({ error: 'Request too large.' }, 413, origin);
  }

  const body = JSON.parse(rawBody);
  const { email } = body;

  if (!email || !isValidEmail(email)) {
    return json({ error: 'A valid email address is required.' }, 400, origin);
  }

  const normalized = email.toLowerCase().trim();

  // Check if already subscribed
  const existing = await env.DB.prepare(
    'SELECT id FROM subscribers WHERE email = ?'
  ).bind(normalized).first();

  if (existing) {
    // Don't reveal whether email exists — just return success
    return json({ success: true, message: 'Thank you for subscribing!' }, 200, origin);
  }

  const token = crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO subscribers (email, unsubscribe_token) VALUES (?, ?)'
  ).bind(normalized, token).run();

  const unsubscribeUrl = `${new URL(request.url).origin}/unsubscribe?token=${token}`;

  // Send welcome email
  if (env.BREVO_API_KEY) {
    try {
      await sendViaBrevo(env.BREVO_API_KEY, {
        from: env.FROM_EMAIL || 'noreply@movets.org',
        fromName: env.FROM_NAME || 'MoVets.org',
        to: normalized,
        subject: 'Welcome to MoVets.org \u2014 HB2089 Updates',
        htmlContent: getWelcomeEmailHtml(unsubscribeUrl),
        textContent: getWelcomeEmailText(unsubscribeUrl),
      });
      console.log(`Welcome email sent to: ${normalized}`);
    } catch (err) {
      // Don't fail the subscription if welcome email fails
      console.error(`Welcome email failed for ${normalized}:`, err.message);
    }
  } else {
    console.log(`[DEV] Would send welcome email to: ${normalized}`);
    console.log(`  Unsubscribe URL: ${unsubscribeUrl}`);
  }

  return json({ success: true, message: 'Thank you for subscribing!' }, 200, origin);
}

const CONTACT_EMAIL = 'info@movets.org';

async function handleContact(request, env, origin) {
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_SIZE) {
    return json({ error: 'Request too large.' }, 413, origin);
  }

  const body = JSON.parse(rawBody);
  const { name, email, message, website, turnstileToken } = body;

  // Honeypot
  if (website) {
    return json({ success: true }, 200, origin);
  }

  if (!name || !email || !message) {
    return json({ error: 'All fields are required.' }, 400, origin);
  }
  if (!isValidEmail(email)) {
    return json({ error: 'Invalid email address.' }, 400, origin);
  }

  const devMode = env.DEV_MODE === 'true';

  // Turnstile verification (skipped in dev mode)
  if (!devMode) {
    if (!turnstileToken) {
      return json({ error: 'Please complete the CAPTCHA verification.' }, 400, origin);
    }
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const turnstileOk = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
    if (!turnstileOk) {
      return json({ error: 'CAPTCHA verification failed. Please try again.' }, 400, origin);
    }
  }

  const cleanName = sanitize(name);
  const cleanMessage = sanitize(message);

  const subject = `MoVets.org Contact: Message from ${cleanName}`;
  const emailBody = [
    `New message from MoVets.org contact form:`,
    '',
    `Name: ${cleanName}`,
    `Email: ${email}`,
    '',
    cleanMessage,
  ].join('\n');

  const recipient = (devMode && env.DEV_CONTACT_EMAIL) ? env.DEV_CONTACT_EMAIL : CONTACT_EMAIL;

  console.log(`[${devMode ? 'DEV' : 'PROD'}] Contact form:`);
  console.log(`  To: ${recipient}`);
  console.log(`  From: ${cleanName} <${email}>`);
  console.log(`  Message: ${cleanMessage.slice(0, 100)}...`);

  if (env.BREVO_API_KEY) {
    await sendViaBrevo(env.BREVO_API_KEY, {
      from: env.FROM_EMAIL || 'noreply@movets.org',
      fromName: env.FROM_NAME || 'MoVets.org',
      to: recipient,
      replyTo: email,
      subject,
      textContent: emailBody,
    });
    console.log('  Status: Sent via Brevo');
  } else {
    console.log('  Status: Skipped (no BREVO_API_KEY)');
    console.log(`  Body:\n${emailBody}`);
  }

  return json({ success: true, message: 'Message sent successfully.' }, 200, origin);
}

async function handleStats(env, origin) {
  const [totalEmails, byDistrict, totalSubscribers] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as count FROM emails').first(),
    env.DB.prepare('SELECT district, COUNT(*) as count FROM emails GROUP BY district ORDER BY district').all(),
    env.DB.prepare('SELECT COUNT(*) as count FROM subscribers WHERE unsubscribed_at IS NULL').first(),
  ]);

  return json({
    totalEmails: totalEmails?.count || 0,
    byDistrict: byDistrict?.results || [],
    totalSubscribers: totalSubscribers?.count || 0,
  }, 200, origin);
}

async function handleUnsubscribe(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const siteOrigin = env.ALLOWED_ORIGIN || 'https://movets.org';

  if (!token) {
    return Response.redirect(`${siteOrigin}/unsubscribed.html?status=invalid`, 302);
  }

  const subscriber = await env.DB.prepare(
    'SELECT id, unsubscribed_at FROM subscribers WHERE unsubscribe_token = ?'
  ).bind(token).first();

  if (!subscriber) {
    return Response.redirect(`${siteOrigin}/unsubscribed.html?status=invalid`, 302);
  }

  if (subscriber.unsubscribed_at) {
    return Response.redirect(`${siteOrigin}/unsubscribed.html?status=already`, 302);
  }

  await env.DB.prepare(
    "UPDATE subscribers SET unsubscribed_at = datetime('now') WHERE unsubscribe_token = ?"
  ).bind(token).run();

  return Response.redirect(`${siteOrigin}/unsubscribed.html?status=success`, 302);
}

// --- Main entry ---

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || 'https://movets.org';

    // Geo-block: allow only US IPs
    const country = request.headers.get('CF-IPCountry');
    if (country && country !== 'US') {
      return json({ error: 'This service is only available in the United States.' }, 403, origin);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    // Allow GET for /stats and /unsubscribe
    if (request.method === 'GET') {
      try {
        if (url.pathname === '/stats') return await handleStats(env, origin);
        if (url.pathname === '/unsubscribe') return await handleUnsubscribe(request, env);
      } catch (err) {
        console.error('Worker error:', err);
        return json({ error: 'An error occurred. Please try again later.' }, 500, origin);
      }
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405, origin);
    }

    try {
      switch (url.pathname) {
        case '/send-email':
          return await handleSendEmail(request, env, origin);
        case '/subscribe':
          return await handleSubscribe(request, env, origin);
        case '/contact':
          return await handleContact(request, env, origin);
        default:
          return json({ error: 'Not found.' }, 404, origin);
      }
    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'An error occurred. Please try again later.' }, 500, origin);
    }
  },
};

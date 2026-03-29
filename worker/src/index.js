const MAX_EMAILS_PER_IP = 4;
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // Send via Brevo (or log in dev mode)
  if (devMode) {
    console.log('[DEV] Would send email:');
    console.log(`  To: ${repEmail}`);
    console.log(`  Reply-To: ${email}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${emailBody}`);
  } else {
    await sendViaBrevo(env.BREVO_API_KEY, {
      from: env.FROM_EMAIL || 'noreply@movets.org',
      fromName: env.FROM_NAME || 'MoVets.org',
      to: repEmail,
      replyTo: email,
      subject,
      textContent: emailBody,
    });
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

  await env.DB.prepare(
    'INSERT INTO subscribers (email) VALUES (?)'
  ).bind(normalized).run();

  return json({ success: true, message: 'Thank you for subscribing!' }, 200, origin);
}

// --- Main entry ---

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || 'https://movets.org';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // US-only geo-block (Cloudflare provides country via request.cf)
    const country = request.cf?.country;
    if (country && country !== 'US') {
      return json({ error: 'This service is only available within the United States.' }, 403, origin);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405, origin);
    }

    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case '/send-email':
          return await handleSendEmail(request, env, origin);
        case '/subscribe':
          return await handleSubscribe(request, env, origin);
        default:
          return json({ error: 'Not found.' }, 404, origin);
      }
    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'An error occurred. Please try again later.' }, 500, origin);
    }
  },
};

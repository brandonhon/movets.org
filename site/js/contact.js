const form = document.getElementById('contactForm');
const status = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

// TODO: Replace with your Cloudflare Worker URL after deployment
const API_URL = 'https://movets-api.YOUR_ACCOUNT.workers.dev/send-email';

const DEFAULT_MESSAGE = 'I support HB2089 \u2013 please help Missouri\'s disabled veterans by passing this bill. Fair property tax relief for those who served our country should be a priority.';

const REVISIONS_TEXT = `

---

In addition to supporting HB2089, I respectfully ask that you consider the following amendments to strengthen the bill:

1. PERIODIC REVIEW OF THE VALUE CAP \u2014 The assessed value cap should be reviewed and adjusted every 10 years to reflect current market conditions. The cap should be explicitly based on the assessed value shown on the homeowner\u2019s property tax statement, not the market or sales value of the home.

2. CLARIFY DISABILITY ELIGIBILITY \u2014 Explicitly define "veteran with a disability" as any veteran with a VA disability rating, ensuring all service-connected disabilities are recognized.

3. CODIFY TIERED EXEMPTIONS \u2014 Retain the tiered structure (30\u201349%: $2,500 reduction; 50\u201369%: $5,000 reduction; 70%+: 100% exemption) and clarify these apply as assessed value reductions.

4. EXPAND SURVIVING SPOUSE PROTECTIONS \u2014 Ensure surviving spouses of veterans whose death is service-connected receive a full (100%) exemption, portable to a new primary residence.

5. ADD VEHICLE EXEMPTION \u2014 Exempt one primary vehicle owned by the qualifying veteran or surviving spouse from personal property tax.

6. PRESERVE ADMINISTRATIVE EFFICIENCY \u2014 Keep the provision allowing 100% P&T-rated veterans to avoid annual reapplication.

7. ALIGN WITH NEIGHBORING STATES \u2014 Illinois offers full exemptions at 70%+ disability with no value cap. These changes bring Missouri in line with neighboring states.

Thank you for your service to Missouri and for considering these improvements.`;

// Track rep data from ZIP lookup
let currentRep = { email: '', name: '', district: '', party: '' };

/**
 * Called externally (from page scripts) when ZIP lookup resolves a rep.
 */
function setRepFromLookup(rep) {
  currentRep = rep || { email: '', name: '', district: '', party: '' };
  const repField = document.getElementById('repEmail');
  const repLabel = document.getElementById('repLabel');
  if (repField) {
    repField.value = currentRep.email || '';
  }
  if (repLabel && currentRep.name && currentRep.name !== 'Vacant') {
    repLabel.textContent = `${currentRep.name} \u2014 District ${currentRep.district}`;
  } else if (repLabel) {
    repLabel.textContent = currentRep.email ? '' : 'Enter your ZIP code above to find your representative';
  }
}

/**
 * Handle revision checkbox — update textarea live.
 */
function setupRevisionCheckbox() {
  const checkbox = document.getElementById('includeRevisions');
  if (!checkbox) return;

  let baseMessage = form.message.value;

  checkbox.addEventListener('change', function () {
    // Capture the current message minus any previously appended revisions
    const current = form.message.value;
    const revIdx = current.indexOf('\n\n---\n\nIn addition to supporting HB2089');
    if (revIdx !== -1) {
      baseMessage = current.substring(0, revIdx);
    } else {
      baseMessage = current;
    }

    if (this.checked) {
      form.message.value = baseMessage + REVISIONS_TEXT;
    } else {
      form.message.value = baseMessage;
    }
  });
}

/**
 * Build email preview data.
 */
function getEmailPreview() {
  const name = form.name.value.trim() || 'Your Name';
  const email = form.email.value.trim() || 'you@email.com';
  const zip = form.zip.value.trim() || '00000';
  const message = form.message.value.trim();
  const repName = currentRep.name || 'Representative';
  const repEmail = currentRep.email || 'rep@house.mo.gov';
  const district = currentRep.district || '?';

  const subject = `HB2089 Support: Message from ${name}, ${zip}`;

  const repBody =
    `Dear ${repName},\n\n` +
    `My name is ${name} and I am a constituent in District ${district} (ZIP: ${zip}).\n\n` +
    message + `\n\n` +
    `Sincerely,\n${name}\n${email}\n\n` +
    `---\nSent via MoVets.org \u2014 Non-partisan veteran advocacy for HB2089`;

  return {
    toRep: { from: `noreply@movets.org (Reply-To: ${email})`, to: repEmail, subject, body: repBody },
  };
}

/**
 * Get the current message type ID.
 *   1 = Base support message
 *   2 = Support message + proposed revisions
 */
function getMessageType() {
  const cb = document.getElementById('includeRevisions');
  return (cb && cb.checked) ? 2 : 1;
}

// Setup revision checkbox on load
setupRevisionCheckbox();

// Form submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = '';
  status.style.color = '';

  if (form.website && form.website.value) return;

  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const zip = form.zip.value.trim();
  const message = form.message.value.trim();
  const repEmail = currentRep.email || '';

  if (!name || !email || !zip || !message) {
    status.textContent = 'Please fill in all fields.';
    status.style.color = '#DC1E35';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    status.textContent = 'Please enter a valid email address.';
    status.style.color = '#DC1E35';
    return;
  }
  if (!/^\d{5}$/.test(zip)) {
    status.textContent = 'Please enter a valid 5-digit Missouri ZIP code.';
    status.style.color = '#DC1E35';
    return;
  }
  if (!repEmail) {
    status.textContent = 'Please enter your ZIP code to find your representative first.';
    status.style.color = '#DC1E35';
    return;
  }

  // Get Turnstile token
  const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value;
  if (!turnstileToken) {
    status.textContent = 'Please complete the CAPTCHA verification.';
    status.style.color = '#DC1E35';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email, zip, message,
        repEmail: currentRep.email,
        repName: currentRep.name,
        district: String(currentRep.district),
        messageType: getMessageType(),
        turnstileToken,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      status.textContent = 'Message sent successfully! Thank you for supporting HB2089.';
      status.style.color = '#16a34a';
      form.reset();
      form.message.value = DEFAULT_MESSAGE;
      currentRep = { email: '', name: '', district: '', party: '' };
      const repField = document.getElementById('repEmail');
      const repLabel = document.getElementById('repLabel');
      if (repField) repField.value = '';
      if (repLabel) repLabel.textContent = 'Enter your ZIP code above to find your representative';
      if (typeof turnstile !== 'undefined') turnstile.reset();
    } else {
      status.textContent = data.error || 'Failed to send. Please try again later.';
      status.style.color = '#DC1E35';
    }
  } catch (err) {
    status.textContent = 'Error sending message. Please try again later.';
    status.style.color = '#DC1E35';
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Message';
  }
});

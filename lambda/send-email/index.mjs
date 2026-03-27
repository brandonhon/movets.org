import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(ddbClient);

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@movets.org';
const LOG_TABLE = process.env.LOG_TABLE || 'movets-email-log';
const RATE_LIMIT_SECONDS = 300;

/**
 * Message type IDs:
 *   1 = Support message (base HB2089 support, no revisions)
 *   2 = Support message + proposed revisions
 */

const recentSenders = new Map();

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, 5000);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidZip(zip) {
  return /^\d{5}$/.test(zip);
}

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://movets.org',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, email, zip, message, repEmail, repName, district, messageType, website } = body;

    // Honeypot
    if (website) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (!name || !email || !zip || !message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'All fields are required.' }) };
    }
    if (!isValidEmail(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email address.' }) };
    }
    if (!isValidZip(zip)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid ZIP code.' }) };
    }
    if (!repEmail || !isValidEmail(repEmail)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Representative email is required.' }) };
    }

    // Rate limit
    const ip = event.requestContext?.http?.sourceIp || 'unknown';
    const lastSent = recentSenders.get(ip);
    const now = Date.now();
    if (lastSent && now - lastSent < RATE_LIMIT_SECONDS * 1000) {
      return { statusCode: 429, headers, body: JSON.stringify({ error: 'Please wait a few minutes before sending another message.' }) };
    }

    const cleanName = sanitize(name);
    const cleanMessage = sanitize(message);
    const cleanZip = sanitize(zip);
    const cleanRepName = sanitize(repName || '');
    const cleanDistrict = sanitize(district || '');
    const msgType = messageType === 2 ? 2 : 1;

    const subject = `HB2089 Support: Message from ${cleanName}, ${cleanZip}`;

    const repBody = [
      `Dear ${cleanRepName || 'Representative'},`,
      ``,
      `My name is ${cleanName} and I am a constituent in ${cleanDistrict ? 'District ' + cleanDistrict : 'your district'} (ZIP: ${cleanZip}).`,
      ``,
      cleanMessage,
      ``,
      `Sincerely,`,
      `${cleanName}`,
      `${email}`,
      ``,
      `---`,
      `Sent via MoVets.org — Non-partisan veteran advocacy for HB2089`,
    ].join('\n');

    // Send to representative
    await ses.send(new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [repEmail] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: repBody } },
      },
      ReplyToAddresses: [email],
    }));

    // Log to DynamoDB
    const timestamp = new Date().toISOString();
    await ddb.send(new PutCommand({
      TableName: LOG_TABLE,
      Item: {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp,
        sender_name: cleanName,
        sender_email: email,
        sender_zip: cleanZip,
        rep_email: repEmail,
        rep_name: cleanRepName,
        district: cleanDistrict,
        message_type: msgType,
      },
    }));

    recentSenders.set(ip, now);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Message sent successfully.' }),
    };
  } catch (err) {
    console.error('Send email error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send message. Please try again later.' }),
    };
  }
}

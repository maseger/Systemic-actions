'use strict';

// POST /api/reseller  { name, org, type, country, email, qty, message, consent, lang, website }
// Sends the enquiry as one email to Mattias (reply-to = the enquirer).
// Nothing is stored by the site itself; the only copy is that email.

const { FROM, EMAIL_RE, resend, esc } = require('./_lib/shared');

const TO = 'mattias@systemicactions.com';
const TYPES = {
  bookshop: 'Bookshop',
  online: 'Online retailer',
  library: 'Library',
  distributor: 'Distributor or wholesaler',
  training: 'Training or course provider',
  other: 'Other'
};

const ORIGINS = ['https://systemicactions.com', 'https://www.systemicactions.com'];
const MAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const oneLine = (v, max) => clean(v, max).replace(/[\r\n]+/g, ' ');

function safeJson(s) { try { return JSON.parse(s); } catch (e) { return {}; } }

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  const b = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const origin = req.headers && req.headers.origin;
  if (origin && !ORIGINS.includes(origin) && !/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) && !/^http:\/\/localhost(:\d+)?$/.test(origin)) return res.status(403).json({ ok: false });
  if (b.website) return res.status(200).json({ ok: true }); // honeypot
  const age = Date.now() - Number(b.t);
  if (!(age >= 3000)) return res.status(400).json({ ok: false, error: 'too_fast' }); // sent less than 3 s after page load, or no timestamp

  const name = oneLine(b.name, 120);
  const org = oneLine(b.org, 160);
  const country = oneLine(b.country, 80);
  const qty = oneLine(b.qty, 120);
  const email = oneLine(b.email, 254).toLowerCase();
  const message = clean(b.message, 2000);
  const type = Object.prototype.hasOwnProperty.call(TYPES, b.type) ? b.type : '';
  const lang = b.lang === 'sv' ? 'sv' : 'en';

  if (!name || !org || !country || !type) return res.status(400).json({ ok: false, error: 'missing_fields' });
  if (!MAIL_RE.test(email) || !EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'invalid_email' });
  if ((message.match(/https?:\/\//gi) || []).length > 3) return res.status(400).json({ ok: false, error: 'too_many_links' });

  const rows = [
    ['Name', name], ['Organisation', org], ['Type', TYPES[type]], ['Country', country],
    ['Email', email], ['Expected quantity', qty || '–'], ['Language on page', lang.toUpperCase()]
  ];
  const html = '<div style="font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#1B2320">' +
    '<p><strong>Reseller enquiry from systemicactions.com/resellers</strong></p>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
    rows.map((r) => '<tr><td style="padding:3px 18px 3px 0;color:#4E5853">' + esc(r[0]) + '</td><td style="padding:3px 0">' + esc(r[1]) + '</td></tr>').join('') +
    '</table>' +
    '<p style="margin-top:18px;color:#4E5853">Message</p><p style="white-space:pre-wrap;margin-top:0">' + esc(message || '–') + '</p>' +
    '<p style="color:#4E5853;font-size:13px">The sender\'s address is not verified. Reply to this email to answer.</p></div>';
  const text = rows.map((r) => r[0] + ': ' + r[1]).join('\n') + '\n\nMessage:\n' + (message || '–') +
    '\n\nThe sender\'s address is not verified. Reply to this email to answer.';

  try {
    const r = await resend('POST', '/emails', {
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: 'Reseller enquiry: ' + org + ' (' + country + ')',
      html, text
    });
    if (!r.ok) { console.error('reseller mail failed', r.status, r.data); return res.status(502).json({ ok: false }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false });
  }
};

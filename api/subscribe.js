'use strict';

// POST /api/subscribe  { email, key, website }
// Sends a bilingual confirmation email (double opt-in). Nothing is stored
// until the reader clicks the link, which goes to /api/confirm.

const { FROM, SITE, FREEBIES, EMAIL_RE, makeToken, resend, esc } = require('./_lib/shared');

const COPY = {
  en: {
    subject: (t) => 'Confirm your email to get ' + t,
    pre: 'One click, and the download is on its way.',
    hi: 'Hi,',
    body: (t) => 'Click the button below to confirm your email address, and I will send you ' + esc(t) + ' straight away.',
    button: 'Confirm my email',
    after: 'After that you will also get four short emails over two weeks, and then news when there is something worth saying. You can unsubscribe at any time with one click.',
    ignore: 'If you did not ask for this, just ignore this email. Nothing more will be sent.',
    foot: 'You are receiving this because someone entered this address at systemicactions.com.'
  },
  sv: {
    subject: (t) => 'Bekräfta din e-post för att få ' + t,
    pre: 'Ett klick, så är materialet på väg.',
    hi: 'Hej,',
    body: (t) => 'Klicka på knappen nedan för att bekräfta din e-postadress, så skickar jag ' + esc(t) + ' direkt.',
    button: 'Bekräfta min e-post',
    after: 'Efter det får du också fyra korta mejl under två veckor, och sedan nyheter när det finns något som är värt att säga. Du kan avsluta prenumerationen när du vill med ett klick.',
    ignore: 'Om du inte har bett om det här kan du bortse från mejlet. Inget mer skickas.',
    foot: 'Du får det här mejlet för att någon angav den här adressen på systemicactions.com.'
  }
};

function html(c, title, link, lang) {
  return '<!doctype html><html lang="' + lang + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#F1EDE4">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#F1EDE4">' + esc(c.pre) + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1EDE4"><tr><td align="center" style="padding:28px 14px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #C9C2B2;border-radius:6px">' +
    '<tr><td bgcolor="#183229" style="background:#183229;padding:18px 32px;border-radius:6px 6px 0 0;font-family:Menlo,Consolas,monospace;font-size:12px;letter-spacing:.3em;color:#E0A57A">SYSTEMIC ACTIONS</td></tr>' +
    '<tr><td style="padding:32px 32px 14px;font-family:Georgia,\'Times New Roman\',serif;font-size:17px;line-height:1.6;color:#1B2320">' +
    '<p style="margin:0 0 18px">' + c.hi + '</p>' +
    '<p style="margin:0 0 18px">' + c.body(title) + '</p>' +
    '<p style="margin:26px 0"><a href="' + esc(link) + '" style="display:inline-block;background:#A65A2E;color:#ffffff;text-decoration:none;font-family:Menlo,Consolas,monospace;font-size:14px;letter-spacing:.04em;padding:13px 22px;border-radius:999px">' + c.button + '</a></p>' +
    '<p style="margin:0 0 18px">' + c.after + '</p>' +
    '<p style="margin:0 0 18px;color:#4E5853;font-size:15px">' + c.ignore + '</p>' +
    '<p style="margin:0 0 18px">Mattias</p>' +
    '</td></tr></table>' +
    '<p style="max-width:600px;font-family:Georgia,serif;font-size:12px;line-height:1.5;color:#4E5853;margin:18px auto 0">' + c.foot + '<br><a href="' + SITE + '" style="color:#4E5853">systemicactions.com</a></p>' +
    '</td></tr></table></body></html>';
}

function text(c, title, link) {
  return [c.hi, '', c.body(title).replace(/&amp;/g, '&'), '', link, '', c.after, '', c.ignore, '', 'Mattias'].join('\n');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();
  const key = String(body.key || '');
  if (body.website) return res.status(200).json({ ok: true }); // honeypot
  if (!EMAIL_RE.test(email) || email.length > 254) return res.status(400).json({ ok: false, error: 'invalid_email' });
  const f = FREEBIES[key];
  if (!f) return res.status(400).json({ ok: false, error: 'invalid_key' });

  const c = COPY[f.lang];
  const link = SITE + '/api/confirm?t=' + encodeURIComponent(makeToken(email, key));
  try {
    const r = await resend('POST', '/emails', {
      from: FROM,
      to: [email],
      reply_to: 'mattias@systemicactions.com',
      subject: c.subject(f.title),
      html: html(c, f.title, link, f.lang),
      text: text(c, f.title, link)
    });
    if (!r.ok) { console.error('confirm email failed', r.status, r.data); return res.status(502).json({ ok: false }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false });
  }
};

function safeJson(s) { try { return JSON.parse(s); } catch (e) { return {}; } }

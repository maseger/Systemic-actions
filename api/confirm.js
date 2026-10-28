'use strict';

// GET /api/confirm?t=<token>
// Adds (or re-subscribes) the contact in Resend, puts it in the language
// segment and fires the events that start the automations:
//   sa.freebie.confirmed      -> delivery email for the chosen resource
//   sa.subscriber.new.<lang>  -> welcome series (first confirmation only)
// Then shows a short thank-you page with the PDF link.

const { SITE, SEGMENTS, FREEBIES, readToken, resend, esc } = require('./_lib/shared');

const COPY = {
  en: {
    title: 'Thank you – your address is confirmed',
    lead: (t) => 'The email with ' + esc(t) + ' is on its way. You can also open it right away:',
    open: 'Open the PDF',
    back: 'Back to systemicactions.com',
    expiredH: 'The link has expired',
    errorH: 'Something went wrong',
    expired: 'This confirmation link has expired. Please sign up again on the site and I will send a new one.',
    error: 'Something went wrong on my side. Please try the link again in a minute.'
  },
  sv: {
    title: 'Tack – din adress är bekräftad',
    lead: (t) => 'Mejlet med ' + esc(t) + ' är på väg. Du kan också öppna materialet direkt:',
    open: 'Öppna pdf:en',
    back: 'Tillbaka till systemicactions.com',
    expiredH: 'Länken har gått ut',
    errorH: 'Något gick fel',
    expired: 'Länken har gått ut. Anmäl dig gärna igen på webbplatsen, så skickar jag en ny.',
    error: 'Något gick fel hos mig. Prova länken igen om en liten stund.'
  }
};

function page(lang, heading, para, link, c) {
  return '<!doctype html><html lang="' + lang + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>Systemic Actions</title><link rel="icon" href="/assets/img/apple-touch-icon.png">' +
    '<style>body{margin:0;background:#F1EDE4;color:#1B2320;font:19px/1.6 Newsreader,Georgia,serif;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}' +
    '@font-face{font-family:Newsreader;src:url(/assets/fonts/newsreader-latin-400-normal.woff2) format("woff2")}' +
    'main{max-width:560px;background:#fff;border:1px solid #C9C2B2;border-radius:6px;overflow:hidden}' +
    'header{background:#183229;color:#E0A57A;font:12px Menlo,Consolas,monospace;letter-spacing:.3em;padding:18px 32px}' +
    'section{padding:28px 32px 32px}h1{font-weight:400;font-size:30px;line-height:1.15;margin:0 0 14px}p{margin:0 0 18px}' +
    'a.btn{display:inline-block;background:#A65A2E;color:#fff;text-decoration:none;font:14px Menlo,Consolas,monospace;letter-spacing:.04em;padding:13px 22px;border-radius:999px}' +
    'a.back{color:#2E5548;font-size:16px}</style></head><body><main><header>SYSTEMIC ACTIONS</header><section>' +
    '<h1>' + heading + '</h1><p>' + para + '</p>' +
    (link ? '<p><a class="btn" href="' + esc(link) + '" target="_blank" rel="noopener">' + c.open + '</a></p>' : '') +
    '<p><a class="back" href="' + SITE + '/?lang=' + lang + '">' + c.back + '</a></p>' +
    '</section></main></body></html>';
}

function send(res, status, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(html);
}

module.exports = async (req, res) => {
  let tok;
  try { tok = readToken(req.query && req.query.t); } catch (e) { tok = null; }
  if (!tok) return send(res, 400, page('en', 'Invalid link', 'This link is not valid. / Länken är inte giltig.', null, COPY.en));

  const f = FREEBIES[tok.key];
  const lang = f.lang;
  const c = COPY[lang];
  if (tok.expired) return send(res, 410, page(lang, c.expiredH, c.expired, null, c));

  const email = tok.email;
  try {
    const found = await resend('GET', '/contacts/' + encodeURIComponent(email));
    let isNew = false;
    if (found.ok && found.data && found.data.id) {
      if (found.data.unsubscribed) await resend('PATCH', '/contacts/' + encodeURIComponent(email), { unsubscribed: false });
      await resend('POST', '/contacts/' + encodeURIComponent(email) + '/segments/' + SEGMENTS[lang]);
    } else {
      const created = await resend('POST', '/contacts', { email, unsubscribed: false, segments: [{ id: SEGMENTS[lang] }] });
      if (!created.ok) throw new Error('create contact failed ' + created.status + ' ' + JSON.stringify(created.data));
      isNew = true;
    }

    const ev = await resend('POST', '/events/send', { event: 'sa.freebie.confirmed', email, payload: { key: tok.key, lang } });
    if (!ev.ok) console.error('freebie event failed', ev.status, ev.data);
    if (isNew) {
      const w = await resend('POST', '/events/send', { event: 'sa.subscriber.new.' + lang, email });
      if (!w.ok) console.error('welcome event failed', w.status, w.data);
    }
    return send(res, 200, page(lang, c.title, c.lead(f.title), f.file, c));
  } catch (e) {
    console.error(e);
    return send(res, 500, page(lang, c.errorH, c.error, f.file, c));
  }
};

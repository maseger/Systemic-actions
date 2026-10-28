'use strict';

// Shared pieces for the sign-up flow on systemicactions.com.
// Sign-up is double opt-in: /api/subscribe sends a confirmation email,
// /api/confirm adds the contact in Resend and fires the events that start
// the delivery and welcome automations.

const crypto = require('crypto');

const API = 'https://api.resend.com';
const FROM = 'Mattias Seger <mattias@systemicactions.com>';
const SITE = 'https://systemicactions.com';
const TOKEN_DAYS = 7;

const SEGMENTS = {
  en: '1ad647d0-76bd-4df0-95cb-161618cc27ee', // SA · Lista · EN
  sv: 'f6f8a204-7224-4ce3-8367-1640c90232a0'  // SA · Lista · SV
};

const drive = (id) => 'https://drive.google.com/file/d/' + id + '/view';

// Keys match the conditions in the Resend automation "SA · Leverans av gratismaterial".
const FREEBIES = {
  F1_EN: { lang: 'en', title: 'Seven Questions Before Any Change Initiative', file: drive('1ifKPqPQ6WI6BqLtYrbivazYWiNfPfr13') },
  F2_EN: { lang: 'en', title: 'the Systems Map Canvas', file: drive('1NXSgR92SkTWwV9Fe0Q_PPQS88vrm73Hi') },
  F3_EN: { lang: 'en', title: 'Complicated or Complex?', file: drive('12AuNYR-MczBAMndwZjHbbEoe_7BsVhJC') },
  F4_EN: { lang: 'en', title: 'the Introduction to Volume I', file: drive('14rTLcR1sHDlBa8iu8BV5gn0USpAk5mtC') },
  F1_SV: { lang: 'sv', title: 'Sju frågor före varje förändringsinitiativ', file: drive('1xtvTsxO56sAU0Gij9GWRobXiN1vz2Vo_') },
  F2_SV: { lang: 'sv', title: 'Systemkartan', file: drive('1VyqGlMV7EEt9yrD-KlKWTHB1Y3NmMNcO') },
  F3_SV: { lang: 'sv', title: 'Komplicerat eller komplext?', file: drive('1-4k0-5PdddGJXudctKigwuEpKmbU7sOy') },
  F4_SV: { lang: 'sv', title: 'Inledningen ur Band I', file: drive('1NU5qKoh2hF16zODaT0_dMGRgefqevIeq') },
  F5_SV: { lang: 'sv', title: 'Fältguiden – fem verktyg att börja med', file: drive('1Dpe7z6mIrQSjUoJYYhqJwkOGktuTs6pF') }
};

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

function apiKey() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return key;
}

// The token secret is derived from the API key, so no extra secret is needed.
function secret() {
  return crypto.createHmac('sha256', apiKey()).update('sa-confirm-v1').digest();
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');

function makeToken(email, key) {
  const payload = b64u(JSON.stringify({ e: email, k: key, t: Date.now() }));
  const sig = b64u(crypto.createHmac('sha256', secret()).update(payload).digest());
  return payload + '.' + sig;
}

function readToken(token) {
  if (typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const [payload, sig] = token.split('.');
  const expected = b64u(crypto.createHmac('sha256', secret()).update(payload).digest());
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!data || !EMAIL_RE.test(data.e) || !FREEBIES[data.k]) return null;
  if (Date.now() - data.t > TOKEN_DAYS * 864e5) return { expired: true, key: data.k };
  return { email: data.e, key: data.k };
}

async function resend(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: 'Bearer ' + apiKey(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body */ }
  return { status: res.status, ok: res.ok, data };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = { FROM, SITE, SEGMENTS, FREEBIES, EMAIL_RE, makeToken, readToken, resend, esc };

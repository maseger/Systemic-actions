(function () {
  'use strict';

  // MailerLite account and the embedded form for each free resource.
  // Each form adds the subscriber to the series list and to the resource's group,
  // which triggers the delivery and welcome emails.
  var ML_ACCOUNT = '2744782';
  var drive = function (id) { return 'https://drive.google.com/file/d/' + id + '/view'; };

  var FREEBIES = {
    en: [
      { form: '202428989073000039', file: drive('14rTLcR1sHDlBa8iu8BV5gn0USpAk5mtC'), tag: 'Free sample',
        title: 'The Introduction to Volume I',
        text: 'What complexity and systems thinking are, why they matter to every leader, and what they mean on an ordinary Monday.' },
      { form: '202428973178685208', file: drive('1ifKPqPQ6WI6BqLtYrbivazYWiNfPfr13'), tag: 'One page',
        title: 'Seven Questions Before Any Change Initiative',
        text: 'Most change efforts are decided before the first workshop – by the setup, not the content. The seven questions I ask first.' },
      { form: '202428987704608260', file: drive('12AuNYR-MczBAMndwZjHbbEoe_7BsVhJC'), tag: 'Self-check',
        title: 'Complicated or Complex?',
        text: 'A ten-minute self-check for telling a recipe from a rocket from raising a child – and choosing how to lead accordingly.' },
      { form: '202428986468336740', file: drive('1NXSgR92SkTWwV9Fe0Q_PPQS88vrm73Hi'), tag: 'Canvas',
        title: 'Systems Map Canvas',
        text: 'A canvas for drawing the loop you keep getting caught in: what drives it, what slows it and where to intervene.' }
    ],
    sv: [
      { form: '202428989750380213', file: drive('1NU5qKoh2hF16zODaT0_dMGRgefqevIeq'), tag: 'Provläsning',
        title: 'Inledningen ur Band I',
        text: 'Vad komplexitet och systemtänkande är, varför det angår varje ledare och vad det betyder en vanlig måndag.' },
      { form: '202428985738528712', file: drive('1xtvTsxO56sAU0Gij9GWRobXiN1vz2Vo_'), tag: 'En sida',
        title: 'Sju frågor före varje förändringsinitiativ',
        text: 'De flesta förändringar avgörs före första workshopen – av upplägget, inte innehållet. De sju frågor jag ställer först.' },
      { form: '202428988388279872', file: drive('1-4k0-5PdddGJXudctKigwuEpKmbU7sOy'), tag: 'Självtest',
        title: 'Komplicerat eller komplext?',
        text: 'Ett självtest på tio minuter: recept, raket eller barn – och hur du väljer att leda därefter.' },
      { form: '202428987098531184', file: drive('1VyqGlMV7EEt9yrD-KlKWTHB1Y3NmMNcO'), tag: 'Arbetsyta',
        title: 'Systemkartan',
        text: 'En arbetsyta för att rita slingan ni fastnar i: vad som driver den, vad som bromsar och var ni kan gripa in.' },
      { form: '202428990443489279', file: drive('1Dpe7z6mIrQSjUoJYYhqJwkOGktuTs6pF'), tag: 'Fältguiden',
        title: 'Fem verktyg att börja med',
        text: 'Fem verktyg ur Fältguiden med steg, tips och arbetsmall – att använda i nästa möte.' }
    ]
  };

  var UI = {
    en: { placeholder: 'Your email', send: 'Send it to me', sending: 'Sending…',
          ok: 'Thank you! Check your inbox and confirm your address. You can also open it right away: ',
          fail: 'The sign-up didn’t go through just now, but here it is anyway: ',
          open: 'open the PDF', invalid: 'Please enter a valid email address.' },
    sv: { placeholder: 'Din e-post', send: 'Skicka till mig', sending: 'Skickar…',
          ok: 'Tack! Titta i inkorgen och bekräfta din adress. Du kan också öppna det direkt: ',
          fail: 'Anmälan gick inte igenom just nu, men här är materialet ändå: ',
          open: 'öppna pdf:en', invalid: 'Skriv en giltig e-postadress.' }
  };

  var root = document.documentElement;
  var grid = document.getElementById('free-grid');

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function message(box, lead, href, label) {
    box.textContent = lead;
    var a = el('a', { href: href, target: '_blank', rel: 'noopener' }, label);
    box.appendChild(a);
  }

  function renderFreebies(lang) {
    var t = UI[lang];
    grid.textContent = '';
    grid.classList.toggle('odd', FREEBIES[lang].length % 2 === 1);
    FREEBIES[lang].forEach(function (f, i) {
      var card = el('article', { 'class': 'freebie' });
      card.appendChild(el('p', { 'class': 'tag' }, f.tag));
      card.appendChild(el('h3', null, f.title));
      card.appendChild(el('p', null, f.text));

      var form = el('form', { novalidate: '' });
      var id = 'email-' + lang + '-' + i;
      var label = el('label', { 'for': id, 'class': 'hp' }, t.placeholder);
      var input = el('input', { type: 'email', id: id, name: 'fields[email]', placeholder: t.placeholder, autocomplete: 'email', required: '' });
      var trap = el('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'class': 'hp', 'aria-hidden': 'true' });
      var btn = el('button', { type: 'submit', 'class': 'btn btn-primary' }, t.send);
      var msg = el('p', { 'class': 'msg', role: 'status', 'aria-live': 'polite' });
      form.appendChild(label); form.appendChild(input); form.appendChild(trap); form.appendChild(btn);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (trap.value) return; // bot
        var email = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = t.invalid; input.focus(); return; }
        btn.disabled = true; btn.textContent = t.sending;
        var body = new FormData();
        body.append('fields[email]', email);
        body.append('ml-submit', '1');
        body.append('anticsrf', 'true');
        fetch('https://assets.mailerlite.com/jsonp/' + ML_ACCOUNT + '/forms/' + f.form + '/subscribe', { method: 'POST', body: body })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
          .then(function (d) {
            if (d && d.success === false) throw new Error('rejected');
            form.remove();
            message(msg, t.ok, f.file, t.open);
          })
          .catch(function () {
            btn.disabled = false; btn.textContent = t.send;
            message(msg, t.fail, f.file, t.open);
          });
      });

      card.appendChild(form);
      card.appendChild(msg);
      grid.appendChild(card);
    });
  }

  function setLang(lang, save) {
    root.setAttribute('data-lang', lang);
    root.lang = lang;
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === lang));
    });
    renderFreebies(lang);
    if (save) { try { localStorage.setItem('sa-lang', lang); } catch (e) {} }
  }

  document.querySelectorAll('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang'), true); });
  });

  setLang(root.getAttribute('data-lang') === 'sv' ? 'sv' : 'en', false);
})();

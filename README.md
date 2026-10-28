# systemicactions.com

Home of the book series *Systemic Actions – Systems Thinking for Leaders, From Theory to Mastery* by Mattias Seger.

A static, bilingual (English/Swedish) single page, deployed on Vercel.

- `index.html` – the page. Text in both languages sits side by side as `lang="en"` / `lang="sv"` elements; CSS shows the active one.
- `assets/site.js` – language switch (`?lang=sv`, saved choice, or browser language) and the free-resource cards. Each card posts to `/api/subscribe` and then links straight to the PDF on Drive.
- `assets/site.css` – styles. Colours and type follow the design system *Mattias Seger · Ledarskapsböcker* (lb- tokens: paper, forest, copper; Newsreader and IBM Plex Mono, self-hosted). It is separate from Luminus Böcker and Vreta.

No build step. Preview locally with `python3 -m http.server`.

## Sign-up (Resend)

Double opt-in through Resend (EU region, domain systemicactions.com).

- `api/subscribe.js` – checks the address and sends a bilingual confirmation email with a signed link.
- `api/confirm.js` – verifies the link, adds the contact to the segment *SA · Lista · EN/SV* and fires two events: `sa.freebie.confirmed` (payload `key`, `lang`) starts the automation *SA · Leverans av gratismaterial*; `sa.subscriber.new.en|sv` starts *SA · Välkomstserie · EN/SV* the first time an address confirms.
- `api/_lib/shared.js` – resource keys (F1_EN … F5_SV), segment ids, token signing.

Needs one environment variable in Vercel: `RESEND_API_KEY` (sending + contacts). The confirmation tokens are signed with a key derived from it.

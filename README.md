# systemicactions.com

Home of the book series *Systemic Actions – Systems Thinking for Leaders, From Theory to Mastery* by Mattias Seger.

A static, bilingual (English/Swedish) single page, deployed on Vercel.

- `index.html` – the page. Text in both languages sits side by side as `lang="en"` / `lang="sv"` elements; CSS shows the active one.
- `assets/site.js` – language switch (`?lang=sv`, saved choice, or browser language) and the free-resource cards. Each card posts to its MailerLite embedded form (account 2744782) and then links straight to the PDF on Drive.
- `assets/site.css` – styles. Colours and type follow the design system *Mattias Seger · Ledarskapsböcker* (lb- tokens: paper, forest, copper; Newsreader and IBM Plex Mono, self-hosted). It is separate from Luminus Böcker and Vreta.

No build step. Preview locally with `python3 -m http.server`.

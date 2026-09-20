# Retour (feedback-widget)

An embeddable feedback button + public roadmap with votes, as a small SaaS. A site owner signs up, creates a
project, and pastes one line on their site:

```html
<script src="https://YOUR-HOST/widget.js" data-key="pk_..." defer></script>
```

Visitors get a floating button (FR / EN / AR with RTL) to send an idea, a bug or a comment, and a Roadmap tab where
they vote. The owner triages an inbox, promotes messages to roadmap items, and has a hosted public roadmap at
`/roadmap/<key>`.

Stack: Next.js 16 + Tailwind 4 + TypeScript strict, SQLite via Node's built-in `node:sqlite` (Node 22.5+, developed
on Node 25): no native modules, no cloud account. The widget itself is dependency-free vanilla JS in `public/widget.js`.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3410
```

Sign up, create a project, copy the snippet into any HTML page (open it from a local server, not `file://`).

## Checks

```bash
npm run typecheck && npm run lint && npm test   # 38 tests: lib, public API route handlers, widget in jsdom
npm run build && npm start                      # then, in another terminal:
npm run smoke                                   # 16 end-to-end HTTP checks against the running server
```

## Security model (read before deploying)

- **Widget rendering is XSS-safe**: all API data is inserted with `textContent`; `innerHTML` is never used with data.
  Covered by a jsdom test that feeds `<img onerror>` / `<script>` payloads. The UI is in a Shadow DOM.
- **Dashboard rendering** is escaped by React; user text never reaches `dangerouslySetInnerHTML`.
- **CORS**: public endpoints (`/api/public/<key>/{roadmap,feedback,vote}`) use no cookies or credentials. Per
  project you can set an allow-list of sites: listed origins are echoed back (with `Vary: Origin`), others get 403. An
  empty list means `*`. Non-browser clients can spoof `Origin`, so this stops other _websites_ from using your key,
  not a determined attacker; the real protections are validation and rate limits.
- **Abuse limits**: 5 feedback posts / 10 min and 40 votes / 10 min per IP+project (in memory, single process).
  Payloads are capped at 10 KB, messages at 2000 chars. Votes are per anonymous voter id kept in localStorage, so
  they are convenience-grade, not fraud-proof.
- Dashboard: scrypt passwords, hashed session tokens, httpOnly SameSite=Lax cookie, every query scoped by owner.
- Rate limiter trusts `x-forwarded-for`: run behind a proxy that sets it.
- Customer sites with a strict CSP must allow `script-src` and `connect-src` for your host.

## Deploy

SQLite needs a persistent disk, so not Vercel serverless. Use a VPS, Fly.io or Railway with a volume:
`npm run build`, `npm start`, set `DATABASE_PATH` (on the volume) and `NEXT_PUBLIC_SITE_URL`, put HTTPS in front
(Caddy/Cloudflare) and back up the SQLite file. Serve `widget.js` from the same host (it derives the API origin from its own `src`).

## Not done yet

Stripe checkout (Pro is a `users.plan` column; UI shows "not configured"), password reset, email notifications to
owners or to voters when an item ships, feedback attachments/screenshots, editing/deleting projects, per-project
data export, pagination of the inbox (shows latest 200).

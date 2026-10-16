# NRK Welding LLC — Website

Node/Express + SQLite site with a free-quote form and a password-protected lead dashboard at `/admin`.

## Structure
- `server.js` – thin entry point
- `routes/quote.js` – `POST /api/quote` (honeypot + rate limit, saves lead, emails alert + customer receipt)
- `routes/admin.js` – `/admin` login, dashboard, lead status/notes API, CSV export
- `lib/auth.js` – signed-cookie admin session (no default password)
- `lib/mailer.js` – Gmail SMTP lead alerts
- `db/index.js` – SQLite (`DB_PATH`)
- `views/` – admin login + dashboard pages
- `public/` – website (index, services, gallery, about, contact, 404), CSS/JS, images
- `public/js/gallery-data.js` – add a gallery photo by dropping it in `public/images` and adding one line

## Deploy on Render (same as MPS207)
1. Push to a new GitHub repo, create a Render **Web Service** (Node, build `npm install`, start `npm start`). Node is pinned to 20.x.
2. Add a **Disk** mounted at `/var/data` and set `DB_PATH=/var/data/nrk.db` (otherwise leads are lost on redeploy).
3. Environment variables:
   - `ADMIN_PASSWORD` (8+ chars) and `SESSION_SECRET` (16+ random chars) — admin stays locked until both are set
   - `SITE_URL=https://www.nrkwelding.com`
   - `NOTIFY_EMAIL` — inbox that gets quote alerts
   - `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS` (Gmail app password), `SMTP_FROM`
4. Point the domain: A `@` → 216.24.57.1, CNAME `www` → `<service>.onrender.com`.

## Notes
- Leads are saved before any email is attempted, so a mail problem never loses a lead.
- The homepage Facebook feed uses Facebook's official Page Plugin (iframe). It updates itself when NRK posts.
- `/admin` and `/api/` are blocked in robots.txt.

# Perlahomes Guest Guide

A data-driven guest check-in app, modelled on the menufi-style guides: a welcome screen, a GUIDE menu of categories, and image-led category pages. One template, one JSON file per property.

## How it works

The shell (`index.html`, `styles.css`, `app.js`) never changes. Each property is one file in `data/`. A guest opens:

```
https://YOUR-SITE/index.html?p=villa-aurora
```

…and the app loads `data/villa-aurora.json`. The part after `?p=` is the slug and must match the filename.

## Structure

- **Home** — brand logo over a hero photo, a welcome message with "Read more", then the GUIDE grid of category tiles.
- **Category page** — tap a tile to open it: a serif title and a stack of image cards. The back arrow returns home (the browser back button works too).
- **Persistent** — a bottom bar (driven by `actions`) and a floating WhatsApp button appear on every screen.

## Add a property

1. Copy `data/_template.json` to `data/<slug>.json`.
2. Drop the property's photos into `data/img/` and reference them by path.
3. Fill in the fields; delete sections or cards you don't need. Remove the `_` comment lines.
4. Commit. Share `index.html?p=<slug>`.

## Data model

- **Bilingual:** any text field is a string or `{ "en": "...", "el": "..." }`. The flag picker switches languages; it only appears if `meta.languages` has more than one entry. Supported flags: `en, el, fr, de, it`.
- **Sections** = the GUIDE tiles. `icon` accepts: `arrival, property, neighborhood, beaches, sights, restaurants, activities, transfers, spa, shopping, info`.
- **Cards** (inside a section) support any of: `image`, `title`, `body`, `mapUrl` + `mapLabel` (blue map button), `code` + `codeLabel` (tap-to-copy chip), and `wifi: { network, password }` (two copy chips).
- **actions** = the bottom bar items: `icon` (`checkin`, `massage`, or any section icon), `label`, `url`.
- **contact.whatsapp** and **contact.viber** each add a floating chat button (green WhatsApp, purple Viber); include either or both. `contact.phone` is available for action URLs (`tel:`).

## Images

Demo ships with SVG placeholders in `data/img/`. Replace them with real photos (jpg/png ~1200px wide). Keep filenames or update the paths in the JSON. Card images render at a 16:10 ratio, cropped to fill.

## White-labelling

Brand colours live at the top of `styles.css` under `:root` — change `--accent`, `--accent-dk`, etc. to restyle every guide at once. Fonts are Playfair Display (titles) + Mulish (body), both with Greek glyphs.

## Deploy (GitHub Pages)

```bash
git init && git add . && git commit -m "Guest guide"
git branch -M main
git remote add origin git@github.com:perlahomes/guest-guide.git
git push -u origin main
```

Then **Settings → Pages → deploy from `main` / root**. Live at `https://perlahomes.github.io/guest-guide/index.html?p=<slug>`.

> Loads JSON via `fetch()`, so it won't run from `file://`. Use GitHub Pages or `python3 -m http.server` to preview. Generate a QR code per property pointing at its link for the welcome card or door.

## Offline & install (PWA)

The guide works offline and can be installed to a phone's home screen.

- **`manifest.json`** makes it installable (icon, name, full-screen). Icons are in `icons/`.
- **`service-worker.js`** caches the guide on first visit. After a guest opens the link once with signal, it loads even with no connection — exactly when they arrive at the property.
- Registration is one line in `index.html`; nothing else to do.

How a guest installs it:
- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** the *Install app* / *Add to Home screen* prompt appears automatically.

Updating content: property data (`data/*.json`) uses a *network-first* rule, so edits reach any guest who has signal; offline guests keep the last cached version. If you change the shell files (`index.html`, `styles.css`, `app.js`), bump `CACHE = "perla-v1"` in `service-worker.js` (e.g. to `perla-v2`) so phones pull the new version.

> Service workers require HTTPS — GitHub Pages provides this automatically. They do **not** run from a `file://` path, so the offline feature only works once the guide is hosted (the `mockup.html` preview is unaffected; it bundles everything already).

## Building a property without code (`builder.html`)

`builder.html` is a no-code editor for your team. Open it and:

1. Fill in the property name, languages, contact, and welcome message.
2. Go down the checklist and **switch off anything the property doesn't have** — Pool, Parking, BBQ, etc. Switching a card off removes it; switching a whole category off removes the tile.
3. Expand any card to edit its title/text and **add a photo** (drag/choose a file). Photos are auto-resized and compressed in the browser. Use **+ Add card** for extras or **Delete this card** to remove one.
4. Press **Download ZIP**. You get a bundle containing:
   - `<slug>.json` — the property file, and
   - `data/img/…` — every photo, renamed to match and compressed.
5. Unzip it into the project root (merging into `data/`), commit, and the guide is live at `index.html?p=<slug>`.

Notes:
- It starts pre-filled with the Villa Aurora template so staff edit rather than start blank.
- **Preview** opens the finished guide in a new tab and shows the photos you've added (works when the builder is hosted next to `styles.css`/`app.js`).
- Paste an existing property file into the JSON box and press **Load** to edit it later. (Re-uploading photos isn't needed unless you want to change them.)
- The ZIP writer and image compression are built in — no external libraries, so the builder works offline too.

## Expiring links & the generator (`generator.html`)

Guest links can be made to stop working after checkout, so old bookings lose access.

How it works: a link can carry a checkout date — `index.html?p=villa-aurora&until=2026-07-05`. The guide checks the date each time it opens; through that day it works normally, and after it the guest sees a friendly "This guide is no longer active" screen (which still shows your contact buttons). A plain link with **no** `until` never expires — handy for your own testing.

Making links is done in **`generator.html`** (host it and bookmark it, like the builder):
1. Set your guide's base URL once (it's remembered on the device).
2. Pick the property and the checkout date.
3. Copy the finished link (or download the QR) and send it to the booking.

The property dropdown is filled from **`data/properties.json`** — a small list of `{ "slug", "name" }`. When you add a property, add a line there so it shows up in the generator (or just choose “Other” and type the slug).

Important: because the files are public, a determined guest could edit the date in the URL, so treat expiry as a strong deterrent, not a vault. Pair it with **rotating the door/WiFi code between guests** — then an old link is harmless even if kept. The QR image is produced by a public QR service (the link itself isn't sensitive).

## One-time import from Hosthub (`tools/import-hosthub.js`)

Pulls every rental from your Hosthub account so you don't type them by hand. It writes `data/properties.json` (the generator dropdown) and creates a starter `data/<slug>.json` for each rental. It **never overwrites** a guide you've already edited, so it's safe to re-run when you add rentals in Hosthub.

It does NOT import photos or door codes (Hosthub doesn't expose those here) — you add those in the builder. It does pre-fill the name and stash useful facts (city, coordinates, check-in/out times, max guests) under `meta.hosthub` for reference.

**Run it on your computer (not in the browser):**
1. Install Node.js if you don't have it (nodejs.org, LTS version).
2. Get a **fresh** Hosthub API key: Hosthub → Settings → API. (If you ever shared an old key, regenerate it first.)
3. In a terminal, from the project folder:
   - macOS/Linux: `HOSTHUB_API_KEY=your_new_key node tools/import-hosthub.js`
   - Windows PowerShell: `$env:HOSTHUB_API_KEY="your_new_key"; node tools/import-hosthub.js`
4. Review the new files, then commit & push to GitHub (the upload step you already know).

The key is read from an environment variable so it never gets written into a file or committed. Keep it private.

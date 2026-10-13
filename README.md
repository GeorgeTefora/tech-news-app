# Tech News App

A self-hosted, local-first dashboard for tech news, the "00 – Start Here: Roadmap" learning guides, and tech culture. It runs on your PC and you read it on any device. Nothing goes to the cloud except the fetches of the public articles and feeds themselves.

| Feature | Where |
| --- | --- |
| **F-1** Roadmap ingestion: 10-week plan, tiered reading lists, concept checklists, practice questions with your answers | Today · Roadmap · Guide pages |
| **F-2** Multi-select topic filters and instant search, no reloads; filter state lives in the URL | Library · News · Culture · Search (`/`) |
| **F-3** In-app reader: Readability extraction, YouTube embeds, arXiv/PDF viewer, sandboxed iframe fallback; font size, serif and theme controls | Any link |
| **F-4** Responsive PWA: bottom tabs on mobile, sidebar on desktop, installable, offline reading | Everywhere |
| **F-5** Local SQLite (`data/app.db`, Node's built-in `node:sqlite`) with an offline outbox for changes | Server |

## Quick start

Requires Node 22.13+ (tested on Node 24).

```sh
npm install
npm run build     # build the web app once
npm start         # http://localhost:8787 (also prints LAN addresses)
```

The first start imports `content/` into `data/app.db` and starts polling feeds every 30 minutes.

For development with hot reload, run `npm run dev`. The web app is at http://localhost:5173 and proxies `/api` to the server on :8787.

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run ingest` | Re-import `content/guides/*.md` and `content/feeds.json` (progress is kept) |
| `npm test` | Parser and ingest tests against the real guides |
| `npm run typecheck` | TypeScript checks for server and web |
| `npm run backup` | Snapshot the DB to `backups/app-<timestamp>.db` |

Configuration goes in `.env` (copy `.env.example`): `PORT`, `HOST`, `APP_TOKEN`, `FEED_INTERVAL_MIN`.

## Using it on your phone

Service workers (offline mode and "Install app") only run on **HTTPS or localhost**, so:

- **Recommended: Tailscale.** On the PC, run `tailscale serve --bg 8787`, then open `https://<pc-name>.<tailnet>.ts.net` on your phone and add it to the home screen. Tailnet devices are already authenticated, so `APP_TOKEN` isn't required for them.
- **Plain Wi-Fi** works too (`http://<pc-ip>:8787`), but without offline caching. You'll need to allow Node through Windows Firewall for private networks the first time. Set `APP_TOKEN` in `.env` so other devices on the network must log in.
- Don't port-forward this to the internet. If you use Tailscale **Funnel**, those requests always require `APP_TOKEN`.

## Content

- `content/guides/NN-*.md` are Markdown exports of the Google Drive guides (00–07). To update them, re-export the Doc, overwrite the file, then run `npm run ingest` or use Settings → Re-import. The parser (`server/src/ingest/parseGuide.ts`) recognises:
  - `## Concepts you should be able to explain` → checklist
  - `### Start here` / `### Core` / `### Deep dive` bullets of the form `[**Title**](url) (time): note` → reading items
  - `## Practice…` numbered lists → questions
  - `## Suggested … plan` → plan weeks (guide refs like `(01)` or `guide 07`)
  - guide 06's jokes/slang/stereotypes sections → Culture glossary
  - everything else → rendered as "Cheat sheets"
- `content/feeds.json` lists the RSS feeds, seeded from guide 07's sources. You can add your own with `title`, `url` and `tags`.

Progress is keyed by stable hashes (guide + URL, or term text), so editing a guide's wording only resets progress for the lines you changed.

## Architecture

```
content/          guides (Markdown) + feeds.json, committed
server/           Fastify + node:sqlite (TypeScript via tsx)
  src/ingest/     guide parser, DB loader, RSS poller
  src/reader.ts   SSRF-guarded fetch → Readability → DOMPurify, cached in SQLite
  src/routes/     REST API
web/              Vite + React + vite-plugin-pwa
data/app.db       your state (gitignored; back it up with `npm run backup`)
```

The reader proxy only fetches public `http(s)` addresses. Every redirect hop is re-checked, private, loopback and link-local ranges are blocked, responses are capped at 8 MB, and the HTML is sanitized before it's served.

## Known limitations

- YouTube channel RSS (the Fireship feed) currently returns 404 from YouTube. It's left enabled, its error shows in Settings, and it will start working if YouTube restores the endpoint.
- Some sites (heavy JS apps, comics like howdns.works) can't be cleanly extracted and also block embedding. The reader then offers "Open original".
- Paywalled newsletters only show their free preview text.

# radstrat (formerly csgg): project notes for Claude

Read this first. It sums up what was built and decided in the earlier sessions, so you can carry on without
asking the owner to repeat themselves.

## The owner

- Not a developer. Runs the app on Windows with `start.bat` and gets new versions with `update.bat`.
- Writes in Swedish or English: answer in the language they use. Keep explanations plain and short.
- Likes to see results: after visible changes, describe what changed and, where possible, show it.
- Ask before anything hard to undo (deleting, overwriting, pushing to `main`, deploying).

## What radstrat is

A free, browser-based **CS2 strat planner / tactics board** (like ValoPlant, but for Counter-Strike 2) for players,
IGLs, teams, coaches and esports. Plan executes on a 2D map phase by phase, play it back, share it in one link.
No account needed: strats live in the browser and travel in share links; optional Steam sign-in also saves them to the account (see Accounts).

The repo is `ariyakongkam/csrecap`; this app lives on branch `claude/hopeful-edison-tja98v`. The old CSRecap app
(FACEIT player reports) is still on `main` and was deliberately removed from this branch.

## Run and check

```bash
npm install
npm run dev      # http://localhost:3000 (start.bat does install + dev + opens the browser)
npm test         # vitest, src/lib/strat/strat.test.ts
npm run typecheck
npm run lint
npm run build
```

Before saying something works: type check, lint, tests and build must pass, and look at the page in a browser.

## Pages

- `/`: landing page (SEO/GEO/AEO). Keep it **simple**: sticky header with section links, hero ("Plan the round. Win the
  round." + a live example strat on a tilted card that flattens on scroll, cat peeking over it, pause button), 3 features,
  who it's for, AI Analyze (coming soon), FAQ, closing call to action. Motion (`src/components/landing/*`, globals.css):
  smooth scroll, scroll progress bar, sections rise in (`Reveal`, only when `.js` is on <html>), hover lifts on buttons
  and cards, sliding link underlines. All of it is off with reduced motion. The hero example is `DEMO_STRAT`
  (`src/lib/strat/demo.ts`): fixed ids, routes found by A* pathfinding over `mirage-sight.png` with ~10 units
  clearance and checked to never cross a wall or crate (the old hand-made template walked through walls).
- **Footer** (`src/components/site-footer.tsx`, on `/`, `/app` and `/view`): logo, tagline, Ko-fi button, links,
  maps, privacy line, Valve credit. **Ko-fi:** https://ko-fi.com/meowbuh (`KOFI_URL` in `src/lib/links.ts`), a plain
  link in Ko-fi coral (`.btn-kofi`), never Ko-fi's widget script (privacy promise). Also in the FAQ.
- `/app`: start a strat (map cards with blurred screenshots, side) and the list of saved strats. First visit shows
  a welcome popup (`src/components/welcome.tsx`), reopened with the ? button.
- **Playbooks, search, backups** (Nov 2026): a strat has optional `playbook` (folder name, max 40) and `type`
  (`STRAT_TYPES`: default, execute, split, retake, setup, anti-eco, pistol), set in the strat panel (playbook field
  suggests existing names). `/app` groups strats by playbook (A–Z, "Not in a playbook" last) with search and
  map/side/type/playbook filters (`library.tsx`, `strat-card.tsx`). "Share playbook" (`playbook-tools.tsx`) gives a
  `/playbook#…` link (`playbook-view.tsx`: view each strat, "Save all to my strats") or a file. "Save backup" downloads
  all strats as JSON; "Open file" imports a backup or playbook file (`import-dialog.tsx`). One format and merge for all
  of them (`src/lib/strat/bundle.ts`): new strats added, changed ones updated with the old version kept via
  `backupCopy` (which drops the playbook, so it is not re-shared), identical ones skipped. Links over ~2000 chars may
  be cut by Discord: the dialog then points to the file.
- **Real spawns** (`src/lib/maps/spawns.ts`): every competitive CS2 spawn for Mirage, Dust II, Inferno, Nuke, Ancient
  and Anubis, from setpos.gg (CC BY 4.0, credit "Spawn data by setpos.gg" in the footer and map picker), converted with
  each radar's pos_x/pos_y/scale and checked to land in the spawn zones. "Place all five at spawn" uses five spread
  spawns (`fiveSpawns`); Train and Overpass fall back to the old spread. With "Callouts" on, every spawn shows as a
  numbered dot; a dragged player dropped within 12 units of a spawn of its team snaps onto it.
- `/edit?id=…`: the planner. `/view#…`: read-only shared strat (whole strat compressed in the URL fragment).
- `/join#…`: an edit invite (`inviteUrl`, same strat id). New strat: saved and opened (`/edit?id=…&from=invite`).
  Already have it: choose "Update mine with their changes" (old version kept via `backupCopy`), "Keep both" or
  ignore. Same content: opens yours. The editor's "Invite" button (`invite.tsx`) offers "Can view" and "Can edit" links.
  Not live: no server. Real-time co-editing would need hosting, accounts and a database.

## Accounts: Steam sign-in and cloud saves (built Nov 2026, switched on once the D1 database exists)

- Chosen over Google for GDPR data minimisation: Steam OpenID gives only the SteamID64 (no email, no name).
- **Server:** `worker/index.ts` (Cloudflare Worker; `wrangler.jsonc` → `main`, `run_worker_first: ["/api/*"]`, all
  other paths are the static `out/`). Routes: `GET /api/me`, `GET /api/auth/steam` → Steam, `GET
  /api/auth/steam/callback`, `POST /api/auth/logout`, `GET /api/strats` (strats + deletion markers), `PUT|DELETE
  /api/strats/:id`, `GET /api/account/export`, `DELETE /api/account`. Without the `DB` binding everything answers
  `{enabled:false}` and the UI hides sign-in. Tables are created on first use (`ensureSchema`).
- **Security:** Steam answer verified with `check_authentication` plus return_to, endpoint, SteamID format, signed
  fields (`worker/steam.ts`, tests in `worker/steam.test.ts`); a one-time `state` cookie binds the login to the browser;
  each Steam nonce is used once; session cookie `__Host-rs` (HttpOnly, Secure, SameSite=Lax, 30 days) holds a random
  token and the DB only stores its SHA-256; non-GET requests must carry our own Origin; strats are validated with
  `parseStrat` on the server; limits 256 KB per strat, 1000 strats per account.
- **Client:** `src/lib/strat/cloud.ts` (local-first: localStorage stays the working copy; `syncNow` = newest
  `updatedAt` wins, deletion markers remove strats on other PCs, local-only strats upload; `startAutoSync` sends every
  save/delete via `setSyncHook` in storage.ts, bundled per strat for 1.2 s; `writeFromCloud` applies remote changes
  without re-sending). `src/components/account.tsx`: `useCloudSync` (sync on open and when the tab regains focus after
  30 s) and `AccountButton` (Sign in with Steam / Account dialog: Sync now, Download my data, Sign out with "also remove
  from this browser", Delete my account). Shown on `/app` and in the editor header (md and up).
- **Privacy page** `/privacy` (in footer and sitemap). `PRIVACY_CONTACT` in `src/lib/links.ts` must be filled in by
  the owner before switching sign-in on.
- **Status:** D1 database `radstrat` (id b6ac8f52-8443-4b1d-8e27-62d60989990d) is bound in wrangler.jsonc. The
  sign-in is ON since Nov 2026: `PRIVACY_CONTACT` = csrecap.support@gmail.com (the owner's support address, shown on /privacy). `AccountButton` hides itself if it is emptied. FAQ, landing and llms.txt say sign-in is optional.
- **How it was switched on:** the owner creates a D1 database named `radstrat` (EU jurisdiction / Western Europe) in the
  Cloudflare dashboard and sends its database ID; add `"d1_databases": [{ "binding": "DB", "database_name": "radstrat",
  "database_id": "…" }]` to wrangler.jsonc and push. Then update the FAQ/landing copy ("no accounts" is no longer
  true; sign-in is optional).
- Tested locally with `wrangler dev` + a local D1 (two browser contexts sharing a session = two PCs). Real Steam login
  can only be tried on the live site.

## Code map

- `src/lib/strat/types.ts`: data model. A `Strat` (version 2) has `steps`; each step has `objects`:
  `player` (team T/CT, number 1-5, role; enemies are the other team, drawn as squares), `route`, `utility`
  (smoke/flash/molotov/he/decoy with time `t` and optional thrower `from` = player id; molotov covers the CT
  incendiary), `marker` (role/call icon:
  anchor, awp, entry, support, lurk, igl, hold, boost, rotate, danger, pick), `text`, `bomb` (one per step), `drawing` (pen: free/line/arrow/rect/
  dashed/dashed-arrow, hex colour, opacity, width), `lineup` (pin with title + http(s) link), `vision`
  (sight cone: wide/normal/narrow, angle, length, optional `player` it is attached to).
- `src/lib/strat/model.ts`: create/duplicate/continue steps, and `parseStrat`, which validates **all untrusted
  input** (links, storage) and migrates old data (v1 single board, old player `facing` cones, named pen colours).
- `src/lib/strat/timeline.ts`: playback timing. `share.ts`: lz-string share links. `storage.ts`: localStorage.
  Storage keys are `execute:strats:v1` and `execute:prefs:v1` (the app was once called Execute). **Don't rename
  them** or saved strats disappear.
- `src/lib/strat/templates.ts`: example strats. No longer shown in the UI (the owner found them choppy); kept for tests.
- `src/lib/maps/index.ts`: maps and callout areas on a 1000×1000 board (= the 1024px radar).
- `src/components/board.tsx`: the SVG board and every tool's pointer handling. `editor.tsx`: the planner page
  (history/undo, autosave, Save/Share/Clear board/Delete strategy, steps, map picker, cached prefs).
  `toolbar.tsx`, `tool-options.tsx` (pen and cone panels), `inspector.tsx`, `phase-bar.tsx`, `glyphs.tsx`,
  `utility-icons.tsx` (own grenade icons: cloud, starburst, frag, bottle, decoy with waves), `marker-icons.tsx`
  (lucide icons for markers), `map-layer.tsx`.
- `src/lib/brand.ts`: the app name (`radstrat`). `src/lib/site.ts`: site URL, title, description, FAQ.
- `src/app/page.tsx`: landing page with JSON-LD (SoftwareApplication, FAQPage). Also `robots.ts`, `sitemap.ts`,
  `opengraph-image.png`, `icon.svg`, `public/llms.txt`.

## Decisions already made (don't undo without asking)

- **Maps use Valve's official radar overviews** (`public/maps/*-radar.webp`, screenshots `*-thumb.webp`). Hand-made
  and traced versions were tried and rejected as inaccurate. They are © Valve: fine for now, but a paid launch needs
  Valve's permission or accurate own drawings. Credit stays on the landing page and map picker.
- Map style follows ValoPlant: plain, bombsite letters only, callout names behind a "Callouts" toggle.
  Full callouts exist for Mirage and Dust II; the other six maps have sites and spawns only. Bombsite letters sit just above the
  orange bombsite outline in each radar (`Area.letter`, checked on all eight maps, Nov 2026); spawn names sit above the
  spawn dots (`labelSpot` in map-layer.tsx) so the dots never cover them. Nuke is the upper
  level only; Vertigo is missing (two levels).
- Name is **radstrat** (renamed from csgg in Nov 2026; live at https://radstrat.app). `APP_NAME` in `brand.ts`
  drives titles and copy; the share image `opengraph-image.png` has the logo baked in. **Logo (Nov 2026):** the owner's
  artwork, a white cat head with big eyes + hand-drawn "RAD STRAT" lettering, traced to vector paths in
  `src/components/logo-mark.tsx` (`LogoLockup` = cat + letters, used by `Logo` in every header; `LogoMark` = cat only,
  used in the hero, welcome popup and `icon.svg`). Always white (`text-white`); the eyes are holes; the pupils' glints
  are separate paths (`.logo-pupil`) so the cat blinks (`.logo-blink`, header logo on hover) and its eyes follow the
  pointer in the hero (`--look-x/--look-y` on `.logo-eyes`). The source PNG is white on transparent, so it looks blank
  in previews.
- **Calls to action are light blue** (`--brand: #90b8f8`, `.btn-primary`). Selection on the board is chalk
  (`--chalk`). T is orange (`--t`), CT is blue (`--ct`).
- Pen works like ValoPlant (type, colour swatches + any colour, opacity, thickness). Sight cones work like
  ValoPlant's radar: three widths, the tool places ONE cone then switches back to Select (V). A cone placed on a
  player (or whose dot is dropped on one) attaches via `vision.player` and follows them, also in playback. Soft
  white gradient, origin dot (hidden when attached), diamond tip handle that turns red and sets aim and length.
  Cones stop at walls and crates (line of sight): `public/maps/*-sight.png` masks (white = blocked, built by
  `scripts/build-sight-masks.py` from the radars), ray casting in `src/lib/strat/sight.ts`. Max length is 380 units
  (the owner found longer unrealistic).
- **Phases, not a timeline** (owner's request): in the UI, steps are called "phases" (code still says `steps`).
  The time scrubber and per-object time fields were removed. "New phase" (`continueStep`) copies everything
  except routes, with players at their route ends and times reset to 0. "Delete phase N" sits below the board.
  Play (`phase-bar.tsx`) runs every phase from the first, animating routes, then stops. Old "Step N" names are
  read as "Phase N" (`phaseName`). "Round" was not used: in CS a round is the whole round.
- **Coach features** (from a coach walkthrough): drag from a player with a grenade tool to where it lands = that
  player throws it (dashed throw line, "Thrown by" in the inspector, listed in the share view). "New phase" opens a
  choice: "Keep everything" or "Players and bomb only" (`continueStep(step, name, carry)`). "Place all five at spawn"
  (`teamAtSpawn`) on the empty board and in the roster. Role labels under players ignore clicks.
  Each phase has an optional plan (`Step.note`, "Plan for …" in the strat panel, shown under the phase buttons in the
  share view). The bomb is drawn last so it never hides under players. The welcome popup's button goes to the map
  picker ("Pick a map and start") instead of creating a Mirage strat. The share view shows the strat name above the map.
- **Every placement tool is one-shot** (owner's request, against misplacing): players, enemies, grenades, bomb,
  notes, lineups, routes and cones place ONE item, then the tool goes back to Select (`onToolDone`, `placeAt` in
  board.tsx). Pen and eraser stay on for several strokes.
- Editor UX: "Delete this strategy" lives at the bottom of the Strat details panel, not in the header. Players have
  one-tap role buttons (Entry, AWP, Support, Lurk, Anchor, IGL, Rotator). WCAG 2.5.7: every selected item has
  "Move to…" (next click moves it) and cones have a Direction slider, so nothing needs dragging except drawing.
  The toolbar wraps on phones instead of scrolling sideways.
  Below `lg`, the marker tool shows a compact icon strip right above the map (`MarkerStrip`).
- Landing copy targets CS2 players, IGLs, teams, coaches and esports (FACEIT, Premier, ESEA, LAN). Only claim what
  the app really does: no live collaboration, accounts only as optional Steam sign-in, no FACEIT match import (yet).
- **AI Analyze is "Coming soon" only** (owner's request): upload a demo, AI says what went well/wrong, compared with
  the strat, tips to improve the plan. Shown on the landing page, the strats page (`AiAnalyzeCard`), an "AI Analyze ·
  Soon" button in the editor header (opens a modal) and in the FAQ and llms.txt. Always label it as not available
  yet; keep it out of JSON-LD `featureList`. Building it needs a server, demo parsing and an AI API.

## Design rules

- Tokens live in `src/app/globals.css`. Fonts: Barlow (text), Barlow Condensed (headings, clock, labels).
- Touch targets at least 44px. No all-caps labels. Sentence-case, plain copy; buttons say what happens.
- Custom classes (`.btn`, `.field`, `.label`, `.seg`) are inside `@layer components`; keep them there, or they
  override Tailwind utilities such as `hidden` and `min-h-*`.
- Never name a Tailwind colour `t` (it turns `border-t` orange). Team colours are `team-t` / `team-ct`.
- Check pages at 375px, 768px and 1440px: no sideways scrolling.
- WCAG 2.2 AA matters to the owner. Every page has one `<main>`; axe-core reports zero violations (Nov 2026).
  The board is keyboard usable (`role="application"`, `onKeyDown` in board.tsx): arrows move a cursor or the
  selected item, Enter places with the current tool or selects, Delete removes, Escape deselects. Keep that working.
- Privacy: without an account, strats never leave the user's browser (localStorage + `#` share links, no analytics).
  With optional Steam sign-in they are also stored in Cloudflare D1 (EU); see the Accounts section.

## Security (checked Nov 2026, keep it this way)

- `npm audit`: 0 vulnerabilities. Next 15.5.29, React 19.1.10, vitest 5 (+ @types/node 22), `overrides.postcss`.
  Next 15.5.4 had critical advisories, incl. RCE on Windows-hosted servers: keep Next patched, since the owner runs
  `next dev` on Windows.
- `npm run dev` / `start` bind to `localhost` only (`--hostname localhost`): nobody on the owner's network can reach the
  dev server. Keep the URL `http://localhost:3000` (localStorage is per origin; 127.0.0.1 would hide saved strats).
- `.bat` files use `npm ci` (exact lockfile versions). `update.bat` only fetches from github.com/ariyakongkam/csrecap
  over https and asks before replacing files. `publish.bat` only downloads Caddy from caddyserver.com, after asking.
- `public/_headers` (and the Caddyfile): CSP `script-src 'self' 'unsafe-inline'` (Next's static export needs inline
  scripts), `img-src https:` for lineup pictures, `connect-src 'self'`, `frame-src 'none'`, `frame-ancestors 'none'`,
  HSTS, Permissions-Policy, COOP. Test with `wrangler dev` (it applies `_headers`) after adding anything external.
- No secrets in the repo or its history (old CSRecap code only named `FACEIT_API_KEY` with no value).
- Untrusted input: share/invite links and localStorage go through `parseStrat`; links must be http(s) (`safeUrl`);
  JSON-LD escapes `<`; linked images use `referrerPolicy="no-referrer"`.

## Hosting on Cloudflare (the owner's choice; domain bought at Cloudflare)

- The owner's project turned out to be a **Worker** (Workers Builds), not Pages. `wrangler.jsonc` serves `out/` as
  static assets (`html_handling: auto-trailing-slash`, `not_found_handling: 404-page`; `_headers` applies).
  Worker settings: production branch `claude/hopeful-edison-tja98v` (the repo's default branch is an old CSRecap
  branch, which is what failed first with "Missing script: export"), build command `npm run export`, deploy command
  `npx wrangler deploy`. Checked with `wrangler deploy --dry-run` and `wrangler dev` + the browser suite.
- "Retry build" in Cloudflare rebuilds the same commit as the failed build (it kept building the old default branch
  after the production branch was changed). A new push to the branch starts a fresh build.
- If a Pages project is used instead, the notes below apply.

### Pages (alternative)

- Pages project `radstrat` connected to GitHub `ariyakongkam/csrecap`, production branch
  `claude/hopeful-edison-tja98v`, framework preset None, build command `npm run export`, output folder `out`,
  custom domain `radstrat.app`. `SITE_URL` defaults to https://radstrat.app outside `npm run dev`, so no env var is
  needed (`NEXT_PUBLIC_SITE_URL` still overrides it).
  `.node-version` pins Node 22 for the build. `public/_headers` sets security and cache headers. Pages serves
  `/app` from `app.html` and `404.html` for unknown paths. Every push to the branch deploys automatically.
- The share image is a static `src/app/opengraph-image.png` (+ `.alt.txt`), so every host serves it as a PNG.
  To change it, edit the PNG (the old `opengraph-image.tsx` generator was removed).
- Keep Cloudflare Web Analytics off unless the owner decides otherwise: the site promises no analytics.

## Self-hosting alternative (own machine)


- `npm run export` builds the whole site as static files in `out/` (`next.config.ts` switches to `output: "export"`
  when npm runs the `export` script). `opengraph-image`, `robots` and `sitemap` are `force-static` for this.
- `publish.bat` (Windows): asks the domain once (saved in `hosting/domain.txt`), builds with
  `NEXT_PUBLIC_SITE_URL=https://<domain>`, copies `out/` to `hosting/site/`, offers to download Caddy to
  `hosting/caddy.exe`. `serve.bat` runs Caddy with `hosting/Caddyfile` (automatic HTTPS, `/app` → `app.html`,
  404 page, security headers). The owner needs: DNS A record to their public IP, router ports 80 and 443 forwarded
  to the machine, and serve.bat left running. Tested the export with a stand-in static server and the browser suite;
  Caddy itself has not been run here.
- After `update.bat`, run `publish.bat` again to put the new version online.

## Backups of the code (owner's request: two backups on the PC, refreshed daily)

- `backup.bat` clones the branch (`git clone --depth 1`) into `%USERPROFILE%\Documents\radstrat-backups\incoming`. When
  the commit differs from `backup-1-newest`, it rotates: backup-1 → `backup-2-previous`, download → backup-1 (so backup 2
  is always the version before the newest). It logs to `backup-log.txt`. The first manual run offers a daily Windows task
  ("radstrat backup", 12:00, StartWhenAvailable) via PowerShell `Register-ScheduledTask`. The task runs a **copy** of the
  script in the backup folder (`radstrat-backup.bat /quiet`), so `update.bat` can never change what runs by itself.
  Written for Windows and not run here (no Windows in this environment). Saved strats are not in it: they live in the
  browser (strats page → "Save backup").

## Updating the owner's folder

`update.bat` waits until nothing listens on port 3000 (start.bat closed; checked with PowerShell
`Get-NetTCPConnection`, since netstat text is localised) before `npm ci`, because Windows locks
`next-swc.win32-x64-msvc.node` while the dev server runs (EPERM unlink, Nov 2026). A finished install writes
`node_modules\.radstrat-ok`; start.bat reinstalls when it is missing. Keep update.bat byte-identical up to and including
the `git checkout` block: cmd keeps reading a running .bat by byte offset, so the old script continues in the new file.

`update.bat` fetches branch `claude/hopeful-edison-tja98v` from GitHub, lists new commits, asks J/N and then
**force-checks out** that version. If you work locally in this folder, commit and push your changes before the
owner runs `update.bat`, or tell them not to run it, because it overwrites uncommitted edits.

## Not built yet / ideas

- Full callouts for the remaining maps; Nuke lower level and Vertigo.
- Team workspaces, real-time co-editing, comments (would need a backend and accounts).
- The idea with the most product value from the research: compare a planned strat with what the team actually
  did, from their FACEIT demos ("plan vs. reality"). Needs FACEIT demo access to be confirmed first.
- Earlier product research and MVP plan: https://claude.ai/artifact/W74WHa31caxhSr3abhjyDK

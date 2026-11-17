# csgg: project notes for Claude

Read this first. It sums up what was built and decided in the earlier sessions, so you can carry on without
asking the owner to repeat themselves.

## The owner

- Not a developer. Runs the app on Windows with `start.bat` and gets new versions with `update.bat`.
- Writes in Swedish or English: answer in the language they use. Keep explanations plain and short.
- Likes to see results: after visible changes, describe what changed and, where possible, show it.
- Ask before anything hard to undo (deleting, overwriting, pushing to `main`, deploying).

## What csgg is

A free, browser-based **CS2 strat planner / tactics board** (like ValoPlant, but for Counter-Strike 2) for players,
IGLs, teams, coaches and esports. Plan executes on a 2D map, time every grenade, play it back, share it in one link.
No accounts and no server: strats live in the browser and travel in share links.

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

- `/`: landing page (SEO/GEO/AEO). Keep it **simple**: logo hero, 3 features, who it's for, short FAQ.
- `/app`: start a strat (map cards with blurred screenshots, side) and the list of saved strats. First visit shows
  a welcome popup (`src/components/welcome.tsx`), reopened with the ? button.
- `/edit?id=…`: the planner. `/view#…`: read-only shared strat (whole strat compressed in the URL fragment).

## Code map

- `src/lib/strat/types.ts`: data model. A `Strat` (version 2) has `steps`; each step has `objects`:
  `player` (team T/CT, number 1-5, role; enemies are the other team, drawn as squares), `route`, `utility`
  (smoke/flash/molotov/he with time `t`), `text`, `bomb` (one per step), `drawing` (pen: free/line/arrow/rect/
  dashed/dashed-arrow, hex colour, opacity, width), `lineup` (pin with title + http(s) link), `vision`
  (sight cone: wide/normal/narrow, angle, length).
- `src/lib/strat/model.ts`: create/duplicate/continue steps, and `parseStrat`, which validates **all untrusted
  input** (links, storage) and migrates old data (v1 single board, old player `facing` cones, named pen colours).
- `src/lib/strat/timeline.ts`: playback timing. `share.ts`: lz-string share links. `storage.ts`: localStorage.
  Storage keys are `execute:strats:v1` and `execute:prefs:v1` (the app was once called Execute). **Don't rename
  them** or saved strats disappear.
- `src/lib/strat/templates.ts`: example strats. No longer shown in the UI (the owner found them choppy); kept for tests.
- `src/lib/maps/index.ts`: maps and callout areas on a 1000×1000 board (= the 1024px radar).
- `src/components/board.tsx`: the SVG board and every tool's pointer handling. `editor.tsx`: the planner page
  (history/undo, autosave, Save/Share/Clear board/Delete strategy, steps, map picker, cached prefs).
  `toolbar.tsx`, `tool-options.tsx` (pen and cone panels), `inspector.tsx`, `timeline.tsx`, `glyphs.tsx`,
  `utility-icons.tsx` (own grenade icons), `map-layer.tsx`.
- `src/lib/brand.ts`: the app name (`csgg`). `src/lib/site.ts`: site URL, title, description, FAQ.
- `src/app/page.tsx`: landing page with JSON-LD (SoftwareApplication, FAQPage). Also `robots.ts`, `sitemap.ts`,
  `opengraph-image.tsx`, `icon.svg`, `public/llms.txt`.

## Decisions already made (don't undo without asking)

- **Maps use Valve's official radar overviews** (`public/maps/*-radar.webp`, screenshots `*-thumb.webp`). Hand-made
  and traced versions were tried and rejected as inaccurate. They are © Valve: fine for now, but a paid launch needs
  Valve's permission or accurate own drawings. Credit stays on the landing page and map picker.
- Map style follows ValoPlant: plain, bombsite letters only, callout names behind a "Callouts" toggle.
  Full callouts exist for Mirage and Dust II; the other six maps have sites and spawns only. Nuke is the upper
  level only; Vertigo is missing (two levels).
- Name is **csgg**. Logo is a white cat head inside a light-blue orbit with a star (`src/components/logo-mark.tsx`,
  vector paths; the source image has a transparent background, so the white cat is easy to miss).
- **Calls to action are light blue** (`--brand: #90b8f8`, `.btn-primary`). Selection on the board is chalk
  (`--chalk`). T is orange (`--t`), CT is blue (`--ct`).
- Pen works like ValoPlant (type, colour swatches + any colour, opacity, thickness). Sight cones are standalone
  objects in three widths, moved by the dot and resized/aimed by the tip handle.
- Landing copy targets CS2 players, IGLs, teams, coaches and esports (FACEIT, Premier, ESEA, LAN). Only claim what
  the app really does: no live collaboration, no accounts, no FACEIT match import (yet).

## Design rules

- Tokens live in `src/app/globals.css`. Fonts: Barlow (text), Barlow Condensed (headings, clock, labels).
- Touch targets at least 44px. No all-caps labels. Sentence-case, plain copy; buttons say what happens.
- Custom classes (`.btn`, `.field`, `.label`, `.seg`) are inside `@layer components`; keep them there, or they
  override Tailwind utilities such as `hidden` and `min-h-*`.
- Never name a Tailwind colour `t` (it turns `border-t` orange). Team colours are `team-t` / `team-ct`.
- Check pages at 375px, 768px and 1440px: no sideways scrolling.

## Updating the owner's folder

`update.bat` fetches branch `claude/hopeful-edison-tja98v` from GitHub, lists new commits, asks J/N and then
**force-checks out** that version. If you work locally in this folder, commit and push your changes before the
owner runs `update.bat`, or tell them not to run it, because it overwrites uncommitted edits.

## Not built yet / ideas

- Deploy (e.g. Vercel) and point the owner's domain at it; set `NEXT_PUBLIC_SITE_URL` for canonical links,
  sitemap and share previews.
- Full callouts for the remaining maps; Nuke lower level and Vertigo.
- Team workspaces, real-time co-editing, comments (would need a backend and accounts).
- The idea with the most product value from the research: compare a planned strat with what the team actually
  did, from their FACEIT demos ("plan vs. reality"). Needs FACEIT demo access to be confirmed first.
- Earlier product research and MVP plan: https://claude.ai/artifact/W74WHa31caxhSr3abhjyDK

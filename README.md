# radstrat

The free CS2 strat planner for players, teams and coaches: plan executes on a 2D map phase by phase, play them back,
and share them in one link. Live at https://radstrat.app.

- No accounts and no server: strats are saved in the browser (localStorage) and travel inside links (the part after
  `#`, which browsers never send to a server).
- The site is static files (`npm run export` → `out/`), served by Cloudflare (`wrangler.jsonc`).
- Project notes, decisions and the code map are in `CLAUDE.md`.

## Run it

```bash
npm ci
npm run dev        # http://localhost:3000, only reachable from this computer
npm test
npm run export     # build the static site into out/
```

On Windows: `start.bat` (run locally), `update.bat` (get the newest version, asks first).

## Security

- `public/_headers` sets a strict Content Security Policy (only the site's own scripts, no frames, no outside
  connections), HSTS, `X-Frame-Options: DENY`, `nosniff`, a Permissions-Policy and `COOP`.
- Everything that comes from a link or from storage is validated in `parseStrat` (`src/lib/strat/model.ts`): unknown
  fields are dropped, numbers clamped, colours must be hex, and links must be http(s).
- External links open with `rel="noopener noreferrer"`; linked images load with `referrerPolicy="no-referrer"`.
- `npm audit` reports 0 vulnerabilities (Nov 2026). Installs use `npm ci`, so only the locked versions are installed.
- No analytics, trackers or third-party scripts. Ko-fi is a plain link.

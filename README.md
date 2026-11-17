# CSRecap

**Understand your game. Improve every match.**

Enter a FACEIT nickname or Steam ID and get a CS2 player report that turns stats into advice:

- **Overview**: level, Elo, matches, win rate, K/D, average kills, headshot %, ADR (career vs last 20 matches)
- **Playstyle**: Aggressive Entry, Supportive Player, Clutch Player, Consistent Rifler, Dedicated AWPer, Impact Fragger or Balanced Player, with the numbers behind it
- **Strengths & weaknesses**: up to three each, in plain language
- **Coach summary**: what the numbers mean, not just what they are
- **Your next focus**: one goal, a measurable target and three tasks (tickable, saved in the browser)
- **Map pool**: win rate per map against the player's overall

No account required.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Motion · Vitest

```
src/
  app/                     pages, loading/error states, /api/player/[query] JSON route
  components/              UI (search, report cards)
  lib/faceit/              FACEIT Data API client, input parsing, normalized types
  lib/analysis/            rules engine: metrics → playstyle → insights → focus plan
  lib/player.ts            single entry point: lookup + analysis
```

## Data

All data comes from the [FACEIT Data API v4](https://docs.faceit.com/docs/data-api/data) (server-side key, ~20 req/s).
Each report makes 3 requests, cached for 10 minutes:

| Endpoint | Used for |
| --- | --- |
| `GET /players?nickname=` / `?game=cs2&game_player_id=` | profile, level, Elo, Steam ID lookup |
| `GET /players/{id}/stats/cs2` | lifetime + per-map stats (opening duels, clutches, utility, sniper share) |
| `GET /players/{id}/games/cs2/stats?limit=20` | last 20 matches (form, consistency) |

**Not available from FACEIT** (would need demo parsing): trades, positioning, round-by-round events. The report
never claims these. Steam custom URLs (`/id/name`) aren't supported because they'd need a Steam Web API key;
SteamID64 and `/profiles/<id>` links work through FACEIT directly.

### How the analysis works

`lib/analysis` is pure and deterministic (no LLM). Players are compared against reference points in
`lib/analysis/reference.ts`:

- **Grounded** (true at every level): K/D 1.0, win rate 50%, opening-duel rate 0.2.
- **Per level** (`lib/analysis/baselines.json`, 200 players per FACEIT level 1–10, each with ≥300 rounds of
  extended stats): median and IQR of ADR, HS%, 1v1 win rate, opening-duel success and the utility stats. A player
  is compared against their own level; copy says "for your level" only when that's what it's based on.
- **Fallback** when the level is unknown or thin: the older sample of 60 EU players at levels 8–10 (and 50% for
  opening-duel success).
- **Self-comparison**: per-map vs overall, last 20 matches vs career, match-to-match ADR variation
  (thresholds from a 40-player sample).

Claims need minimum evidence (e.g. 300 rounds of extended stats, 20 clutches, 10 matches per map).

## Development

```bash
cp .env.example .env.local   # add FACEIT_API_KEY (server-side key from developers.faceit.com)
npm install
npm run dev
npm test
```

Behind an HTTP proxy (e.g. a cloud dev sandbox), Node's `fetch` ignores `HTTPS_PROXY` unless you start the server
with `NODE_USE_ENV_PROXY=1`.

To rebuild the per-level baselines (~5,000 requests, ~6 minutes at 15 req/s; needs Node ≥ 22.21):

```bash
FACEIT_API_KEY=... npm run baselines -- --per-level 200
```

## Not built yet (on purpose)

Match-by-match analysis, accounts and progress tracking, weekly reports, an LLM-written summary layer. The JSON route (`/api/player/[query]`) and the pure analysis module are the foundation for these.

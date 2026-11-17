# Execute: tactics board

A web app for planning CS2 executes on a 2D board: place players, draw their routes, drop smokes, flashes,
molotovs and HEs at the second they pop, then press play to watch the plan run. Strats are shared as a single
link that opens without an account.

## What's in this version

- **Board** (`src/components/board.tsx`): SVG, 1000×1000 units. Tools: select/move, T and CT players (auto-numbered
  1–5), routes (drag from a player to attach; drag on empty ground for a plain arrow), smoke, flash, molotov, HE, notes.
- **Timing**: every route, grenade and note has a time in the round. Play, scrub, or jump to an event from the
  timeline. Players walk their routes at running speed; grenades stay up for their real duration.
- **Library**: strats are saved in the browser (localStorage), with duplicate and delete. Two example strats:
  Mirage A Execute and Dust II Long A Take.
- **Share links**: the whole strat is compressed into the URL fragment (`/view#…`), so nothing is stored on a
  server. The viewer shows the board, playback, roles, utility order and notes, and can save a copy to edit.
- **Editing**: undo/redo (a whole drag undoes in one step), keyboard shortcuts (V, 1, 2, R, S, F, M, H, N, Space
  to play, Delete, Ctrl+Z).

Maps are our own simplified layouts built from named areas, cover and callouts (`src/lib/maps`), not Valve's radar images, which
are © Valve. Named areas also make it possible to check plans against demos later ("smoke landed in Jungle").

## Not built yet

Accounts and team workspaces, real-time co-editing, comments, more maps, and the plan-vs-reality check against
FACEIT demos (see the product research doc).

## Development

```bash
npm install
npm run dev
npm test
```

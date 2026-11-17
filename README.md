# Execute: tactics board

A web app for planning CS2 executes on a 2D board: place players, draw their routes, drop smokes, flashes,
molotovs and HEs at the second they pop, then press play to watch the plan run. Strats are shared as a single
link that opens without an account.

## What's in this version

- **Board** (`src/components/board.tsx`): SVG, 1000×1000 units. Tools: select/move, teammates and enemies (the
  side you play decides which colour each is; enemies are square), view cones ("where they look", dragged out
  from a player), routes, pen (5 colours), eraser (click or drag over anything), notes, smoke, flash, molotov,
  HE, the bomb (one C4 per step) and lineup pins that link to a YouTube video or an image.
- **Steps**: a strat is a sequence of boards (e.g. Execute → Post-plant). Add, rename, reorder, delete, or
  continue from a step: the next step starts with everyone where their routes ended.
- **Timing**: every route, grenade, note and the bomb plant has a time in the step. Play, scrub, or jump to an
  event; the clock shows the 1:55 round timer.
- **Saving**: strats, the open step, the last tool and the pen colour are kept in the browser's local storage.
  Changes save automatically; the Save button (Ctrl+S) saves right away and shows when it last did. Clear board
  and Delete strategy both ask first; clearing can be undone.
- **Library and share links**: duplicate, delete, two example strats. Share links carry the whole strat in the
  URL fragment (`/view#…`); the viewer shows every step, roles, utility order, lineup links and notes.
- **Editing**: undo/redo across steps (a drag or a burst of typing is one step), keyboard shortcuts
  (V, 1, 2, D, R, P, E, N, S, F, M, H, B, L, Space to play, Delete, Ctrl+Z, Ctrl+S).

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

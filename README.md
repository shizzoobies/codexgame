# Codex Games

This repo now holds two original browser games:

1. `Sky Raider Blitz` at the repo root
2. `Mosslight Run` in [`mosslight-run/`](./mosslight-run/)

## Games

### Sky Raider Blitz

A browser-only multi-lane scrolling shooter designed for static hosting.

- 3-lane movement with touch, swipe, and keyboard controls
- auto-fire arcade combat with enemy shooters and recurring boss waves
- coins, upgrade picks, persistent best score, and replay loop
- no backend and no build tooling required

### Mosslight Run

An original retro-inspired platformer built in plain HTML, CSS, and JavaScript.

- three handcrafted stages with side-scrolling camera
- double jump traversal and hidden glimmer caches tucked into secret ledges
- original sprite art, title illustration, and CC0 sound effects
- score, timer, hearts, pause/restart flow, and touch controls
- no frameworks or build tooling

## Run locally

From the repo root:

```bash
python -m http.server 8080
```

Then open:

- `http://localhost:8080/` for `Sky Raider Blitz`
- `http://localhost:8080/mosslight-run/` for `Mosslight Run`

## File structure

- `index.html`, `styles.css`, `game.js` - `Sky Raider Blitz`
- `mosslight-run/` - full `Mosslight Run` game page and assets

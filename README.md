# Sky Raider Blitz

A browser-only multi-lane scrolling shooter designed for static hosting on GitHub and Cloudflare Pages.

## What it includes
- 3-lane movement with touch, swipe, and keyboard controls
- auto-fire arcade combat with enemy shooters and recurring boss waves
- coins, upgrade picks, persistent best score, and replay loop
- no backend and no build tooling required

## Run locally
Open `index.html` in a browser.

If you want a tiny local server instead:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`

## Deploy to GitHub + Cloudflare Pages
1. Create a new GitHub repository.
2. Copy the files from this folder into the repo root.
3. Commit and push to GitHub.
4. In Cloudflare Pages, connect the GitHub repo.
5. Use these settings:
   - Framework preset: `None`
   - Build command: leave blank
   - Build output directory: `/`
6. Deploy.

## Good next upgrades
- replace placeholder ship shapes with your own art or spritesheets
- add sound effects and background music
- add revive or continue flow between runs
- add additional enemy patterns and lane hazards
- add settings for difficulty, audio, and visual quality

## File structure
- `index.html` - HUD, overlays, and control layout
- `styles.css` - responsive styling for mobile and desktop
- `game.js` - rendering, controls, enemies, upgrades, and game loop

## Notes
The project is intentionally static so you can host it directly from GitHub through Cloudflare Pages without introducing a bundler or backend.

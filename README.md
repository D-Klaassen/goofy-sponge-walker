# Goofy Sponge Walker

A goofy idle walker game in a single `index.html` (Three.js from a CDN, no build step).

A cartoon sponge struts along a rolling hill road. Keys pop up on screen: press the key (or click it) before its timer runs out to fill the **goofy meter**. Every 20% the walk gets goofier and a bit faster; a full meter starts **UBER GOOBER MODE**. A miss resets the meter and the sponge falls flat on its face. Steps are counted per footfall; distance and achievements follow.

## Run

Any static file server works, for example:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Controls

- Letter keys: hit the key that pops up (never Q, B, G or M, those are menu keys)
- `Esc`: menu with every key; closes any open window
- `Q`: achievements
- `B` / 🛍 button: shop, spend steps on skins (Classic, Princess: pink ball gown with a heart diamond tiara). Each outfit is a wrapped gift showing only a silhouette; buying it unwraps the box
- `G` / 🎞 button: save a GIF of one seamless walk cycle (50 fps, the game's camera view); the key rush pauses while it records
- `M` / 🛠 button: model viewer (only with `?developer-mode=true`; opens at the game's own slanted camera angle, **Reset camera** goes back there), with a goofy meter slider (levels 0–6), a camera angle box in the top left (0° = front, 90° = his left, 180° = back, 270° = his right; type a number to jump there, 📋 copies it), an outfit picker, pose scrubber, wireframe and outline toggles, and a **Show sponge** switch to view an outfit on its own, a 🎞 **Export GIF** button (same as `G`, but from the viewer's current camera), a 👣 **+10,000 steps** button and a 🔄 **Restart game** button
- Dev keys (only with `?developer-mode=true`): `1` auto mode, `2` +1000 steps, `0` restart the game (wipes the save after a confirm)

## Skins

Each skin is an outfit group built with `dressUp()` in `makeTorso`, plus per-skin limb parts (`limbs`). The butt belongs to the body, so every skin (also future ones) has it; the `BUTT` table sets how each skin covers it.

## Making outfits

All body measurements for clothes (head top, face features, shoulders, waist, arm and leg attach points) are in [docs/outfit-sizes.md](docs/outfit-sizes.md).

## Review agents

`.claude/agents/` holds three read-only reviewers for outfits: `dress-designer` (fit and style on the character), `animator` (motion, clipping while walking) and `dress-modeler` (the outfit as a 3D model, from renders with the sponge hidden).

## Note

The character is a fan-made, SpongeBob-inspired design for a personal project. SpongeBob SquarePants is owned by Nickelodeon.

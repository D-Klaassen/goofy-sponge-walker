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

- Letter keys: hit the key that pops up
- `Q`: achievements
- `B` / 🛍 button: shop, spend steps on skins (Classic, Princess: pink ball gown with a heart diamond tiara)
- `M` / 🛠 button: model viewer (only with `?developer-mode=true`), with a goofy meter slider (levels 0–6), pose scrubber, wireframe and outline toggles, and a **Show sponge** switch to view an outfit on its own

## Skins

Each skin is an outfit group built with `dressUp()` in `makeTorso`, plus per-skin limb parts (`limbs`). The butt belongs to the body, so every skin (also future ones) has it; the `BUTT` table sets how each skin covers it.

## Review agents

`.claude/agents/` holds three read-only reviewers for outfits: `dress-designer` (fit and style on the character), `animator` (motion, clipping while walking) and `dress-modeler` (the outfit as a 3D model, from renders with the sponge hidden).

## Note

The character is a fan-made, SpongeBob-inspired design for a personal project. SpongeBob SquarePants is owned by Nickelodeon.

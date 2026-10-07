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
- `M` / 🛠 button: model viewer (only with `?developer-mode=true`), with a goofy meter slider (levels 0–6), pose scrubber, wireframe and outline toggles

## Note

The character is a fan-made, SpongeBob-inspired design for a personal project. SpongeBob SquarePants is owned by Nickelodeon.

# PROTOTYPE: princess dress (throwaway)

**Question:** what should SpongeBob's princess dress look like?

**Verdict:** B, the ball gown, with much bigger puff sleeves and no bow. It is now the dress in the game's `index.html`.

## Variants

- **A, Pink bell:** knee-length bell skirt, petticoat, straight bodice, bow.
- **B, Ball gown (chosen):** long bell skirt with two ruffle bands, sweetheart bodice, big puff sleeves.
- **C, Tutu ballerina:** flat layered tutu, corset bodice. The reviewer's verdict: it reads as a ballerina, not a princess.
- **D, Blue gown:** scalloped overskirt. It has low contrast against the sky.
- **E, Royal purple with cape:** the cape clips through the skirt. The reviewer called it the most broken variant.

A reviewer subagent ranked them B > D > A > E > C. After that, B went through four review rounds:

1. The neckline was lowered so it no longer covers the mouth.
2. The skirt got an ink outline that follows its curve, plus an ink line along the hem.
3. The ruffle bands got an outline that only grows outward.
4. The chin marks were removed from the faces.

The last round ended in "ship it".

## Run it

The page imports Three.js from a CDN, so it needs to be served over HTTP:

```bash
cd prototypes/princess-dress && python3 PROTOTYPE-snapshot-server.py
```

- **Open a variant:** http://localhost:8791/PROTOTYPE-princess-dress.html?developer-mode=true&dress=B. The bar at the bottom switches variants.
- **Take screenshots:** add `&shoot=1` to the URL. The page then saves 5 screenshots to `shots/`.

Screenshot names are `<variant>_<view>.png`. The B shots are from the final round. A, C, D and E are from the first round, and E has no goofy-level-5 shot.

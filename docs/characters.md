# Characters: adding a new one, big or small

The hero on the road can be the sponge or another character bought in the shop. Plankton is the first extra one. This page explains everything that depends on a character's **size**, so a new character (a giant crab, a tiny snail, ...) fits the first time. All numbers come from `index.html`. For clothes on the sponge, see [outfit-sizes.md](outfit-sizes.md).

## The idea in one paragraph

Every character is built in **design units**, at roughly the sponge's height (about 3–4 units), so the same outline widths and helper functions work. Then its root group is scaled down or up to its **real size** (`scale`). The road, rocks and sky never change. A small character makes the world look huge, because the camera comes closer to him. Each step he takes covers his own real stride, so the **distance** counter goes up slower for small characters and faster for big ones. The **steps** counter (the shop money) is one step per footfall for every character, so no character earns money faster.

## The `CHARS` table

All size settings live in one table, `CHARS` in `index.html` (next to `const env=buildC()`).

| Field | Meaning | Sponge | Plankton |
|---|---|---|---|
| `outfit` | outfit worn before you pick one (see the shop section below) | `'classic'` | `null` (no clothes yet) |
| `height` | real height on the road, world units (sole to top of head) | 3.6 | 0.58 (body top 0.43, antenna tips 0.58) |
| `scale` | root scale: design units → world units | 1 | 0.15 |
| `cam` | in-game camera: position `(0, y, z)`, looking at `(0, ly, 0)` | y 2.9, z 10, ly 1.9 | y 0.82, z 3.1, ly 0.42 |
| `zoom` | how far you can zoom the game camera: `in` = closest, `out` = furthest, as a multiple of the `cam` distance (1 = normal) | in 0.8, out 1.6 | in 0.75, out 3.4 |
| `view` | model viewer start: target height `ty` and camera distance `dist` | ty 1.7, dist 8.4 | ty 0.26, dist 1.5 |
| `stride` | half step length, design units (`BASE_A`) | 0.46 | 0.30 |
| `omega` | step speed (walk cycles per second × 2π) | 5.2 | 5.2 |
| `ink` | outline width multiplier in design units | 1 | 2.2 |
| `stepM` | metres of distance per step | 0.30 (`STEP_M`) | ≈ 0.029 (computed) |
| `stars` | height of the dizzy stars after a fall, design units | 4.1 | 3.4 |

### How to pick each number

- **`height` and `scale`:** decide how tall he really is next to the sponge (3.6). Then `scale = height ÷ design height`. Plankton is about 1/6 of the sponge: 0.58 tall, built 3.9 units tall in design units, so `scale = 0.15`.
- **`cam`:** the camera should **not** zoom all the way to his size, or he would look as big as the sponge on screen. Plankton's camera is about 0.31 of the sponge's distance while he is 0.15 of the size. So on screen he is about half the sponge's size, and the world around him looks about three times bigger. Rule of thumb: `cam ≈ sponge cam × (scale × 2)` for small characters, and `ly` at about chest height. A big character can use the sponge camera × `scale`, and maybe a bit more so he fits.
- **`zoom`:** a big character is already seen from far away, so keep `in` close to 1 (he should never fill the screen) and `out` modest. A small character starts close up, so allow a big `out` (about 3–4) so players can pull back and see how tiny he is in the world. The zoom is saved per character in `S.zoom`.
- **`view`:** `dist ≈ 8.4 × height ÷ 3.6 × 1.5`, and `ty` at about mid-height. The goofy meter pull-back scales from this.
- **`stride` and `omega`:** pick a stride that suits his legs in design units. Keep `omega` at 5.2 so he earns steps at the same rate as the sponge. A faster `omega` would also make him earn steps faster.
- **`ink`:** outlines are built in design units and scale with the root. To make lines look as heavy on screen as the sponge's, use `ink ≈ (cam scale) ÷ scale`. For Plankton that is 0.31 ÷ 0.15 ≈ 2.2. A big character usually needs about 1.
- **`stepM`:** never type it by hand. It is computed from the real stride compared with the sponge's: `stepM = STEP_M × (stride × scale) ÷ (0.46 × 1)`. For Plankton: 0.3 × (0.30 × 0.15) ÷ 0.46 ≈ 0.029 m, about 3 cm per step, ten times slower than the sponge.

## Shop items: characters and their own clothes

Every item in `SKINS` has two fields that say what it is and who it is for:

| Field | Values | Meaning |
|---|---|---|
| `type` | `'character'` or `'outfit'` | a whole other hero, or clothes |
| `char` | a `CHARS` key, like `'sponge'` or `'plankton'` | the character it belongs to. Clothes only fit their own character. |

```js
{id:'plankton',type:'character',char:'plankton',name:'Plankton',...,price:5000},
{id:'princess',type:'outfit',char:'sponge',name:'Princess',...,price:1000},
```

- The shop shows a **Characters** section, then an **Outfits for …** section per character (only for characters that have outfits).
- **Play** on a character puts him on the road in the outfit he last wore. **Wear** on an outfit also switches to its character.
- Each `CHARS` row has `outfit`: the outfit a character wears before you pick one (`'classic'` for the sponge, `null` for Plankton until he gets clothes).
- The save holds `S.char` (who is playing), `S.outfits` (the outfit each character wears, like `{sponge:'princess'}`) and `S.skins` (every bought item). Old saves with a single `S.skin` are converted on load.
- `show(char, outfit)` puts a character on the road in an outfit. The model viewer uses it to try anything on, bought or not, and `showSaved()` puts back what the save says.

### Making clothes for another character

1. Build the clothes inside that character's build function, as groups that `setSkin(id)` shows or hides. The sponge does this with `dressUp()` and `limbs`. Mark them so `isOutfit()` returns true, so the viewer's **Show body** switch can hide the body and keep the clothes.
2. Add a `SKINS` item with `type:'outfit'` and `char:` that character, plus an icon in `SKIN_ICON`.
3. Measure from that character's own design units (for Plankton: the reference table at the bottom of this page), never from the sponge's.

## The distance counter

- `S.dist` (in the save) holds the distance in metres. `gain(n)` adds `n × stepM` of the character walking at that moment.
- Old saves without `S.dist` start at `steps × 0.3 m`.
- The HUD shows one decimal below 100 m (`fmtDist`), so a small character's progress is visible.
- The distance achievements read `S.dist`.

## What a character must provide

A character is built by a function like `buildPlankton(C, R)` (C = its `CHARS` row, R = the road drum radius `env.roadR`) and returns an object with:

| Member | What it does |
|---|---|
| `rig.root` | group at his feet, scaled by `C.scale`. The fall rotates it around the feet, and the stand-up hop moves it up. |
| `rig.body` | group for the body. The dizzy stars are added here. |
| `walk(rig, phase, dt)` | poses him for this walk phase (two steps per 2π). Feet must sit on the curved road: ankle height `− z² ÷ (2 × R ÷ scale)` in design units. |
| `omega` | `C.omega` |
| `speed` | walking speed in **world** units per second (`2 × stance stride × omega ÷ π × scale`). The road rolls at this speed, so the feet stay planted. |
| `pose` | the fall/stand-up fields `flail, plant, splat, bx, by, bz, stretch, kick, trip, knee, cheer, t`. `fallPose()` fills them; `walk()` must read them (arms windmill, hands planted on the road, legs kick, arms thrown up ...). |
| `setFace(mood)` | `'happy'`, `'scared'` or `'sad'` |
| `setGoofy(level)` | goofy meter level 0–6: longer limbs, bigger bounce and sway |
| `goofyNames` | the level names (copy `env.goofyNames`) |
| `isOutfit(mesh)`, `setSkin(id)` | outfits; a character without outfits returns `false` and does nothing |
| `char` | its `CHARS` row (set after building) |

## Hooking it up

1. Add a row to `CHARS` (with `outfit:null` until it has clothes), and build the character next to `plank`: `const crab=buildCrab(CHARS.crab,env.roadR);crab.char=CHARS.crab;crab.rig.root.visible=false;world.add(crab.rig.root)`.
2. Add it to `HEROES` (`{sponge:env,plankton:plank,crab}`), so `show()` can find it.
3. Add a shop item to `SKINS` with `type:'character'`, `char:'crab'`, a `paper` colour, a price and a drawn icon in `SKIN_ICON` (SVG, 100 × 100, `SVG_G` ink style). The shop shows it as a "Mystery character" gift until bought.
4. Add the new rig to the model viewer lists (`rigMeshes`, `worldParts` filter, `setGoofy`, `syncLevel`, and `setSponge` if it has mood parts that must stay hidden) the same way `plank` is.
5. Check it in the model viewer (`?developer-mode=true`, `M`, Outfit / character): goofy 0 and 6, the pose slider, all three faces, **Play fall + stand up**, and the in-game view after buying it.
6. Let the review agents look at screenshots: `character-designer` for the look, `animator` for the motion.
7. Add the character's row to the table above.

## Plankton: design reference (design units, before × 0.15)

| Part | Value |
|---|---|
| Body | lathe egg through the keys (radius, y): (0.38, 0.66) (0.58, 0.82) (0.66, 1.15) (0.64, 1.6) (0.56, 2.1) (0.43, 2.5) (0.30, 2.76), top 2.9, smoothed to 31 points; front-to-back scale 0.85. `onBody(x, y, out)` gives a point on its front surface |
| Eye | one group at (0, 2.0, 0.26), flattened to 0.75 deep: pale yellow ball r 0.38 (front about 0.05 in front of the body, no outline shell), red iris r 0.2 and black pupil r 0.095 on its surface, white glint |
| Unibrow | black tube r 0.065 on the body surface, x ±0.40: a sharp V scowl (y 2.40 in the middle to 2.55 at the ends); scared: a high round arch up to 2.66; sad: middle up to 2.58, ends dropped |
| Mouth | black tube r 0.035 on the body surface: a wide grin x ±0.44 from y 1.44 with corners curling up; a frown; a round "o" when scared |
| Antennae | hoses r 0.032 from (±0.1, 2.82) to tips near (±0.48, 3.85), lagging behind the bob (goofy multiplier up to 2.4) and trailing up and back when he trips |
| Arms | hoses r 0.05 from shoulders (±0.6, 1.45), ending at 93% inside the fist; fists r 0.11 with a small thumb on top; kept outside the egg + 0.14 |
| Legs | hoses r 0.06 from hips (±0.24, 0.74), rest length 0.8; feet r 0.13 scaled (1, 0.55, 1.5) |
| Colours | body 0x58a83e, antennae 0x3f7f2c, eye 0xfff2a0, iris 0xd8262e |
| Walk | stride 0.30, lift 0.22, rest leg 0.8; leans forward 0.1; twist capped at 0.25 rad and roll at 0.2; fists pump fore and aft close to his sides, up to (±0.86, 1.6, 0.62) |
| Fall | same `fallPose()` timing as the sponge; feet gather under him in the crouch, stretched up to 0.3 in the air, a 0.22 s squash on landing |

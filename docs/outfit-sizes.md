# Outfit sizes: where everything sits on the sponge

Use these numbers when you design a new outfit (hat, shirt, dress, glasses, ...), so it fits the first time. All numbers come from `index.html`. If you change the body, update this file too.

## Units and axes

- **Units:** scene units. The sponge is about 3.6 units tall from sole to head top.
- **y:** up. `y = 0` is the road, under his shoes.
- **x:** sideways. **+x is his left** (your right when you look at his face).
- **z:** front/back. **+z is the front**, where the face is.
- **Model viewer angles:** 0° = front, 90° = his left side, 180° = back, 270° = his right side. "Height" is how far above (+) or below (−) his middle you look from.

## Where to attach a piece

| Piece | Attach to | Why |
|---|---|---|
| Hat, glasses, shirt, dress top, skirt, belt, tie, anything on the torso or head | the **body** group (`t.body`, via `add(mesh,x,y,z)` in `makeTorso`) | It squashes, stretches, sways and falls with him. Numbers below are body space. |
| Sleeves, pant legs, socks, gloves | an arm or leg **hose** (`hose(parent,mat,radius,ink,a,b)`) | Limbs are bent curves rebuilt every frame. `a..b` is the part of the limb it covers: 0 = shoulder/hip, 1 = hand/ankle. |
| Shoes, things on the hands | the shoe or hand group | They follow the foot/hand position and rotation. |

The body group's origin is at the road (`y = 0`), so body-space y equals height above the road when he stands still. While walking the body:

- leans back a little (`rotation.x = -0.05`) and sways;
- squashes down to 75% height on each step and stretches up to 112%;
- scales from its origin at his feet, so a hat moves down about 0.9 when he squashes. That is fine as long as the hat is in the body group.

## The head and body (the sponge block)

The sponge is one wobbly box, centred at `(0, 2.62, 0)`.

| What | Value |
|---|---|
| Height | 1.90 (y **1.67** bottom to **3.57** top) |
| Width at the top | **1.70** (x ±0.85), plus ±0.035 wobble |
| Width at the bottom | **1.50** (x ±0.75), plus ±0.035 wobble |
| Depth | **0.74** (z ±0.37). Front face at **z = +0.37**, back at −0.37 |
| Edge wobble | top and bottom edges go up and down ±0.03 |

The width grows linearly from bottom to top: half-width at height `y` is `0.8 × (1 + 0.12 × (y − 2.62) / 1.9)`.

### Hats and other headwear

- **Top of the head:** y = **3.57**. Because of the ±0.03 wobble, let a hat sink in to **y ≈ 3.54** so no gap shows.
- **Head footprint:** 1.70 wide × 0.74 deep. A hat that should cover the head needs at least that, plus about 0.05 for the ink outline.
- **Centre:** x = 0, z = 0. A cap that tilts forward can move to z ≈ +0.05.
- **Brim in front:** keep its lowest edge **above y ≈ 3.42**, or it covers the sad-face eyebrows. Eyelashes reach y 3.28, eyes y 3.18.
- **Existing example:** the princess tiara. Its band follows the front top edge: y 3.54, z +0.37, half-width 0.8, ends bending back 0.26. The heart sits on top, centred at y ≈ 3.90.

### Face features (on the front, z = +0.37)

Keep clothing and accessories off these, unless the piece is meant to cover them (sunglasses).

| Feature | x | y | Notes |
|---|---|---|---|
| Eyes (2 ovals) | centres ±0.24, outer edge ±0.49 | 2.64 – 3.18, centre 2.91 | each 0.49 wide, 0.54 tall |
| Eyelashes | ±0.09 – ±0.38 | up to 3.28 | |
| Sad eyebrows | ±0.10 – ±0.43 | 3.30 – 3.41 | only on the sad face |
| Nose (3D) | 0 | 2.59 – 2.75 | straight tube r 0.075 sticking out to **z ≈ +0.84**; tip ball at `(0, 2.67, 0.76)` |
| Cheeks | ±0.51 | ≈ 2.60 | |
| Mouth | ±0.38 (with dimples) | **2.01 – 2.47** | happy, sad and scared mouths all fit in this box |
| Scared sweat drop | +0.59 | 2.89 – 3.05 | |

Glasses: lenses centred at `(±0.24, 2.91)`, resting on the face at z ≈ +0.40. The bridge must clear the nose, which starts at y 2.67 (top 2.75) and z +0.34.

Neckline rule: any top must stay **below y ≈ 2.0** so it never covers the mouth.

To turn a face-texture pixel (canvas 512 × 608) into body space: `x = (px / 512 − 0.5) × 1.6`, `y = 3.57 − py / 608 × 1.9`.

## Torso clothes (classic outfit as a reference)

| Piece | Shape | Centre | Covers y |
|---|---|---|---|
| Shirt | box 1.50 × 0.20 × 0.70 | (0, 1.57, 0) | 1.47 – 1.67 |
| Pants | box 1.52 × 0.46 × 0.72 | (0, 1.24, 0) | 1.01 – 1.47; the black belt-loop dashes carry on over the butt at y 1.385 |
| Collar points | cones r 0.15, h 0.26 | (±0.17, 1.62, 0.37) | |
| Tie | knot 0.14 × 0.10 × 0.05, blade cone r 0.13 h 0.36, 0.23 below the knot | tie group at (0, 1.60, 0.40) | swings on a spring |
| Shoulders | spheres r 0.17, scale (1, 0.9, 1.05) | (±0.80, 1.58, 0) | |
| Butt | 2 spheres r 0.36, scale 0.72 × (1, 0.9, 0.85) | (±0.33, 1.26, −0.30) | |

The waist (shirt/pants line) is at **y = 1.47**. The sponge block's bottom is at y 1.67.

## Arms

| What | Value |
|---|---|
| Shoulder joint | (±0.84, 1.56, 0), body space |
| Arm hose radius | 0.045, ink 0.022 |
| Hand hanging | about (±1.0, 0.88, 0.12) |
| Hand swung forward | about (±1.05, 2.0, 0.55) |
| Palm | sphere r 0.088 |
| Classic sleeve | `hose(..., 0.14, 0.02, 0, 0.13)`: radius 0.14 over the first 13% of the arm |
| Princess sleeve | radius 0.07 over 0 – 0.10, plus a puff ball r 0.32 on the shoulder and a cuff ring r 0.062 |

**Hands keep out of a box** around the body: |x| < half-width + 0.2, 0.85 < y < 3.65, |z| < 0.6. A garment wider than about **x ±1.0 between y 0.85 and 1.6** (skirt, wide coat) gets hit by the hanging hands. Give it its own push-out rule, like the princess skirt does (`dressed` in `walkHose`).

## Legs and shoes

| What | Value |
|---|---|
| Hip joint | (±0.36, 1.27, 0), body space |
| Ankle | (±0.40, 0.205, z), root space. y goes up to +0.34 when the foot lifts |
| Rest leg length | 1.12 (longer at higher goofy levels) |
| Leg hose radius | 0.05, ink 0.022 |
| Pant leg | radius 0.15 over 0 – 0.27 |
| Sock | radius 0.075 over 0.62 – 1 |
| Sock stripes | red 0.66 – 0.71, blue 0.74 – 0.79, radius 0.08 |
| Shoe | sphere r 0.2 scaled (1, 0.62, 1.65): 0.40 wide, 0.25 high, 0.66 long, centre 0.08 below and 0.04 in front of the ankle, plus 0.12 forward inside the shoe group |

## Ink outlines

| Part | Outline width |
|---|---|
| Meshes on the body (`ol(mesh)`) | 0.026 |
| Clothing hoses | 0.02 |
| Skin hoses (arms, legs) | 0.022 |
| Tiara pieces | 0.016 – 0.02 |
| Skirt | 0.028 |

Leave at least the outline width between a piece and the body, or the black outline pokes through.

## Princess gown (fitted reference)

The princess skin is the first fully fitted outfit . Its numbers show what a big garment needs:

| Piece | Value |
|---|---|
| Skirt top | y **1.63** |
| Skirt profile | (radius, height below the top): (0.90, 0), (1.02, −0.20), (1.25, −0.58), (1.45, −0.98), (1.55, −1.28). Hem at y ≈ 0.35 |
| Skirt depth | front-to-back squashed to 0.6 of its width |
| Bodice | y 1.60 – 1.89, half-width 0.98, half-depth 0.58; the top is closed with a flat lid so you can't look into the dress |
| Sweetheart tops | (±0.37, 1.775, 0.38) |
| Bust | spheres r 0.24, scale (1, 0.72, 0.8) at (±0.34, 1.84, 0.45). Top at y 2.01, just under the mouth |
| Waist sash | flat ribbon 0.11 tall at y 1.60, on the bodice outline + 0.01 |
| Ruffle trim | thin tubes (r 0.03) 0.50 and 0.92 below the skirt top, following the hem wave |
| Butt | two cheeks r 0.36, scale (0.92, 0.86, 0.70) at (±0.26, 1.40, −0.50), tilted −0.15 (`BUTT.princess`) |
| Hand rule | hands kept outside skirt radius + 0.48 |

## Checklist for a new outfit

1. Put torso and head pieces in the body group, and limb pieces on hoses.
2. Check the numbers above: nothing over the eyes, nose or mouth, and the waist and shoulders line up.
3. Open the model viewer (`?developer-mode=true`, press `M`) and check goofy levels 0 and 6, the pose slider and the fall. Note the camera angle shown in the panel for every problem.
4. Turn off "Show sponge" to look at the outfit alone.
5. Add a row here for the new outfit's key sizes.

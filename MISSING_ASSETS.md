# Missing assets — Chapter 1 vertical slice

These are the assets Chapter 1 needs that the four approved production sheets do not supply cleanly. Each one is
currently covered by a fallback built from the supplied art (noted per item); nothing falls back to procedural drawing.

Conventions follow the production manifest: PNG masters with straight (unpremultiplied) alpha, sRGB, lit from the upper
left like the sheets, painted in the sheets' gouache style and palette (ivory, parchment, sandstone, terracotta, muted red,
bronze, olive, deep blue, charcoal). Sizes are pixels at 2× design scale (1 design unit = 2 px), the size needed for
sharp playback on retina screens with the camera pushed in.

---

## 1. Market stall

| | |
|---|---|
| **Files** | `assets/chapter-01/props/ch01_prop_market_stall_frame.png`, `assets/chapter-01/props/ch01_prop_market_stall_awning.png` |
| **Dimensions** | 1400 × 1100 each, on one shared registered canvas |
| **Transparency** | Yes, fully transparent background, no cast shadow baked in |
| **Visual description** | The stall from Keyframe 02 (Settlement Life). A front three-quarter view. It has four rough wooden poles, a plank table, a striped linen awning in ivory and faded terracotta with a slight sag and frayed front edge, two baskets of olives and figs on the table, and an amphora and a pithos standing beneath. |
| **Where it appears** | On the right beach, behind the trader (world x ≈ 1250, ground y ≈ 870), during the "Fishers, farmers and traders…" beat (16.6–24.6 s) and in the closing wide shot. |
| **Rigging needed** | Two layers. The frame (poles, table, goods) is static. The awning pivots along its top back edge, so code can add a slow wind sway (±1.5°) and a slight scale-Y breathing. |
| **Poses / states** | Awning `rest` plus awning `billow` (lifted by a gust) for a cross-fade. |
| **Current fallback** | A loose prop group (pithos, amphora, crate, basket) on the sand. |

## 2. Merchant ship as separate layers

| | |
|---|---|
| **Files** | `assets/global/environment/ship_merchant_hull.png`, `ship_merchant_mast.png`, `ship_merchant_sail_rest.png`, `ship_merchant_sail_full.png` |
| **Dimensions** | 2000 × 1540 each, on one shared registered canvas (same framing as the supplied `ship_merchant`) |
| **Transparency** | Yes |
| **Visual description** | The approved merchant ship (sheet 1, "merchant_ship.png"). It has a curved brown hull with a carved stern, a rail of light planks, a single mast and yard, rigging lines, and a large cream square sail with seams. The hull is painted without the sail. The mast and yard are a separate piece. The sail comes in two states: rest (slightly slack, gentle folds) and full (bellied forward with wind, highlights on the curve). |
| **Where it appears** | Crosses the bay from left to right from 4.0 to 21.5 s and is held in the closing wide shot. The same art will be reused in chapter 5. |
| **Rigging needed** | Hull: code bob and rock about the waterline (anchor at the waterline centre). Sail: pivots at the yard, cross-fades between rest and full, with a code scale-X billow about the mast. |
| **Poses / states** | Sail `rest` and `full`. Optional `furled` for the beached state. |
| **Current fallback** | The single supplied ship image, with a sail "breathe" made from a clipped copy of the same art scaled about the mast. |

## 3. Olive sapling (growth stages)

| | |
|---|---|
| **Files** | `assets/global/environment/tree_olive_sapling_01.png`, `_02.png`, `_03.png` |
| **Dimensions** | 300 × 420 each, same canvas, base anchor at bottom centre |
| **Transparency** | Yes |
| **Visual description** | A young olive tree planted in a small mound of freshly dug ochre earth. Stage 01 is a single sprig with four leaves. Stage 02 has a thin twisted stem with 3 small silver-green leaf clusters. Stage 03 is a sapling about 40 cm tall with 6–8 clusters. The style matches the sheets' olive trees: dark olive green leaves with lighter silver-green highlights, and a brown trunk. |
| **Where it appears** | Planted by the planter on the beach (x ≈ 1846) from 18.6 to 22.4 s, and visible to the end of the chapter. |
| **Rigging needed** | None. Stages swap in code with a small scale overshoot, plus a code-driven sway pivoting at the base. |
| **Poses / states** | 3 growth stages. |
| **Current fallback** | The `olive_branch` prop stood upright and scaled up from the ground. |

## 4. Gull flap cycle

| | |
|---|---|
| **File** | `assets/global/fx/birds_gull_sheet.png` (frames in one row) |
| **Dimensions** | 6 frames × 160 × 80 (sheet 960 × 80) |
| **Transparency** | Yes |
| **Visual description** | One dark charcoal gull silhouette in side view in the sheets' brush style. There are 6 frames of one wingbeat: wings high, mid-down, down, mid-up, glide, and glide-tilted. |
| **Where it appears** | Gulls crossing the sky throughout the chapter (cloud plane). |
| **Rigging needed** | None. The frames swap at 8–10 fps and code moves each bird along its path. |
| **Poses / states** | The 6-frame flap cycle. |
| **Current fallback** | Two of the supplied flock silhouettes alternate as a two-frame flap. |

## 5. Shore foam strip

| | |
|---|---|
| **File** | `assets/global/environment/shore_foam_strip.png` |
| **Dimensions** | 2048 × 128, tiles horizontally |
| **Transparency** | Yes |
| **Visual description** | Where the sea meets the sand: a band of wet darker sand fading upward, a broken line of white foam with small lace gaps, and pale turquoise shallow water at the bottom edge. It is painted in the sheets' gouache style. |
| **Where it appears** | Along the waterline of the right beach and the left headland. |
| **Rigging needed** | None. Two copies slide slowly against each other in code to animate the foam. |
| **Poses / states** | One state. Optional second variation for alternation. |
| **Current fallback** | `wave_overlay` sprites along the waterline, plus a code gradient for wet sand. |

## 6. Native-resolution versions of the large layers

The sheets are about 1500 px wide, so each large layer was cut from a 160–260 px region and upscaled ×4 by the extraction
tool (`tools/assets`). They read well, but they soften when the camera pushes in on a retina screen. The same approved art
is needed at native size. Every item below has a transparent background (sea and sand tiles excepted) and must match the
approved sheet piece exactly in content, so the slice composition stays valid.

| File | Dimensions | Transparency | Visual description (as approved) | Where it appears | Rigging | States |
|---|---|---|---|---|---|---|
| `chapter-01/backgrounds/ch01_bg_hillside_terraces.png` | 3600 × 1500 | Yes | Terraced hillside rising to one side: olive and ochre field terraces, three white houses with terracotta roofs, olive trees, a cypress | Right-hand hill behind the beach (hillside plane, parallax 0.74) | None (static) | 1 |
| `chapter-01/backgrounds/ch01_bg_settlement.png` | 1800 × 700 | Yes | Cluster of white cubic houses with terracotta roofs among olive and bush greenery on a sandy rise | Village on the hill slope (settlement plane, 0.8) | None. Chimney points marked in a note for the smoke emitters | 1 |
| `chapter-01/props/ch01_prop_mycenae_citadel.png` | 2400 × 1250 | Yes | Cyclopean-walled citadel with towers on a grey rocky summit spotted with green scrub | Mainland summit (Mycenae plane, 0.6). Labelled in the closing wide shot | None | 1 |
| `chapter-01/props/ch01_prop_crete_island_palace.png` | 2200 × 950 | Yes | Minoan palace (terraced white and ochre blocks, terracotta roofs) on a rocky island with cypresses | Left of the bay (sea plane). Labelled in the closing wide shot | None. Waterline should be soft-edged | 1 |
| `chapter-01/backgrounds/ch01_bg_beach_right.png` | 2600 × 1100 | Yes | Sandy beach rise with two olive trees, agave and a cypress at the right | Right edge of the beach | None | 1 |
| `global/environment/mountains_far_soft.png` | 6000 × 360 | Yes | Continuous range of pale lilac-blue mountains with soft ridges | Far mountain plane (0.12) | None. Tiles horizontally | 1 |
| `global/environment/sea_tile_base.png` | 4096 × 512 | No | Deep Aegean blue water with short white wave strokes, seamless in both axes | Sea plane, stacked in perspective rows | None | 1 |
| `global/environment/ground_sand_tile.png` | 2048 × 512 | No | Warm sandstone sand with sparse pebbles and dry grass flecks, seamless in both axes | Walkable beach and headland ground | None | 1 |
| `global/costumes/<costume>_torso.png` and `_skirt.png` for chiton_villager, peplos_villager, chiton_sailor, himation_merchant, himation_elite, chiton_youth | 420 × 1080 per piece, torso and skirt sharing one canvas | Yes | The six costume variations from sheet 4, painted without arms, head or legs. The skirt continues about 30 px up under the torso so the waist seam can swing | All villagers | Torso is rigid. Skirt pivots at the waist (skew/rotate in code). Anchors: neck, shoulders L/R, waist, hem | 1 each |
| `global/heads/<head>.png` for head_neutral, hair_short, hair_curls, headband, veil, hat_petasos, hat_hood, beard_long | 400 × 600 | Yes | The heads row from sheet 4 (sheet 3 for the beard): charcoal skull with hair or headwear and neck stick, facing right | All villagers | Pivot at the neck point. Skull diameter identical across the set | 1 each |

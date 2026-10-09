# Missing assets — title scene and Chapter 1

The title scene and Chapter 1 now run entirely on generated production assets (see README, "Title scene and
Chapter 1"). The items below were not generated in this pass, either to stay inside the credit budget or because
code covers them well enough for now. Each one has a working fallback. None falls back to cropped sheets or crude
procedural art.

Shared conventions:
- PNG with straight alpha, sRGB.
- Lit from the upper left, matching the approved painterly storybook style and palette.
- Generate on a native transparent background with GPT Image 2.5 (`background: transparent`). Use the canonical
  cast (`assets/global/characters/char_cast_canonical.png`) or the environment plate as the reference image.
- Run through `tools/assets/build_library.py` afterwards.

---

## 1. Market stall (Chapter 1 settlement life)

| | |
|---|---|
| **Files** | `assets/global/props/prop_stall_frame.png`, `assets/global/props/prop_stall_awning.png` (shared registered canvas) |
| **Dimensions** | 1536 × 1024 each |
| **Transparency** | Yes. No ground, no cast shadow. |
| **Description** | A small market stall in front three-quarter view. It has four rough wooden poles, a plank table with baskets of olives and figs, and an amphora and a pithos beneath. The awning is linen striped in ivory and faded terracotta, with a gentle sag and a frayed front edge. |
| **Where** | On the foreground path near the trader, during "Fishers, farmers and traders…" (16.6–24.6 s), and in the closing wide shot. |
| **Rigging** | The frame is static. The awning pivots on its back edge for a slow wind sway (±1.5°) in code. |
| **States** | Awning `rest` and `billow`. |
| **Fallback** | A loose group of crate, pithos, amphora and basket beside the planter. |

## 2. Hand-drawn pose drawings for pose swapping

| | |
|---|---|
| **Files** | `assets/global/characters/pose_<role>_<pose>.png`, for example `pose_planter_kneel.png`, `pose_carrier_walk_contact.png`, `pose_carrier_walk_passing.png`, `pose_child_sit.png` |
| **Dimensions** | 1024 × 1536 each, feet on a common baseline, same figure height as the canonical cast |
| **Transparency** | Yes |
| **Description** | The same characters as the canonical cast (same head size, same limb thickness, same costumes), drawn in the poses where a cutout rig reads stiffest: kneeling to plant, the seated child, and the walk contact and passing poses for the long walks. |
| **Where** | Chapter 1 cast. They would swap in for the rig during these actions. |
| **Rigging** | None. Whole-pose swap, 6–8 drawings per action. |
| **Fallback** | The hybrid cutout rig: 8-key-pose walk, crouch, sit, point, wave and talk poses. |

## 3. Gull flap cycle (more frames)

| | |
|---|---|
| **File** | `assets/global/fx/fx_gull_sheet.png` |
| **Dimensions** | 6 frames × 256 × 160 |
| **Transparency** | Yes |
| **Description** | One charcoal gull silhouette in the same style as `fx_gull_up` and `fx_gull_down`. One wingbeat over six frames: up, mid-down, down, mid-up, glide, glide-tilted. |
| **Where** | Gulls in the sky over the title scene and Chapter 1. |
| **Rigging** | Frame swap at 8–10 fps. |
| **Fallback** | A two-frame flap built from the two generated gulls. |

## 4. Merchant ship sail in two states

| | |
|---|---|
| **Files** | `assets/global/ships/ship_merchant_sail_full.png` (registered to `ship_merchant.png`) |
| **Dimensions** | Same canvas as `ship_merchant.png` (1959 × 1310 master) |
| **Transparency** | Yes |
| **Description** | The same square linen sail, bellied forward with wind, with highlights on the curve. |
| **Where** | The merchant ship crossing the bay. |
| **Rigging** | Cross-fade with the current sail, plus the code billow about the yard. |
| **Fallback** | The sail is isolated from the ship image and "breathes" with a small scale about the yard. |

## 5. Title-scene foreground figures, extra roles (optional)

| | |
|---|---|
| **Files** | None needed. The title scene reuses the Chapter 1 elder and child. |
| **Note** | If a different pair is wanted for the title, generate one head and one costume per role with the canonical cast as the reference image. The existing rig takes them unchanged. |

---

### Generated but not used yet (available in the library)

- `env_olive_tree_a`, `env_cypress_a`: the plates already contain painted trees. These are for later chapters.
- `env_olive_sapling_3`: the largest sapling stage. Its leaf clusters read less like olive than stages 1 and 2, so the scene stops at stage 2.
- `env_cloud_a/b/c`, `env_shrub_a`, `prop_crate` and others are in use. The full list is in `assets/library.json`.

# Ancient Greece — an animated story

A player-based animated web experience in eight chapters. It plays scene by scene like a motion storybook: press **Play**, watch, jump between chapters, scrub, pause. Scrolling is not part of the storytelling.

```bash
npm install
npm run dev        # → http://localhost:5173/
npm run build && npm run preview   # production build → http://localhost:4173/
```

**Controls** — `Space` play/pause · `←` `→` previous/next chapter · `1`–`8` jump · `R` replay chapter · `C` captions · `M` sound · `F` full screen · click the timeline to jump or scrub. Click the picture to pause.

## Chapters

| # | Chapter | Scene |
|---|---------|-------|
| I | Birth of the Greek World | Dawn over the Aegean; Minoan palace island, Mycenae on its hill, a trading ship beaching at a village |
| II | Myths and Gods | Climb through storm cloud to Olympus; Zeus hurls a bolt; Pegasus crosses; Prometheus brings fire down |
| III | The Polis | Agora, market, orator on the bema; an Aegean map of poleis; the voting circle and those left outside it |
| IV | Athens and Sparta | Split screen with a sliding divider: school, sculptor and urn vs. phalanx drill, then a shared race |
| V | The Persian Wars | Fleet → Marathon charge → Thermopylae and the flank path → Athens burning → Salamis rams |
| VI | Philosophy and Drama | Socrates, Plato, Aristotle in the grove → the theatre: chorus, masks, applause, masks come off |
| VII | Alexander | Rearing horse and pike phalanx → a parchment map; the route draws itself; Alexandrias; the successor kingdoms |
| VIII | Legacy | Ruins at sunset; Hippocrates, Euclid, Herodotus; courts and libraries; Olympic flame; a Greek question mark |

## Style Bible

**Premise** — stylised stick figures in an illustrated-history world. Figures stay simple; backgrounds carry the richness.

- **Characters** — charcoal limbs and head, white dot eyes, no facial detail. Identity comes from costume and prop: chiton, peplos, himation, hoplite helmet and crest, Persian turban, masks, lyre, scroll, trident, torch. Emotion is carried by pose and gesture.
- **Palette** — ivory `#F2E9D4`, parchment `#E8D9BC`, sandstone `#CFAF84`, terracotta `#C96B4C`, red `#8E2E27`, bronze `#8A5A2B`, olive `#5E6A3A`, deep blue `#1E3A62`, charcoal `#2A2623`. Skies shift by mood but stay inside this family.
- **Backgrounds** — layered, hazed toward the horizon, always with a sun or light source. Temples, stoas, olive groves, cypresses, ships, amphorae, theatre, ridgelines.
- **Type** — Cinzel (display, inscriptional capitals), EB Garamond (captions and copy), GFS Didot (Greek letterforms), Jost (small UI labels).
- **Motifs** — the Greek key (meander) is the timeline, the chapter-page border and the menu rule. Each chapter has a Greek letter (Α–Η) as a ghost numeral.
- **Motion** — slow camera drift with parallax, ambient life everywhere (waves, sway, drifting clouds, birds, smoke, fire), and one clear *story action* per caption beat. Chapter transitions are a parchment page that wipes across.
- **UI** — restrained: ivory controls with a blurred backing, caption over a soft scrim, bar fades after a few seconds of stillness while playing. On portrait screens the layout becomes a book page: picture on top, chapter block and caption below.
- **Avoid** — outlines, neon, realism, cartoon faces, long text blocks, anything that makes the UI louder than the art.

## How it is built

- **Stack** — Vite, vanilla JS (ES modules), SVG for all art, GSAP for timelines, Canvas 2D for particles, WebAudio for sound. No frameworks and no audio files. The title scene and Chapter 1 use generated illustrated assets (see below); chapters 2–8 are still drawn in code.
- **Assets (chapters 2–8)** — drawn in code. `src/art/` holds the generators: a jointed **figure rig** (`figure.js`, with walk/run cycles and pose library), a **horse rig** (`horse.js`, with wings for Pegasus), **props**, a **scenery library** (temples, columns, ships, mountains, sea, clouds…) and hand-simplified **map geography** (`geo.js`). Chapter thumbnails are rendered from the live scenes (`npm run thumbs`).
- **Animation** — each chapter is one paused GSAP master timeline (`src/scenes/*.js`). The player scrubs, plays and pauses that timeline, so pause/seek/replay work for free. A `Scene` (`src/engine/scene.js`) stacks SVG layers with different parallax depths under one camera, runs ambient loops from a shared clock, and renders the rigs each frame. Camera shake, lightning flashes, iris and split-screen wipes are timeline events.
- **Audio** — fully procedural (`src/engine/audio.js`): sea, wind, crowd, fire and night beds; a generative lyre in Dorian / Phrygian / Mixolydian / Hijaz modes; frame drums; one-shot cues (thunder, clash, applause, horn, gallop…) triggered from the timelines. It starts only after the first click, is muted with `M`, and the experience works without it.
- **Accessibility and robustness** — captions on by default, full keyboard control, focus rings, `aria` on the timeline and toggles, `prefers-reduced-motion` (camera shake off, fades instead of page wipe), pauses when the tab is hidden.

## Title scene and Chapter 1: generated production assets

The title scene and Chapter 1 are built from production art generated per asset. Each image holds one asset, or a small family of 2–4 widely spaced ones, generated with GPT Image 2.5 on a native transparent background. The style references are the approved sheets in `assets/_reference/`. Code places, layers and animates the art. Code also draws light and atmosphere (dawn wash, sun glow and rays, horizon haze, water glints and highlights, contact shadows), the map labels and the stick limbs.

- **Runtime scene = environment plate + transparent sprites + code animation.** Each scene has one coherent painted environment plate (`assets/chapter-01/ch01_environment_master.png`, `assets/intro/intro_environment_master.png`, 3840×1648). Plates contain no characters, no moving ship and nothing that animates on its own. Everything that moves is a separate transparent sprite: the merchant ship and its sail, boats, villagers, props, clouds, gulls, smoke and framing foliage. The painted sea is animated in code with glints and drifting highlights, clipped to a sea mask (`*_sea_mask.webp`), so no water pixels ever travel with a ship. Ships are clipped at their waterline.
- **Library** — `assets/global/{characters,heads,costumes,props,ships,environment,fx}`, `assets/chapter-01/`, `assets/intro/`. Each sprite has a lossless PNG master and a runtime WebP sized for its largest on-screen use at 2× pixel density. `assets/library.json` records sizes, anchors (neck, collar, hem, wrist, ankle, sole, base, sail yard, keel), scale and an alpha-QA record. `src/art/library.gen.js` is the generated import map. The raw generations are kept in `assets/_generated/`.
- **Pipeline** (`tools/assets/`):
  ```bash
  pip install -r tools/assets/requirements.txt
  python3 tools/assets/build_library.py   # split families, defringe, drop specks, trim, measure anchors, write masters + WebP + library.json
  python3 tools/assets/plates.py          # plate runtime WebP + sea masks
  python3 tools/assets/gen_module.py      # src/art/library.gen.js
  python3 tools/assets/alpha_qa.py check <png> <preview.png>   # halo metrics + white/black/blue composite
  ```
  Edge clean-up: every semi-transparent edge pixel takes the colour of the nearest solid pixel, so no white or black matte can survive resampling. Specks are removed. Every sprite is checked on white, black and blue backgrounds.
- **Hybrid cutout rig** (`src/art/cutout.js`) — proportions are measured from the canonical cast (`assets/global/characters/char_cast_canonical.png`). Each figure has a painted head (with hair, beard or hat), a painted costume (one image: the torso part is masked above the belt, and the skirt part skews from the waist), painted hands (open or gripping) and painted sandal feet. Arms and legs are tapered ink-brush strokes in the sampled limb colour. The walk interpolates 8 key poses with a pose-hold ease (limited-animation feel): alternating arms and legs, bent knees, heel strike and toe push-off, planted support foot, hip bob, shoulder counter-swing, head stabilisation and a lagging skirt. Poses: stand, relaxed, point, wave, talk, offer, carryHead, sit, crouch.
- **Staging helpers** (`src/art/stage.js`) — `plate()` (plate + masked water), `ship()` (waterline clip, wake), `skyLife()` (cloud drift, two-frame gull flap), `swayAll()`.
- **Missing art** — see `MISSING_ASSETS.md`.
- **Dev preview** — `/tools/preview/rig.html` shows the cast line-up and the walk cycle (`?mode=walk&c=<costume>&h=<head>`).

## Publishing as a single-file Artifact

```bash
npm run artifact            # → dist-artifact/ancient-greece.html (JS, CSS, fonts, posters and the title/Chapter 1 WebP art all inlined)
```

The artifact host allows no external loads, so the packer bundles everything into one HTML fragment (`<title>`, `<style>`, markup, one `<script>`). Storage access is guarded because the host's frame is sandboxed, and the Full screen button hides itself when fullscreen is unavailable.

## QA tooling

```bash
node tools/qa-artifact.mjs [url] [WxH]   # drives the packed build inside a strictly sandboxed iframe (storage throws, no external loads)
node tools/qa.mjs [url]     # end-to-end: title → play → pause → scrub → menu → chapters → end card
node tools/perf.mjs [url]   # scene build time, node counts, per-frame JS cost
node tools/shot.mjs <url> out.png [w h waitMs]   # one-off screenshot
node tools/filmstrip.mjs <url> out.png [from to step w h]   # contact sheet of a chapter over time
node tools/figstrip.mjs <url> <figIndex> <from> <to> <step> out.png   # crop that follows one rig figure (walk QA)
node tools/fps.mjs <url> [chapter] [w h]   # playback frame-time stats
node tools/probe.mjs <url> '[[x,y],…]'   # which images sit under given screen points
```

Handy URL parameters: `?c=5&t=20&paused=1&ui=0` opens chapter 5 paused at 20 s with the controls hidden.

# PixelLab field map candidates (volcano / cave / beach / amusement park)

All maps are 180x300 (same as the meadow field background, drawn at 2x into the 360x600 field).
Top sky strip is transparent, like the meadow background (cave is fully opaque: no sky).

| map | files | animate in code |
|---|---|---|
| volcano | volcano_1.png, volcano_2.png | `*_mask.png` = lava (river + glowing cracks) |
| cave | cave_1.png, cave_2.png | `*_mask.png` = underground pool water |
| beach | beach_1.png, beach_2.png | `*_mask.png` = sea + surf line (the pier is excluded) |
| park | park_1.png, park_2.png | none (no rides: rides are planned as shop props) |

Masks: white = area to animate, transparent elsewhere, same 180x300 grid as the map.

## How they were made
- Starting image (raw/init_<map>.png): drawn by script in the meadow layout (sky strip, top band ~rows 24-75, open ground below), pre-coloured for the concept.
- PixelLab Create image > **Pixen**, 180x300, View = High top-down, Detail = Highly detailed, Outline = Lineless, Transparent background off, Init image = the starting image.
- Init strength 350 for `_a` and 250 for `_b` (park also `_c` at 350). Picks: volcano_1=a, volcano_2=b, cave_1=a, cave_2=b, beach_1=b, beach_2=a, park_1=c, park_2=a. park_b dropped (it drew a checkerboard at the top). Raw outputs are in each raw/ folder.
- Post-process: flat grey sky fill at the top made transparent (beach_1: everything above the sea cut); masks taken from the finished picture by colour (lava = bright red/orange, water = blue/white), tiny specks removed, grown by 1px.
- preview_maps.png: top row = maps, bottom row = mask overlay (magenta).

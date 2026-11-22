# 창조의 제단 (Altar of Creation) art

- `icon.png` 32x32 key item icon (PixelLab Pro 32x32, first of 64 candidates in `raw/icon_pixellab_64.png`;
  `raw/icon_downscale.png` is a plain downscale of `full.png` kept for comparison).
- `base.png` 160x160, the altar with 17 empty plate holes.
- `plates/<type>.png` 9x11 plate pieces, one per type, the size of a hole.
- `holes.json` one entry per hole: `ty, x, y, w, h` (top-left, 160x160 coords). Clockwise from the top in
  the order fighting flying poison ground rock bug ghost steel fire water grass electric psychic ice dragon
  dark fairy (17, no normal / legend plate). Draw `plates/<ty>.png` at (x, y) to fill a hole.
- `full.png` every plate in.

How: the altar disc (white marble, gold rims, Arceus-like gold cross-wheel) is PixelLab Pro 160x160
(`raw/altar_pixellab_4.png`, 4 candidates, picked bottom-left -> `raw/altar_pixellab.png`). The holes and
plates are drawn by `make_altar.py` on the flat band between the pedestal and the inner gold ring
(centre 80,79.5, radius 50.5), so their coordinates are exact. Plate colours = the usual type colours.

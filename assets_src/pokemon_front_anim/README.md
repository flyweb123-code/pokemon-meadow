# Pokémon front idle animations (#650–1025)

- One file per species: `<dex>.png`, a horizontal strip of 80×80 frames (frame count = width / 80).
- Generated with PixelLab "Animate with Text" from the first frame of `gym/img/pk/<dex>.png`; frames with effects (sweat, water, sparkles, smoke, etc.) were removed.
- Frames are already in ping-pong order (1..N..2, no duplicated end frames) — play left to right and loop.
- 1-frame files (867, 874, 906, 916, 925, 939) are still images.
- 654 is an older 80px-high strip in the same layout.

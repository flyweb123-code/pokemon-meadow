# Gym-leader outfit field sprites (lf_*): how they were made

PixelLab web, Creator > Edit > **Transfer outfit** (Pro, 10 generations a run).
(Inpaint is not offered in Creator; Transfer outfit keeps the uploaded frames and only redresses them.)

- Outfit image: the battle front fit, `assets_src/leg_fit/front/<name>.png` (80x80).
- Images to edit: the 9 base walking frames cut from `gym/img/ow/pt_m.png` / `pt_f.png`
  (32x32 each, in game order 0..8). Output is one 96x96 3x3 sheet in the same order.
- Remove background: off (result is on white; `topost.py` removes it).
- Additional instructions: what replaces the cap/beanie and hair, the outfit, how the back
  looks, "keep every frame's pose, facing direction, head size, body size and feet position",
  "side frames face left".

Bruno, Bea, Janine: one run each with all 9 frames (raw/*_transfer.png).
Roxie: the all-9 run put the guitar in a different place per frame, so it was redone per
direction (3 frames per run: front 0,3,4 / back 1,5,6 / side 2,7,8), and back walk frames
5 and 6 take frame 1's upper body (`backfix.py`, split row 27) so head and guitar don't move.

    python3 topost.py raw/lf_bruno_m_transfer.png ../../../gym/img/ow/pt_m.png OUT/lf_bruno_m
    python3 backfix.py OUT/lf_roxie_m_t_ow9.png OUT/lf_roxie_m 27

Walking bob (2026-11-21, 경완 '걸을 때 위아래 까딱이는 느낌이 없네'): Transfer outfit did not
always raise the body 1px in walk frames (Bruno, Roxie) and redrew parts of the head
(Janine's hair). `bobfix.py` makes every walk frame 1px higher than its standing frame with the
feet kept in place, and uses the standing frame's head (rows < 19) so the head moves as one piece:

    python3 bobfix.py ../../../gym/img/fit/ow9/lf_bruno_m.png OUT/lf_bruno_m

Roxie back guitar (2026-11-21, 경완 '보미카 뒷모습 기타 방향 반대'): back frames mirrored with
`backmirror.py` (new 1 = mirror 1, 5 = mirror 6, 6 = mirror 5, moved 1px back) so the neck shows
on the left from behind, matching the right side from the front.

Blaine (lf_blaine_m, fire, 2026-11-21): battle front = Creator > Edit image (Pro) on gym/img/tr/pt_m.png
with the shop Blaine fit (gym/img/fit/blaine_m.png) as the reference image (raw/lf_blaine_m_front_c0.png);
back = same tool on gym/img/trb/pt_m.png with the new front as the reference. White background removed
by flood fill of pure white from the edges (the lab coat is off-white, so it stays). Field: Transfer
outfit with the new front as the outfit image -> topost.py -> bobfix.py
(ow/lf_blaine_m_ow9.png 288x32, ow/lf_blaine_m_ow.png 32x192; not copied into gym/img yet).

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

Kabu (lf_kabu_m) and Flannery (lf_flannery_f), fire, 2026-11-21 (경완 '남자는 카브, 여자는 민지'; Blaine not used):
same as Blaine. Kabu front had no reference image (described in the prompt: gray hair, white headband,
towel, black athletic shirt, white shorts with red trim); Flannery front used LEADER_Flannery from
"Animated Trainer Intros.zip" as the reference. Backs used the new fronts as reference. White
background removal treats >=250 in all channels as background (one result came on 255,254,255).
Picks: Flannery front c0 (c1 face less like Dawn), back c2 (c0 hair touched the top edge, c1 hair
turned orange), field transfer v2 (v1 hair so big it reached row 0).

Kabu redo (2026-11-21): the first Kabu (headband, towel, black T-shirt) did not look like the game's
Kabu; kept as raw/lf_kabu_m_*_v1 and ow/raw/lf_kabu_m_*_v1. Redone with the game sprite
(ref/ref_kabu.png, from branch claude/project-thread-wlqncg) as the Edit image reference: gray hair, no
headband, black long-sleeve top with red-orange flames, white shorts with red marks, red and white long
socks, brown shoes. Front pick c1 (c0 made him taller, hair at row 1, and changed the face); back and
field first results.

Fixes 2026-11-21 (경완: 민지 필드 머리 양쪽으로 뻗치게, 카브 배틀 키가 큼, 카브 뒷모습 팔 3개):
- Kabu battle front/back: Edit image kept making him taller (hair top row 4-5 vs the cap at 13), so
  both were redone with Transfer outfit on the 80x80 pt_m front and trb/pt_m back (outfit image = the
  flame-uniform front, raw/lf_kabu_m_front_c2.png). Result raw/lf_kabu_m_battle_transfer.png (160x80);
  front moved up 1px so the feet sit on the base row; top row 12 / 14 vs base 13. The back has only the
  arm reaching to the ball. Previous versions raw/lf_kabu_m_*_v2.png.
- Flannery field: Transfer outfit with the game's own Flannery NPC field sprite (gym/img/ow/flannery.png,
  frames 0-2, native 16x32, ref/ow_flannery_outfit.png) as the outfit image -> hair fans out to both
  sides. One hair-tip pixel at row 1 of side frame 2 removed so bobbed frames stay off row 0. Previous
  version ow/raw/lf_flannery_f_*_v2.png. (PixelLab flags upscaled uploads; give it native size.)

Fixes 2026-11-21 evening (경완: 카브 뒷모습 왼쪽 팔·흰 브릿지, 민지 필드 색·뒤/옆 걷기), all by hand/script, no PixelLab:
- Kabu back: the extra left arm (sleeve + flame cuff, x < 24..27, rows 44-71) cleared, outline kept on
  the new edge.
- Kabu white streak: streak.py recolours the gray hair on short line segments to whites. Battle front
  (34,12)-(39,19), back (37,15)-(42,21); field front bangs (11,8)-(13,12), side (12,8)-(13,12),
  back (19,7)-(20,11), walk frames the same 1px higher (they reuse the standing head).
- Flannery field: legfix.py. Side walk 7/8 legs = pt_f 7/8 legs (rows >= 25, 1px lower to match her
  standing feet) recoloured to jeans + shoes, upper body = standing frame raised 1px; back walk 5/6
  legs = pt_f 5/6 rows >= 26 (this also removes the leftover outline lines); hair and jeans remapped
  to the battle sprite's palettes by brightness order. Old versions *_v3.

Side walk fixes (2026-11-21 night, 경완: 카브 옆 걷기 등이 튀어나옴, 민지 옆 걷기 다리가 안 움직임) — sidefix.py, no PixelLab:
- Kabu 7/8: rows < 25 = standing side frame 2 raised 1px (the walk frames had the base boy's bag
  bulge on the back); legs stay.
- Flannery 2/7/8: legs drawn from pixel templates in sidefix.py (2 legs together, 7 long step,
  8 short step; black outline, battle jeans dark/mid/light, shoe colour), upper body = frame 2,
  raised 1px in 7/8. Comparison at 8x with the base frames: ow/side_walk_cmp_x8.png. Old *_v4.

Flannery field skin (2026-11-22, 경완 "민지 필드 피부색도 앞뒷모습이랑"): skinfix.py maps the field skin shades to the
battle sprite skin palette by brightness order; hair and clothes untouched. Old ow/raw/lf_flannery_f_*_v5.

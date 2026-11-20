# rf_anim — regional-form animated battle sprites

Animated GIFs for every key in `gym/img/pk/rf/rf.json` (59 keys).

- `<key>.gif` front, `b<key>.gif` back, `s<key>.gif` shiny front, `bs<key>.gif` shiny back.
- Source: EeveeExpo *Animated Pokemon Sprites* pack (`Animated Pokemon Sprites.zip`, `Graphics/Pokemon/{Front,Back,Front shiny,Back shiny}/<SPECIES>_<form>.png`), for the DBK *Animated Pokemon System* plugin.
- The pack ships horizontal PNG strips (square frames, frame size = image height). Converted losslessly to GIF with Python/Pillow: every frame kept, 1-bit transparency (pack has no semi-transparent pixels), `loop=0`, `disposal=2`.
- Frame duration follows the plugin: `round(AnimationSpeed/2 * 90)` ms (`ANIMATION_FRAME_DELAY = 90`, default speed 2 → 90 ms; per-species/form `AnimationSpeed` from the pack's `pokemon_metrics*.txt`, back uses the 1st value, front the 2nd).
- Form numbers follow Essentials v21 `pokemon_forms.txt` (+ Gen 9 Pack for Paldean Tauros/Wooper; Z-Power `pokemon_forms_pikachu_caps.txt` for Pikachu 13 = Alola Cap), and were checked visually against the pack images.
- Native pixel size (not upscaled). Some shiny strips differ in frame size/count from the normal ones (pack data): meowthalola, sandshrewalola, sandslashalola front shiny.

| key | species/form | front | back | shiny | back shiny | source | frames (F/B) | ms (F/B) |
|---|---|---|---|---|---|---|---|---|
| arcaninehisui | #59 Arcanine — Hisuian | ✓ | ✓ | ✓ | ✓ | `ARCANINE_1.png` | 102/25 | 45/45 |
| articunogalar | #144 Articuno — Galarian | ✓ | ✓ | ✓ | ✓ | `ARTICUNO_1.png` | 12/12 | 90/90 |
| avalugghisui | #713 Avalugg — Hisuian | ✓ | ✓ | ✓ | ✓ | `AVALUGG_1.png` | 124/24 | 45/45 |
| braviaryhisui | #628 Braviary — Hisuian | ✓ | ✓ | ✓ | ✓ | `BRAVIARY_1.png` | 80/66 | 45/45 |
| corsolagalar | #222 Corsola — Galarian | ✓ | ✓ | ✓ | ✓ | `CORSOLA_1.png` | 75/12 | 90/90 |
| darmanitangalar | #555 Darmanitan — Galarian Standard Mode | ✓ | ✓ | ✓ | ✓ | `DARMANITAN_2.png` | 12/10 | 90/90 |
| darmanitangalarzen | #555 Darmanitan — Galarian Zen Mode | ✓ | ✓ | ✓ | ✓ | `DARMANITAN_3.png` | 6/6 | 90/90 |
| darumakagalar | #554 Darumaka — Galarian | ✓ | ✓ | ✓ | ✓ | `DARUMAKA_2.png` | 12/10 | 90/90 |
| decidueyehisui | #724 Decidueye — Hisuian | ✓ | ✓ | ✓ | ✓ | `DECIDUEYE_1.png` | 156/156 | 90/90 |
| diglettalola | #50 Diglett — Alolan | ✓ | ✓ | ✓ | ✓ | `DIGLETT_1.png` | 53/53 | 90/90 |
| dugtrioalola | #51 Dugtrio — Alolan | ✓ | ✓ | ✓ | ✓ | `DUGTRIO_1.png` | 42/42 | 90/90 |
| electrodehisui | #101 Electrode — Hisuian | ✓ | ✓ | ✓ | ✓ | `ELECTRODE_1.png` | 64/98 | 90/45 |
| exeggutoralola | #103 Exeggutor — Alolan | ✓ | ✓ | ✓ | ✓ | `EXEGGUTOR_1.png` | 101/101 | 90/90 |
| farfetchdgalar | #83 Farfetchd — Galarian | ✓ | ✓ | ✓ | ✓ | `FARFETCHD_1.png` | 156/156 | 45/45 |
| geodudealola | #74 Geodude — Alolan | ✓ | ✓ | ✓ | ✓ | `GEODUDE_1.png` | 46/43 | 90/90 |
| golemalola | #76 Golem — Alolan | ✓ | ✓ | ✓ | ✓ | `GOLEM_1.png` | 106/106 | 90/90 |
| goodrahisui | #706 Goodra — Hisuian | ✓ | ✓ | ✓ | ✓ | `GOODRA_1.png` | 95/95 | 90/90 |
| graveleralola | #75 Graveler — Alolan | ✓ | ✓ | ✓ | ✓ | `GRAVELER_1.png` | 89/89 | 90/90 |
| grimeralola | #88 Grimer — Alolan | ✓ | ✓ | ✓ | ✓ | `GRIMER_1.png` | 18/18 | 90/90 |
| growlithehisui | #58 Growlithe — Hisuian | ✓ | ✓ | ✓ | ✓ | `GROWLITHE_1.png` | 114/24 | 90/90 |
| lilliganthisui | #549 Lilligant — Hisuian | ✓ | ✓ | ✓ | ✓ | `LILLIGANT_1.png` | 112/44 | 90/45 |
| linoonegalar | #264 Linoone — Galarian | ✓ | ✓ | ✓ | ✓ | `LINOONE_1.png` | 48/48 | 90/90 |
| marowakalola | #105 Marowak — Alolan | ✓ | ✓ | ✓ | ✓ | `MAROWAK_1.png` | 47/10 | 90/90 |
| meowthalola | #52 Meowth — Alolan | ✓ | ✓ | ✓ | ✓ | `MEOWTH_1.png` | 57/52 | 90/90 |
| meowthgalar | #52 Meowth — Galarian | ✓ | ✓ | ✓ | ✓ | `MEOWTH_2.png` | 75/75 | 90/90 |
| moltresgalar | #146 Moltres — Galarian | ✓ | ✓ | ✓ | ✓ | `MOLTRES_1.png` | 22/10 | 90/90 |
| mrmimegalar | #122 Mrmime — Galarian | ✓ | ✓ | ✓ | ✓ | `MRMIME_1.png` | 12/10 | 90/90 |
| mukalola | #89 Muk — Alolan | ✓ | ✓ | ✓ | ✓ | `MUK_1.png` | 120/120 | 90/90 |
| ninetalesalola | #38 Ninetales — Alolan | ✓ | ✓ | ✓ | ✓ | `NINETALES_1.png` | 16/16 | 90/90 |
| persianalola | #53 Persian — Alolan | ✓ | ✓ | ✓ | ✓ | `PERSIAN_1.png` | 85/85 | 90/90 |
| pikachualola | #25 Pikachu — Alolan | ✓ | ✓ | ✓ | ✓ | `PIKACHU_13.png` | 113/113 | 45/45 |
| ponytagalar | #77 Ponyta — Galarian | ✓ | ✓ | ✓ | ✓ | `PONYTA_1.png` | 41/10 | 90/90 |
| qwilfishhisui | #211 Qwilfish — Hisuian | ✓ | ✓ | ✓ | ✓ | `QWILFISH_1.png` | 110/32 | 45/45 |
| raichualola | #26 Raichu — Alolan | ✓ | ✓ | ✓ | ✓ | `RAICHU_1.png` | 108/108 | 90/90 |
| rapidashgalar | #78 Rapidash — Galarian | ✓ | ✓ | ✓ | ✓ | `RAPIDASH_1.png` | 16/18 | 90/90 |
| raticatealola | #20 Raticate — Alolan | ✓ | ✓ | ✓ | ✓ | `RATICATE_1.png` | 40/39 | 90/90 |
| rattataalola | #19 Rattata — Alolan | ✓ | ✓ | ✓ | ✓ | `RATTATA_1.png` | 53/53 | 90/90 |
| samurotthisui | #503 Samurott — Hisuian | ✓ | ✓ | ✓ | ✓ | `SAMUROTT_1.png` | 85/85 | 90/90 |
| sandshrewalola | #27 Sandshrew — Alolan | ✓ | ✓ | ✓ | ✓ | `SANDSHREW_1.png` | 63/63 | 90/90 |
| sandslashalola | #28 Sandslash — Alolan | ✓ | ✓ | ✓ | ✓ | `SANDSLASH_1.png` | 100/100 | 90/90 |
| sliggoohisui | #705 Sliggoo — Hisuian | ✓ | ✓ | ✓ | ✓ | `SLIGGOO_1.png` | 90/24 | 90/45 |
| slowbrogalar | #80 Slowbro — Galarian | ✓ | ✓ | ✓ | ✓ | `SLOWBRO_2.png` | 52/14 | 135/135 |
| slowkinggalar | #199 Slowking — Galarian | ✓ | ✓ | ✓ | ✓ | `SLOWKING_1.png` | 67/10 | 90/135 |
| slowpokegalar | #79 Slowpoke — Galarian | ✓ | ✓ | ✓ | ✓ | `SLOWPOKE_1.png` | 89/10 | 90/90 |
| sneaselhisui | #215 Sneasel — Hisuian | ✓ | ✓ | ✓ | ✓ | `SNEASEL_1.png` | 98/48 | 45/45 |
| stunfiskgalar | #618 Stunfisk — Galarian | ✓ | ✓ | ✓ | ✓ | `STUNFISK_1.png` | 12/10 | 90/135 |
| taurospaldeaaqua | #128 Tauros — Paldean Aqua Breed | ✓ | ✓ | ✓ | ✓ | `TAUROS_3.png` | 36/12 | 90/90 |
| taurospaldeablaze | #128 Tauros — Paldean Blaze Breed | ✓ | ✓ | ✓ | ✓ | `TAUROS_2.png` | 36/12 | 90/90 |
| taurospaldeacombat | #128 Tauros — Paldean Combat Breed | ✓ | ✓ | ✓ | ✓ | `TAUROS_1.png` | 69/12 | 45/90 |
| typhlosionhisui | #157 Typhlosion — Hisuian | ✓ | ✓ | ✓ | ✓ | `TYPHLOSION_1.png` | 114/56 | 45/45 |
| voltorbhisui | #100 Voltorb — Hisuian | ✓ | ✓ | ✓ | ✓ | `VOLTORB_1.png` | 45/81 | 90/45 |
| vulpixalola | #37 Vulpix — Alolan | ✓ | ✓ | ✓ | ✓ | `VULPIX_1.png` | 10/10 | 90/90 |
| weezinggalar | #110 Weezing — Galarian | ✓ | ✓ | ✓ | ✓ | `WEEZING_1.png` | 43/10 | 90/90 |
| wooperpaldea | #194 Wooper — Paldean | ✓ | ✓ | ✓ | ✓ | `WOOPER_1.png` | 32/32 | 90/90 |
| yamaskgalar | #562 Yamask — Galarian | ✓ | ✓ | ✓ | ✓ | `YAMASK_1.png` | 12/10 | 90/90 |
| zapdosgalar | #145 Zapdos — Galarian | ✓ | ✓ | ✓ | ✓ | `ZAPDOS_1.png` | 172/172 | 45/45 |
| zigzagoongalar | #263 Zigzagoon — Galarian | ✓ | ✓ | ✓ | ✓ | `ZIGZAGOON_1.png` | 91/91 | 90/90 |
| zoroarkhisui | #571 Zoroark — Hisuian | ✓ | ✓ | ✓ | ✓ | `ZOROARK_1.png` | 24/24 | 90/45 |
| zoruahisui | #570 Zorua — Hisuian | ✓ | ✓ | ✓ | ✓ | `ZORUA_1.png` | 108/24 | 45/45 |

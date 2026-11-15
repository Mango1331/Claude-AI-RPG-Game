# Statwachstum .195 – Einzelfreigaben des historischen Replays

Vergleichsbasis: Produkt-Merge `3a4ad81889c3344b8feb802124703758f5239ac5`
(Build .194). Die Originaldateien in `tests/replay/corpus` und die .126-Baseline
bleiben unverändert. Jeder unten genannte Record wurde mit derselben
produktseitigen Replayroutine auf .194 und .195 ausgeführt. Der .194-Fingerprint
wurde gegen seine bestehende Freigabe beziehungsweise die unveränderte Baseline
geprüft. Das Rücksetzen ausschließlich der benannten `favored`-Listen ergibt
jeweils den exakten .194-Record. Es wurde kein anderer Output normalisiert.

78 Records, insgesamt 82 Level-ups. Alle übrigen Events und Recordfelder sind
identisch: XP-Betrag, Schwellen, Carryover, freie Punkte, RNG, Kampf, Bossloot,
Geld, Items und Klassenentwicklung. Alle anderen akzeptierten Fingerprints
wurden unverändert übernommen. Jede Zeile besitzt einen eigenen begründeten
Fingerprint in `tests/replay/accepted_stat195_vs_126.json`.

| Record | Einzeln geprüfte Änderung und unveränderte Buchungswerte |
|---|---|
| `b16-rogue-sale#22` | Level 2: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 39 |
| `b16-rogue-sale#37` | Level 2: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 114 |
| `b16-rogue-sale#51` | Level 3: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 82 |
| `b16-rogue-sale#63` | Level 4: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 22 |
| `b16-rogue-sale#68` | Level 5: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 372 |
| `b17-mage#18` | Level 2: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 75 |
| `b17-mage#29` | Level 3: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 175 |
| `b17-mage#37` | Level 4: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 115 |
| `b17-mage#43` | Level 5: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 75 |
| `b17-mage#63` | Level 6: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 230 |
| `b17-mage#68` | Level 7: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 380 |
| `b17-mage#93` | Level 8: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 275 |
| `b17-mage#125` | Level 9: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 230 |
| `b17-mage#138` | Level 10: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 560 |
| `b17-mage#153` | Level 11: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 155 |
| `b17-mage#167` | Level 12: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 730 |
| `b17-mage#195` | Level 13: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 795 |
| `b17-mage#212` | Level 14: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 1520; Level 15: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 120 |
| `b17-rogue#22` | Level 2: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 75 |
| `b17-rogue#39` | Level 3: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 175 |
| `b17-rogue#45` | Level 4: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 175 |
| `b17-rogue#57` | Level 5: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 195 |
| `b17-rogue#85` | Level 6: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 295 |
| `b17-rogue#92` | Level 7: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 445 |
| `b17-rogue#125` | Level 8: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 340 |
| `b17-rogue#135` | Level 9: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 145 |
| `b17-rogue#151` | Level 10: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 160 |
| `b17-rogue#183` | Level 11: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 390 |
| `b17-rogue#185` | Level 11: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 390 |
| `b17-rogue#187` | Level 11: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 390 |
| `b17-rogue#213` | Level 12: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 640 |
| `b17-rogue#257` | Level 13: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 220 |
| `b17-warrior#37` | Level 2: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 190 |
| `b17-warrior#51` | Level 3: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 640; Level 4: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 340 |
| `b17-warrior#99` | Level 5: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 180 |
| `b17-warrior#109` | Level 6: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 100 |
| `b17-warrior#114` | Level 7: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 250 |
| `b17-warrior#169` | Level 8: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 385 |
| `b17-warrior#199` | Level 9: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 65 |
| `b17-warrior#214` | Level 10: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 665 |
| `b17-warrior#235` | Level 11: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 245 |
| `b17-warrior#254` | Level 12: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 1800; Level 13: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 600 |
| `b17-warrior#279` | Level 14: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 260 |
| `b17-warrior#336` | Level 15: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 90 |
| `b18-mage#20` | Level 2: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 75 |
| `b18-mage#35` | Level 3: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 115 |
| `b18-rogue#26` | Level 2: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 75 |
| `b18-rogue#61` | Level 3: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 55 |
| `b18-rogue#113` | Level 4: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 25 |
| `b18-rogue#157` | Level 5: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 10 |
| `b18-rogue#281` | Level 6: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 50 |
| `b18-warrior#32` | Level 2: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 75 |
| `b18-warrior#79` | Level 3: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 245 |
| `b18-warrior#101` | Level 4: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 255 |
| `b18-warrior#131` | Level 5: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 305 |
| `b18-warrior#153` | Level 6: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 115 |
| `b18-warrior#158` | Level 7: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 265 |
| `b18-warrior#215` | Level 8: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 40 |
| `b18-warrior#309` | Level 9: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 670 |
| `b18-warrior#314` | Level 10: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 520 |
| `b18-warrior#355` | Level 11: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 80 |
| `b19-mage#31` | Level 2: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 20 |
| `b19-mage#57` | Level 3: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 295 |
| `b19-mage#67` | Level 4: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 355 |
| `b19-mage#73` | Level 5: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 255 |
| `b19-mage#91` | Level 6: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 195 |
| `b19-mage#130` | Level 7: INT/WIL +1/+1 → 0 automatic, 5 free points, XP carryover 640 |
| `b19-rogue#32` | Level 2: AGI/PER +1/+1 → 0 automatic, 5 free points, XP carryover 90 |
| `b19-warrior#38` | Level 2: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 75 |
| `b19-warrior#69` | Level 3: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 325; Level 4: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 25 |
| `b19-warrior#101` | Level 5: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 5 |
| `b19-warrior#125` | Level 6: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 65 |
| `b19-warrior#158` | Level 7: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 690 |
| `b19-warrior#191` | Level 8: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 375 |
| `b19-warrior#289` | Level 9: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 155 |
| `b19-warrior#310` | Level 10: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 480 |
| `b19-warrior#383` | Level 11: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 420 |
| `b19-warrior#400` | Level 12: STR/VIT +1/+1 → 0 automatic, 5 free points, XP carryover 635 |

# Offline-Werkzeuge zur E–S-Balanceanalyse (Claude, 28.11.2026)

Bericht: [AVERETH_261_E_BIS_S_BALANCE_WELTMODELL_CLAUDE.md](../AVERETH_261_E_BIS_S_BALANCE_WELTMODELL_CLAUDE.md) · Ergebnisse: [ERGEBNISSE.txt](ERGEBNISSE.txt)

Alle Skripte rufen ausschließlich Produktfunktionen auf: Charaktererzeugung, XP- und Levelbuchung, Statvergabe, `itemProfile`, `scaleCreature`, `initEncounter`/`runCombat` und die NPC-Steuerung. Sie rechnen keinen Treffer selbst. Es gibt keine Modellaufrufe und keine Netzwerkzugriffe.

**Analysekopie.** Der Produktsimulator erlaubt nur die Level 1/5/10/14/15. Für beliebige Level wurde der Produktstand `.261` (`4b637c98`) in ein separates Verzeichnis exportiert. Dort wurde einzig die Wächterzeile in `tools/sim/combat.mjs` geändert:

```bash
git archive 4b637c981459e1e5ff9f4bd480bc071723fe5bce avereth-engine | tar -x -C <analyse>
```

```bash
sed -i "s/^ if(!\[1,5,10,14,15\].includes(b.level))throw Error('supported levels: 1,5,10,14,15');/ if(!Number.isInteger(b.level)||b.level<1)throw Error('level >= 1');/" <analyse>/avereth-engine/tools/sim/combat.mjs
```

**Inhaltsvarianten.** `sim_variants.mjs` erwartet zusätzlich zwei Kopien dieser Analysekopie mit je einer Content-Änderung:

- **g1:** `gear.json` `instances.e_weapon_values` = F-Waffenwerte + 4.
- **g2:** `gear.json` `rank_scaling.per_rank_index` = 0,4.

**Aufrufe.**

- Mit `<engine>`: `node <skript> <engine>`. Rohdaten schreiben `sim_matrix.mjs <engine> curve|transition|prof|style <out.json>` und `sim_threshold.mjs <engine> <out.json> typical|strong`.
- Die Druckskripte `print_*.py` lesen die JSON-Dateien im aktuellen Verzeichnis.
- `sim_party.mjs` und `sim_floor.mjs` setzen einen echten Begleiter über `state.party.members` ein (`mode: follow`, `combat: true`). Die Engine übernimmt ihn als Verbündeten.
- `sim_floor.mjs` wählt die PC-Aktion neu, wenn der Begleiter das Ziel im selben Durchlauf bereits getötet hat. Das ist ein Timing-Artefakt des Rahmens, kein Spielverhalten.

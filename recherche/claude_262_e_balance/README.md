# Offline-Werkzeuge zur Vertiefung der E-Balance (Claude, 28.11.2026)

Bericht: [AVERETH_262_CLAUDE_E_BALANCE_VERTIEFUNG_UND_ENTSCHEIDUNGSVORLAGE.md](../AVERETH_262_CLAUDE_E_BALANCE_VERTIEFUNG_UND_ENTSCHEIDUNGSVORLAGE.md) · Ergebnisse: [ERGEBNISSE.txt](ERGEBNISSE.txt)

**Analysekopie** von `.262` (`c665c59a`):

```bash
git archive c665c59a313746e165a00a5f147c1aaeff7c0452 avereth-engine | tar -x -C <analyse>
```

In `tools/sim/combat.mjs` der Analysekopie sind zwei Wächter erweitert: Level ≥ 1 statt nur 1/5/10/14/15, und E-Klasse ab Level ≥ 15 statt nur 15. Sonst bleibt das Produkt unverändert.

Für `sim_r3.mjs` gibt es zusätzliche Kopien, in denen nur `content/gear.json` → `instances.e_weapon_values` geändert ist (F + 4, F × 1,4, F × 1,5).

**Bibliothek.** `simlib.mjs` baut Figuren mit Produktfunktionen auf: `character()` mit `offerClass`/`acceptClass`, Gegenstandsprofile, Heil- und Ressourcentränke über `itemAction`, `materialise` für den Begleiter. Gekämpft wird mit `initEncounter`/`runCombat`.

Die Spielerstrategie „taktisch“ geht in dieser Reihenfolge vor:

1. Trank oder Verteidigung bei weniger als 40 % HP;
2. Ressourcentrank bei weniger als 15 % des Vorrats;
3. Flächenangriff bei zwei oder mehr Gegnern;
4. sonst der stärkste zulässige Einzelangriff auf den schwächsten bekämpfbaren Gegner.

Rast zwischen Begegnungen nutzt die Produkt-Erholungsraten (`rules.recovery`).

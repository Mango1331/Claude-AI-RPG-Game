# 10B – Monsteridentität, Anatomie und plausibles Auto-Loot
**Fachlicher Patchkandidat (Monster/Loot), KEINE Implementierungsfreigabe.**

**Historische Planungsbasis:** Build `.66`, Produkt `4cd9b338773783644a79a39f367629e6aaeead05`. Quellen: `06_PATCH10B_MASTERPLAN_UND_REVIEWS.md` §§5–7 (ChatGPT-Monsteraudit + Sol-Gegenreview), `02_DESIGN_KANON.md` §§4–5 und historische Hasen-/Doe-/Ziegen-Lootbeispiele. Der Nutzer priorisiert **zunächst echte Tests**. Dieser Entwurf darf nicht als bereits gebilligtes Monsterregelsystem ausgelegt werden.

## 1. Problem, dessen Lösung fachlich sinnvoll erscheint

Im bisherigen generischen Auto-Loot wird Material aus `content/monsters.json:loot.anchors` gewählt, aber mit dem **frei gewählten Speciesnamen** des konkreten Monsters beschriftet. Ein `hare`, das notgedrungen den `deer`-Kampfanker nutzt, kann deshalb einen **F-Rank Hare Antler** bekommen. Auch `Doe Antler` und `Goat Antler` wurden im Review als derselbe Codepfad reproduziert. Ein Käfer, Geist, Schamanen-Goblin oder Drakonisches Wesen darf einen passenden Combat-Anker wiederverwenden, aber dadurch keine frei erfundene Anatomie und nicht mechanisch verfügbare Sonderaktionen bekommen.

**Wichtig:** Die **19 Monster-Anchors sind keine 19 biologischen Körpertypen**, sondern eine Mischung aus Artvorlage, Kampfrolle, Habitat und Defence-Spezialisierung, z. B. `goblin_shaman`, `aquatic`, `armored_beast`. `src/v4/world.js` kann freie `creature.new.species` bereits persistieren; **keine** zweite verpflichtende Species-Datenbank, kein klassischer Rassenkatalog und kein großer `monsters.json`-Umbau als voreilige Antwort.

## 2. Maßgebliche Implementierungsstellen

- `src/v4/loot.js:lootEvents`: Materialmatrix nach Anchor, `speciesName`, `traits`, `object.created`-/`object.added`-Payload, `e.looted`, Gold/Ausrüstung, Rank und Menge.
- `content/monsters.json:loot.anchors`: bestehende Beutekategorien; die 19 Anchors sind **mechanische** Profile, keine Zwangs-Ökologie.
- `src/content.js:anchorFor`, `src/v4/world.js:creature.new` und `src/v4/domain.js`: Species-Alias, Profil, persistierte echte Beschreibungs-/Eigenschaftshinweise.
- `src/combat.js`: tatsächlicher Gegnerstatus `dead/fled/surrendered`, Combat-Ende und Loot-Replay; alte Loot-Events müssen stabil bleiben.

## 3. Vorschlag für einen vollwertigen, aber engen Fachpatch – erst nach Freigabe

**Phase A – evidence-first, ohne neuen Datentruthstore:** Material kann nur ausgegeben werden, wenn die bekannte oder **mechanisch belegte** Art-/Anatomieinformation es stützt. Generischer Beuteankermaterialname darf nicht allein wegen eines Kampfanker-Aliases zu `Hare Antler` umetikettiert werden. Bei unbekannter Anatomie: konservative allgemeine passende Beute oder kein spezielles Organ; diese Policy **vor Implementierung mit dem Nutzer entscheiden**, nicht stillschweigend eine globale Drop-Nerf machen.

**Phase B – Wiederkehr/Individualität:** Das tatsächlich erzeugte Monster hat eine eigene feste ID/Species/Beschreibung. Kein bei jeder erneuten Begegnung spontanes Umbenennen von Organen oder aus dem Anchor „hergeleitete“ Zauber. Wenn die existierenden persistierten Merkmale nicht reichen, **optional** nur konkrete, durch Engine/Worldcode tatsächlich verwendete Traits ergänzen – aber nicht in einem ersten Lootfix eine zweite Artregistrierung. Nicht jede freie Begegnung erzeugt permanente globale Lore.

**Phase C – später nur bei echter Nachfrage:** Sapienz, soziale Fraktionen, Ausrüstung, freie benannte Skills und Sonderwirkungen (Flug, Gift, Feueratem, Resistenz) als **eigene** mechanisch gestützte Optionen prüfen. Ein behaupteter Effekt im Narrator ersetzt nie eine ausgeführte Skill-/Statusaktion. Eine generische Engine-Kreatur muss nicht automatisch aus `sapient=false` feindselig/harmlos werden. **Kein** pauschales KI-Temperament-Redesign aus dem Lootproblem ableiten.

## 4. Geplante Regressionen und Negativkontrollen

1. `hare` mit `deer`-Combatprofil, ohne belegte Geweih-Anatomie → **kein** `Hare Antler`; Tier soll dennoch seine passende, faire Auto-Beute erhalten, wenn ausdrücklich gewünscht.
2. `doe` / gewöhnliche `goat` ohne Geweih-/Hornbeleg → kein erfundenes Geweih; fachlicher Unterschied zwischen `antler` und `horn` beachten, nicht alle Tierbeute verbieten.
3. Wirklich geweihtragender Hirsch mit belegter Anatomie → passende Beute zulässig; allgemeiner `deer`-Anchor bleibt benutzbar.
4. `goblin_shaman` erhält keine nie getragene Waffe oder erfundenen Zauber als Loot; wirklich getragenes Gear weiterhin nach bestehender Combat-Ausrüstung verteilbar.
5. Frei benannter nicht katalogisierter Monsterart mit vorhandenem Kampfanchor → Weltkreation, Kampf, Loot und Replay funktionieren; nicht durch Alias-Whitelist ausgesperrt.
6. Spirit/Slime/Insect/Dragon mit **unbekanntem** Körperbau → keine konstruierte Säugetierbeute allein wegen Statblock; kein pauschales `drop none` ohne Designfreigabe.
7. Monster besiegt, Kampf abgeschlossen → Loot **automatisch** genau einmal; kein zusätzlicher `loot corpse`-/Trophäenbeweis; späteres Re-Fold/Reload keine Double-Items.
8. Flee, Surrender, PC death, andere NPCs töten Gegner → nur nach bestehenden legitimen `lootEvents`-Gates, kein fremdes Defeat-XP.
9. Gestackte gleichartige Materialien behalten Rank, Menge, Species und Itemwert, alte Logs replayen unverändert.
10. Wiederkehrende Species-/Entityidentität bleibt stabil, aber andere Monster derselben Kategorie können narrativ verschiedene Details haben.
11. Quest-Monsterzähler verwendet Engine-Kill-Records, niemals die Namen neu generierter Trophäen als Pflichtbeweis.
12. Falls zusätzliche Traits geplant: alter Save ohne Feld und neuer mit Feld müssen deterministisch laden; Schema-/Authority-/Regenkontrollen.

## 5. Abnahme und Designentscheidung

Vor Code: explizit festlegen, was bei **unbekannter Anatomie** passiert (allgemeine Beute vs. keine spezielle Beute), welche bekannten anatomischen Hinweise verlässlich sind und wie vorhandene Loot-Stapel behandelt werden. Tests zuerst mit bestehendem `loot.js` red reproduzieren; dann einen **normalen fachlichen Lootpatch**, nicht separate Mini-Patches für Hase/Doe/Ziege. `npm test`, echte ST-Smokes, Kampfsimulator zur Qualität der Drops und anschließend mindestens ein relevanter natürlicher Kampf. **Kein** ungefragtes Nerfing aller Lootmengen/Preise/Rankwerte.

**Status:** nach beiden bisherigen Monsterreviews **Design-/Bugfixkandidat, nicht genehmigte Implementierung**. Sol darf den Plan unabhängig reviewen und Varianten empfehlen; ein Produktcommit erfordert eine ausdrückliche Entscheidung.

**Stand nach .67:** Weiterhin ein eigenständiger fachlicher Designkandidat ohne Implementierungsfreigabe. [Run 6](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/20261024-104654Z-current_test/REVIEW.md) liefert keinen gezielten Positiv-/Negativbeweis für diesen konkreten Mechanikpfad; neuen .67-Run vor Freigabe auf passende Evidenz prüfen. Kein XP-/Schadensbalancing koppeln.

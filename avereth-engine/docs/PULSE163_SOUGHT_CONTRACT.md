# .163 — PULSE A: Suchvertrag im Erzählerkontext und wortgenaue Suchzuordnung

**Basis:** `.162` / `0b45c28fb064bde3ad7dd41401b932e7901f2142`. Enger Korrekturpatch zu den beiden P2-Befunden des unabhängigen Produktdiff-Gegenreviews [`REVIEW_PULSE162_PRODUKTDIFF_SOL.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8f0d596b7d572c02f7cb7a3953795d48c55d949e/patch_plans_10b/REVIEW_PULSE162_PRODUKTDIFF_SOL.md) (R1, R2). Keine neue Mechanik, keine Parameter, kein C/B/D, keine Balance. [Paket-A-Patchnote .162](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0b45c28fb064bde3ad7dd41401b932e7901f2142/avereth-engine/docs/PULSE162_PACKAGE_A.md) bleibt maßgeblich für alles Übrige.

## R1 — der Erzähler hört dieselbe Suchausnahme, die die Firewall durchsetzt

`src/v4/envelope.js` `soughtException()`: Aus den bereits gespeicherten `auth.pulse.sought`/`auth.pulse.hunts` hängt die stehende Envelope-Regel eine kurze Ausnahme an, z. B. *„Exception he sought himself: the wild boar of Hartwood he is seeking, where he actually is may meet him and turn on him; they take nothing of his either.“*
- Nur die autorisierte Population bzw. das Vertragsziel; das Verbot für alle anderen Neuankömmlinge bleibt wörtlich bestehen.
- Reiseabschnitt zum Habitat: *„only once he has actually reached Hartwood (never on the way there)“*; Jagdauftrag: *„the wild boar of his hunt in Hartwood, while he is in their habitat“*.
- Bei offenem `danger` stehen beide Regeln nebeneinander (die eine PULSE-Gruppe und die gesuchte Zielpopulation).
- Wegnahme bleibt auch für gesuchte Kreaturen verboten. Keine neue Zustandswahrheit, kein Call; das Envelope hat ein eigenes Kontingent.

## R2 — Suchzuordnung nach ganzen Wörtern

`src/v4/pulse.js` `focusNames()` ersetzt in `searchSought()` beide unscharfen Zweige (roher Teilstring auf das letzte Artwort; beliebiges ≥4-stelliges Wort eines Vertragsziels). Eine Suche sucht eine Art nur, wenn das **Kopfnomen der Art** (ohne Partizip-Schnitt gelesen, `kindOf(…, {species: true})`) oder ein Artwort des Körperbaus **als ganzes, gestemmtes Wort** im Fokus steht, mit den Artwortgruppen des Contents (`sameKinds`). Ergebnis: `boar tracks`, `the boars`, `tracks of a wild boar`, „the next snapping turtle in the darkening pond“, `a hound` (→ dog) ja; `broken boards`, `a boardwalk`, `wild herbs`, `the wild` nein. Bei solchen Fremdsuchen entscheidet das reguläre PULSE-Fenster. Bewusst **nicht** `namesKind()`: dessen Gegenrichtung (Ziel-Kopf ∈ Artwörter) lässt „the wild“ als „wild boar“ gelten.

## Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot/Grün: Reproduktionsskript des Reviews | `.162`: alle Fehlerstand-Assertions bestehen (beide Fehler reproduziert); `.163`: scheitert an der ersten (`broken boards` → kein Kampf mehr) |
| Neue Regressionen `tests/v4/pulse_a163.test.js` | **6/6** (R2 Wortzuordnung inkl. Vertragszweig; `broken boards` am Habitat → regulärer Wurf, neuer Eberangriff abgewiesen, keine Ausnahmezeile; Positivkontrolle `boar tracks`; R1 Sucherfolg, aktiver Jagdauftrag bei geschlossenem Fenster, Reiseabschnitt vor Ankunft, ohne Suche keine Ausnahme, `danger` + Suche; Fremde bleiben abgewiesen; gesuchte und gejagte Population nur einmal genannt) |
| Vollständiges `npm test` | **2866/2866** (`.162`: 2859; +6 Regressionen, +1 Replay-Akzeptanztest) |
| Replay `npm run replay:check` | **2235** Fälle, **1040** abweichend, **alle 1040** mit exakter Ausgabe akzeptiert, **0** offen/veraltet (`accepted_pulse163_vs_126.json`): 1034 Einträge von `.162` byte-gleich; **6** `b18-rogue`-Suchrecords (#65, #71, #209, #243, #291, #295, z. B. „the next snapping turtle in the darkening pond“) werden jetzt wortgenau als gesuchter Kontakt der Mühlteich-Population erkannt (`.162` hatte sie wegen des Teilstrings `turtles` verfehlt); jedes andere Feld ist exakt die `.162`-Ausgabe. Einen falsch-positiven Fall wie `boards` gab es im Korpus nicht. |
| Echter ST1.19-Host | Standard **78/78**, Failsoft **83/83**, je **0 PageErrors**, Exit 0 |

Neue Host-Prüfung im PULSE-Smoke: User04 I79 (lokale Jagderkundung entlang der Titan-Spuren) → `auth.pulse.sought` registriert und die Ausnahme steht im **tatsächlich ausgehenden** Narratorrequest neben der Verbotsregel. Geskripteter Provider: kein Nachweis, wie oft ein freies Modell diese Ausnahme nutzt.

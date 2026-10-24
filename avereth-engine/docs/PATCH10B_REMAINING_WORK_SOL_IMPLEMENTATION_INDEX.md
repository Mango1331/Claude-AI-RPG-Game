# Avereth Engine – verbleibende 10B-Fachpakete

**Planungsstand 24.10.2026; keine Produktfreigabe.** Aktuell Build **.67**, Produktcommit [7bfb7f25](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/7bfb7f25e4d1dd2130d5f01f35a0d7c1bf880cdd): [Kampf-/Quest-XP ×2](PATCH10B_XP_REWARDS.md), nach Rundung, laut Sol 1429/1429 Node-Tests. **Noch keine natürliche .67-GLM-Abnahme**; keine zweite XP-Änderung vor dem nächsten Run. [Status auf main](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/03_AKTUELLER_PROJEKTSTAND.md) bleibt maßgeblich.

## Normale, fachlich geschlossene Patchpakete

| Paket | Umfang | Ausgangslage |
|---|---|---|
| **10B-3A: Kampfeskalation und Kampfchronik** | [Fachplan](PATCH10B3_COMBAT_ESCALATION_AND_TRUTH_PLAN.md): Bedrohung ≠ tatsächlicher Angriff; echte Ambushes und autonome NPC-Aktionen bleiben; echte Combat-Records bestimmen Treffer, Skillaktionen, Kills, Tod und Fakten/Memory. | .57 Run 1: Banditendrohung und Phantom-Arcane-Bolts; .66 Run 6: dritter Knochenhaufen ohne dritten Kill. **Erste mögliche Implementierungspriorität**. |
| **10B-3B: Gildenboard, Questversprechen und Novice-Information** | [Fachplan](PATCH10B3_GUILD_BOARD_AUTHORITY_PLAN.md): offizielle Boardlisten nur autoritativ, Tageswechsel/Status richtig, freie Privatquests erhalten, bekannte Auftrags- und Gruppenrisiken verständlich; F60-2 nur als passender enger Vertrags-Nachtrag. | .57 Runs 2/4 Phantom-Listings; .66 Run 6 positiver Cull/Proof/Payout, echte Tagesrotation, aber gefährlicher Level-1-Dungeon. **Eigenständiger großer Patch**, nicht gemeinsam mit Combat. |
| **10B-4D: Leere Narratorantworten sicher regenerieren** | [Fachplan](PATCH10B4D_NARRATOR_EMPTY_RECOVERY_PLAN.md): höchstens eine echte Host-Regeneration für denselben gebuchten Zug, Swipe/Reload/Chat-/Stop-Guards, saubere Diagnose; kein erneutes Engine-Commit. | .57 Runs 2/4 endeten leer, .66 Run 6 nicht. **Nur nach technischem ST-Host-API-Beweis**; keine improvisierte Retry-Schicht. |

**Spätere eigenständige Fachkandidaten** (ausdrückliche Designfreigabe noch offen): [Monsteridentität/Anatomie/Auto-Loot](PATCH10B_MONSTER_ANATOMY_AND_LOOT_CANDIDATE.md) mit freien Species, existierenden Ankern und ohne zweites Species-System; [Jagd/Flucht/Verfolgungs-Pacing](PATCH10B_CHASE_ESCAPE_PACING_CANDIDATE.md) über vorhandenes Chase/Rangesystem, keine zweite Bewegungssimulation. Diese Kandidaten **nicht automatisch implementieren** und nicht als Minipatches zerstückeln.

## Reihenfolge, Freigabe und Abschluss

1. **Nächsten echten .67-Run zuerst lesen:** Zeitpunkt Level 2/3, Statpunkte, Kampf- versus Quest-XP, mehrere Tage, tatsächliche Quest-/Gear-Auswahl, Gruppenrisiko, Host/Provider-Stabilität. Ein Levelaufstieg ist noch kein erwiesener Gameplay-Tempoerfolg; kein paralleler Monster-/HP-/Schadensnerf.
2. Danach **10B-3A**, **10B-3B** nach Spielerwirkung priorisieren und jeweils nur nach ausdrücklicher Nutzerfreigabe **in einem fachlich vollständigen Patch** implementieren. Neue P0-Hostfehler aus .67 gehen vor.
3. **10B-4D** nach gesichertem ST-API-Pfad bzw. neuem Narrator-Empty-Befund. Monster-/Chase-Kandidaten später mit eigener Originalevidenz und Entscheidung. Ein anderes Balance-/Progressionsdesign erst nach Messung der .67-Wirkung.
4. Fachliche Positiv- und Negativtests stehen **jeweils im verlinkten Fachplan**. Codepatch: gezielte Rot/Grün-Regressionen, vollständiges npm test, ST-Smoke bei Host-/World-Bezug, unabhängiger Diff-Review. Nachweise einmal in der bestehenden **Patchnote**, Originalrun einmal in seiner **REVIEW.md**, aktueller Status einmal in [03](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/03_AKTUELLER_PROJEKTSTAND.md); [10B-Journal](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) nur Entscheidung plus Link.

**Keine Änderung an Produktcode, Ruleset, Tests, Runner, Build oder Liveguide durch diese Planung.**

# Batch 4 – drei natürliche Guild-Runs auf Build .104

**[Ausführliche unabhängige Review](REVIEW.md)** – Schwerpunkt auf technischen Endfehlern, genauer Originalursache und Auswirkungen auf die geplante kontrollierte Fail-soft-Fortsetzung.

**[Sols Gegenprüfung der Originale und Codepfade](SOL_COUNTERREVIEW.md):** reproduzierter Stück-/Gesamtpreiswiderspruch, aus dem tatsächlichen Narrator-Kontext verdrängte Korrekturen, präzisierte C130/C131-Schemaursachen sowie echtes C2-Skilllernen und der abgewiesene Manual-Kauf T89. Keine Produktänderung.

| Profil | Run-ID | Inputs | Level | Ende |
|---|---|---:|---:|---|
| Guild-Warrior | 20261028-022553Z-current_test | **137** | **7** | Plannerfehler bei Stückpreisen/Zitaten im Verkauf |
| Guild-Mage | 20261028-032318Z-current_test | **46** | **5** | Extractorfehler durch ungültige Gasthaus-Ortsreferenzen nach unerlaubter Szenenreise |
| Guild-Rogue | 20261028-034157Z-current_test | **29** | **2** | Engine-Tod gegen vier L6/7-Wölfe |

Original-Batch **batch-20261028-022553Z.zip**, **35.467.310 Bytes**, **51 ZIP-Einträge**, CRC vollständig fehlerfrei, **SHA-256 01b297d422f8e3ac2a1bea9899e362d5ccc288af60d9ccaf41b1ab61a0443acf**.

Produkt- und Teststand **4.3.0-c.6.6.104**, Commit **b9ffa2c1bfe7**, reales GLM-5.3-Flash, ohne Stubs, ohne manuelle Stopps. Gesamt: **212 Eingaben**, **617 Modellaufrufe**, **2.998 Engine-Events**, **107 abgewiesene World-Deltas**. 21 Encounter: 20 Siege, ein gebuchter Charaktertod; neun abgeschlossene Guild-Quest-IDs. Zwei technische Enden, keine Level-15-Abnahme.

Wichtige Differenzierung: Beim Mage wird nicht bloß ein Ambient-NPC falsch erkannt; die Erzählung setzt eine **nicht gebuchte Reise, Zimmerzahlung und Schlafhandlung** voraus. Eine sichere Fail-soft-Implementierung muss diese Abhängigkeiten blockieren und trotzdem Fortsetzung ermöglichen.

**Archiv:** Die binäre Original-ZIP wurde nicht nach GitHub hochgeladen. Die Markdown-Review enthält nur ausgewertete Belege und Quellenmetadaten. **Keine Engine-, Runner-, Test- oder Balanceänderungen.**

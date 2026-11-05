Ich werte den neuen User-Test anhand von Chat, Events, Serverlog und deinem Feedback aus. Im Fokus stehen NPC-Wiedererkennung und Kontinuität sowie Stealth und UI auf .157. Danach bewerte ich, ob technische Blocker vorliegen oder wir den ersten NPC-Patch vorbereiten können.



⁨Ran⁩ ⁨⁨12⁩ commands⁩, ⁨used⁩ ⁨GitHub⁩ und explored files




Der Test läuft auf .157 und enthält bereits mehrere positive Nachweise: Registrierung, Dungeon-Clear, Abgabe und Lootverkauf wurden gebucht. Die gemeldete Etagenverwechslung prüfe ich genauer: Entscheidend ist, ob nur die Anzeige falsch liegt oder auch Gegner und Dungeon-Fortschritt betroffen sind.



Explored files und ⁨ran⁩ ⁨⁨10⁩ commands⁩




Die Etagenfrage ist jetzt eingegrenzt: Glimmerdeep besitzt im Engine-Katalog nur eine Ebene. Der Narrator erzählt trotzdem eine zweite; die Engine akzeptiert deren Räume, ordnet sie aber Ebene 1 zu und weist die zusätzlichen Gegner zurück. Das erklärt zugleich die widersprüchliche Anzeige und die fehlenden Targets. Der Spieler hat hier keinen Bedienungsfehler gemacht.

Tams Erinnerung an den Drink funktioniert dagegen auch nach dem Dungeonbesuch. Ich prüfe noch, welche Informationen er tatsächlich im Modellkontext hatte.



⁨Ran⁩ ⁨⁨7⁩ commands⁩ und explored files




Bei der Queen liegt kein zusätzlicher Gegnerzug vor: First Strike verbraucht Alarics Aktion aus Runde 1. Die schnellere Queen handelt danach in Runde 1 und nochmals zu Beginn von Runde 2, bevor Alaric wieder dran ist. Das ist regelkonform, aber offenbar nicht gut genug erklärt.

Die Finanzbuchungen sind im vorliegenden Verlauf konsistent. Beim Verkauf nennt der Narrator allerdings einen falschen Gesamtpreis: Seine Einzelpreise ergeben 199 cp, angeboten und angenommen werden 169 cp. Nach der beschlossenen Endpreisregel bucht die Engine diese 169 cp korrekt. Das ist ein Erzähl-Rechenfehler, kein Anlass für eine neue Finanzparser-Runde.



⁨Ran⁩ ⁨⁨8⁩ commands⁩




Der Verlauf lässt sich vollständig aus den gespeicherten Records rekonstruieren; dabei treten keine Fold- oder Zustandsvalidierungsfehler auf. Alle 32 Erzählantworten erreichen einen angewandten Extractor-Record, allerdings teils erst nach Recovery.

Für die Priorisierung ergibt sich damit ein klares Bild: Die Dungeon-Grenze ist der relevante technische Befund. Frühstück als Ruheaktion und die unterbrochenen Ortswechsel sind fortsetzbare Probleme. Bei NPCs bestätigt Tam, dass Erinnerung schon funktionieren kann; zugleich fehlen seine Karte und andere Szeneninformationen in einzelnen tatsächlichen Requests weiterhin. Ich dokumentiere diese Unterschiede im Runreview.
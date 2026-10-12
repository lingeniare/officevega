# Das KI-Assistenten-Panel

Jeder Editor kann das KI-Panel aufrufen: Wählen Sie etwas aus, geben Sie eine Anweisung und sehen Sie das Ergebnis Schritt für Schritt entstehen.

## Öffnen und verwenden

![Das KI-Panel in Docs](img/ai-panel.png)

- Einstiegspunkte: die **KI-Schaltfläche** im Menüband jedes Editors, **KI fragen** in den Kontextmenüs oder KI fragen in der Markierungsleiste.
- Beschreiben Sie die Aufgabe in normaler Sprache (dies umformulieren / diese Spalte in Prozent umrechnen / diese Seite neu setzen …) und drücken Sie die Eingabetaste.
- Antworten werden **gestreamt**; wenn die KI Werkzeuge braucht (Dokument lesen, bearbeiten), führt sie sie aus und macht weiter, bis die Aufgabe erledigt ist.
- **Stopp**: unterbrechen Sie den laufenden Durchgang jederzeit.
- **Warteschlange**: Während eine Antwort läuft, stellt Enter Ihre Nachricht nicht ab, sondern in die Warteschlange — ein Streifen über dem Eingabefeld zählt sie; aufklappen zum Bearbeiten, Entfernen, Umsortieren, Pausieren oder Leeren. Die nächste Nachricht sendet sich selbst, wenn der Zug endet; Esc bricht weiterhin ab.

## Was er kann

- **Docs**: umformulieren, ausbauen, übersetzen, zusammenfassen, Tabellen und Bilder einfügen, Formatierung anpassen; jeder Durchgang legt zuerst einen Snapshot an.
- **Sheets**: Formeln, Datenfüllung, Stapeltransformationen, Formatierung.
- **Slides**: Erzeugen eines kompletten Decks, Layout anpassen, Texte umformulieren.
- **PDF**: Fragen und Zusammenfassungen zum ausgewählten Text oder zu ausgewählten Seiten.
- **Markdown / HTML**: umformulieren, ausbauen, übersetzen.
- **Start ▸ Ask AI** antwortet aus Ihren markierten Dateien und nennt die Quellen — das Wissensbasis-Panel hat im Start-Kapitel einen eigenen Abschnitt, und das Docs-KI-Panel beherrscht dieselbe Fähigkeit.

## Chatverlauf

- Jede Unterhaltung wird automatisch gespeichert und bleibt auf diesem Rechner — öffnen Sie das Panel morgen wieder und machen Sie dort weiter, wo Sie aufgehört haben.
- Starten Sie einen neuen Chat mit **Neuer Chat**; zwischen früheren Chats wechseln Sie in der Verlaufsliste oben im Panel.
- Benennen Sie einen Chat um, um ihn schneller zu finden; löschen Sie ihn, um ihn endgültig zu entfernen. Das Löschen eines Chats berührt Ihre Dokumente nie.

## Eine Auswahl vor der KI verbergen

- In Slides, HTML und Markdown lässt sich eine Auswahl vor den Augen des Modells verbergen: Rechtsklick ▸ **Auswahl vor der KI verbergen**, dem Platzhalter einen Namen geben, und das Modell liest stattdessen `{{Name}}`. (Markdown aktiviert den Eintrag über den Augenaus-Schalter im Menüband; der HTML-Eintrag liegt im Quelltext-Panel.)
- Die Datei behält den echten Text — Speichern, Export und Druck bleiben unberührt, und die Markierung übersteht das erneute Öffnen. Dieselbe Menüposition hebt die Markierung auf (Markdown hat zusätzlich **Auswahl der KI wieder zeigen**).
- HTML verbirgt Elementinhalte, Attributwerte und String-Literale in Skripten; die gerenderte Seite ändert sich nie.
- Slides verbirgt auch ganze Bilder, Videos und Audiodateien; eine Folie mit verborgenem Inhalt wird nie als Screenshot gesendet: Die automatische Layoutprüfung überspringt die Seite und sagt das auch.
- Das gilt nur für die KI in der App — CLI, MCP-Tools und Headless-Export lesen die Datei direkt und sehen den Text weiterhin.

## Zurücksetzen und Sicherheit

- Das Docs-Panel führt eine **Versionsliste**: eine Momentaufnahme pro Durchgang. Sie können auf jede davon zurücksetzen, und das Zurücksetzen selbst lässt sich mit Strg+Z rückgängig machen. Momentaufnahmen bleiben erhalten, wenn Sie das Dokument erneut öffnen.
- KI-Änderungen laufen über dieselbe Bearbeitungspipeline wie manuelle Änderungen (rückgängig machbar, speicherpflichtig) — nichts umgeht Ihre Speicherbestätigung.

## Datenschutz und Anonymisierung

- Anweisungen und der betreffende Dokumentinhalt gehen an den **von Ihnen konfigurierten Modelldienst** (VEGA-Hosting oder ein eigener Endpunkt, nächstes Kapitel); ohne Konfiguration wird nichts gesendet.
- **Anonymisierung (152-FZ)**: Vor dem Senden kann die App personenbezogene Daten maskieren — Namen, Telefonnummern, E-Mail-Adressen, Passdaten —, sodass das Modell sie nie sieht. Schalten Sie das unter Einstellungen ▸ KI ein; maskierte Stellen werden im Dokument automatisch wiederhergestellt.
- **Keine Tracking-Analytik**: OfficeVega wird ohne Google Analytics oder andere Tracker von Drittanbietern ausgeliefert. Es gibt keinen Schalter für Nutzungsstatistiken, weil es nichts abzuschalten gibt — Dokumente und Chat-Inhalte verlassen nie den von Ihnen eingerichteten Weg.
- Lokale Dateien werden nirgendwo sonst hochgeladen; BYOK-Schlüssel werden in der Einstellungsdatei der App auf diesem Rechner gespeichert und nur in Anfrage-Headern gesendet.

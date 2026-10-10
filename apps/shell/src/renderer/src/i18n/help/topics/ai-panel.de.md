# Das KI-Assistenten-Panel

Jeder Editor kann das KI-Panel aufrufen: Wählen Sie etwas aus, geben Sie eine Anweisung und sehen Sie das Ergebnis Schritt für Schritt entstehen.

## Öffnen und verwenden

![Das KI-Panel in Docs](img/ai-panel.png)

- Zugang: die **KI-Schaltfläche** im Menüband jedes Editors, **KI fragen** in Kontextmenüs oder KI fragen in der Markierungsleiste.
- Beschreiben Sie die Aufgabe in einfacher Sprache (Text umschreiben / Diese Spalte in Prozent umrechnen / Diese Seite neu anordnen ...) und drücken Sie Enter.
- Antworten erscheinen **Schritt für Schritt**; braucht die KI Werkzeuge (Dokument lesen, bearbeiten), führt sie diese aus und arbeitet weiter, bis sie fertig ist.
- **Stopp**: Unterbrechen Sie den laufenden Vorgang jederzeit.

## Was er kann

- **Docs**: umschreiben, erweitern, übersetzen, zusammenfassen, Tabellen und Bilder einfügen, Formatierung anpassen; jeder Durchgang legt vorher eine Momentaufnahme an.
- **Sheets**: Formeln, Datenausfüllung, Massentransformationen, Formatierung.
- **Slides**: Erstellung ganzer Präsentationen, Layoutanpassung, Umschreiben von Texten.
- **PDF**: Fragen und Zusammenfassungen zu markiertem Text oder ausgewählten Seiten.
- **Markdown / HTML**: umschreiben, erweitern, übersetzen.

## Chatverlauf

- Jede Unterhaltung wird automatisch gespeichert und bleibt auf diesem Rechner — öffnen Sie das Panel morgen wieder und machen Sie dort weiter, wo Sie aufgehört haben.
- Starten Sie einen neuen Chat mit **Neuer Chat**; zwischen früheren Chats wechseln Sie in der Verlaufsliste oben im Panel.
- Benennen Sie einen Chat um, um ihn schneller zu finden; löschen Sie ihn, um ihn endgültig zu entfernen. Das Löschen eines Chats berührt Ihre Dokumente nie.

## Zurücksetzen und Sicherheit

- Das Docs-Panel führt eine **Versionsliste**: eine Momentaufnahme pro Durchgang. Sie können auf jede davon zurücksetzen, und das Zurücksetzen selbst lässt sich mit Strg+Z rückgängig machen. Momentaufnahmen bleiben erhalten, wenn Sie das Dokument erneut öffnen.
- KI-Änderungen laufen über dieselbe Bearbeitungspipeline wie manuelle Änderungen (rückgängig machbar, speicherpflichtig) — nichts umgeht Ihre Speicherbestätigung.

## Datenschutz und Anonymisierung

- Anweisungen und der betreffende Dokumentinhalt gehen an den **von Ihnen konfigurierten Modelldienst** (VEGA-Hosting oder ein eigener Endpunkt, nächstes Kapitel); ohne Konfiguration wird nichts gesendet.
- **Anonymisierung (152-FZ)**: Vor dem Senden kann die App personenbezogene Daten maskieren — Namen, Telefonnummern, E-Mail-Adressen, Passdaten —, sodass das Modell sie nie sieht. Schalten Sie das unter Einstellungen ▸ KI ein; maskierte Stellen werden im Dokument automatisch wiederhergestellt.
- **Keine Tracking-Analytik**: OfficeVega wird ohne Google Analytics oder andere Tracker von Drittanbietern ausgeliefert. Es gibt keinen Schalter für Nutzungsstatistiken, weil es nichts abzuschalten gibt — Dokumente und Chat-Inhalte verlassen nie den von Ihnen eingerichteten Weg.
- Lokale Dateien werden nirgendwo sonst hochgeladen; BYOK-Schlüssel werden in der Einstellungsdatei der App auf diesem Rechner gespeichert und nur in Anfrage-Headern gesendet.

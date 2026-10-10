# Schnellstart: Oberfläche und Grundlagen

OfficeVega ist ein Office-Paket, das komplett auf Ihrem Rechner läuft: ein Fenster, eine Reihe Tabs, darin sechs Editoren — Docs (Textverarbeitung), Sheets (Tabellenkalkulation), Slides (Präsentationen), PDF, Markdown und HTML. Die Dateien sind echte .docx / .xlsx / .pptx / .pdf und mit Word, Excel und PowerPoint vollständig austauschbar. Keine Netzwerkverbindung nötig.

## Überblick über die Oberfläche

![Der Startbildschirm](img/home-screen.png)

Das Fenster besteht aus drei Teilen:

- **Tab-Leiste (oben)**: Jede geöffnete Datei ist ein Tab. Der ganz links stehende Start-Tab ist immer vorhanden und lässt sich nicht schließen; die übrigen Tabs sind Ihre Dokumente. Ein Doppelklick auf einen Tab benennt die Datei direkt dort um.
- **Inhaltsbereich**: der Editor (oder der Start-Bereich), der zum aktiven Tab gehört.
- **Menüleiste**: unter Windows oben im Fenster. Die Menüs Datei, Bearbeiten und Ansicht passen sich dem aktiven Editor an.

## Ein Dokument erstellen

Eine der folgenden Möglichkeiten:

- Klicken Sie auf eine Schnellerstellungskarte im Abschnitt [Schnellstart](help://getting-started) der **Startseite** (AI Docs, AI Sheets, AI Slides, ...).
- Menü **Datei ▸ Neu**: Docs (ctrl+N), Sheets, Slides, Markdown, HTML oder PDF.
- Ziehen Sie eine Datei auf das Fenster oder doppelklicken Sie sie im Dateimanager (wenn OfficeVega die Standard-App ist).

Ein neues Dokument öffnet sich ohne Namen; die Datei auf dem Datenträger entsteht erst beim ersten Speichern.

## Dateien öffnen

- Menü **Datei ▸ Öffnen** (ctrl+O) öffnet die Systemauswahl: .docx / .doc / .xlsx / .xls / .csv / .tsv / .pptx / .ppt / .pdf / .md / .html.
- Klicken Sie auf einen Eintrag in der Liste **Zuletzt verwendet** der Startseite.
- `officevega <file>` im Terminal öffnet Dateien ebenfalls.

## Das Speichermodell

- **Manuelles Speichern**: ctrl+S oder Datei ▸ Speichern / Speichern unter. Beim ersten Speichern werden Ort und Name abgefragt.
- **AutoSpeichern** wird erst aktiv, nachdem Sie die Datei mindestens einmal manuell gespeichert haben — eine PDF, die Sie nur gelesen haben, wird nie stillschweigend überschrieben. AutoSpeichern greift kurz nach Inhaltsänderungen.
- Beim Schließen eines Tabs mit ungespeicherten Änderungen fragt die App zuerst: Speichern / Verwerfen / Abbrechen.
- Jeder Schreibvorgang erfolgt atomar (temporäre Datei plus Umbenennen), sodass ein Stromausfall keine halbe Datei hinterlässt.

## Häufige Tastenkürzel

| Aktion                 | Windows    |
| ---------------------- | ---------- |
| Neues Dokument         | ctrl+N     |
| Öffnen                 | ctrl+O     |
| Speichern              | ctrl+S     |
| Tab schließen          | ctrl+W     |
| Dieses Handbuch öffnen | F1         |
| Menüband einklappen    | Ctrl+F1    |

**Das Einklappen des Menübands** funktioniert in jedem Editor. Die Tab-Zeile bleibt, der Befehlsbereich darunter wird ausgeblendet; der ausgewählte Tab dient zugleich als Einklapp-Schalter. Solange das Menüband eingeklappt ist, ist kein Tab ausgewählt, und ein Klick auf einen Tab holt den Bereich zurück. Ein Doppelklick auf einen Tab bewirkt dasselbe. Der zuletzt gewählte Zustand wird pro Editor gespeichert.

Tastenkürzel innerhalb der einzelnen Editoren (Format übertragen, Suchen und Ersetzen, Tabellenbefehle, ...) stehen in den jeweiligen Kapiteln. Docs bietet zusätzlich einen durchsuchbaren Dialog mit Tastenkürzeln (**ctrl+/**), der alle eigenen Kombinationen vollständig auflistet.

<!--
## Die Tastenkürzel mit Option+Befehl

Option+Befehl ist die Ebene, die Word für strukturierte Sprünge reserviert; OfficeVega belegt sie genauso. Docs nutzt den größten Teil davon, Sheets belegt zwei für die Excel-Kompatibilität; ein Kürzel funktioniert überall.

**Docs**

| Kürzel (macOS)  | Wirkung                 | Windows / Linux    |
| --------------- | ----------------------- | ------------------ |
| ⌥⌘1 / ⌥⌘2 / ⌥⌘3 | Überschrift 1 / 2 / 3   | Ctrl+Alt+1 / 2 / 3 |
| ⌥⌘0             | Normal (Fließtext)      | Ctrl+Alt+0         |
| ⌥⌘M             | Absatzdialog            | Ctrl+Alt+M         |
| ⌥⌘A             | Neuer Kommentar         | Ctrl+Alt+A         |
| ⌥⌘F             | Fußnote einfügen        | Ctrl+Alt+F         |
| ⌥⌘E             | Endnote einfügen        | Ctrl+Alt+D         |
| ⌥⌘G             | Gehe zu                 | Ctrl+G             |

Zwei davon verschieben sich unter Windows, aus demselben Grund, aus dem Word sie aufteilt. **macOS belegt ⌥⌘D** — dort werden das Dock ein- und ausgeblendet —, deshalb liegt die Endnote auf dem Mac bei ⌥⌘E und überall sonst bei Ctrl+Alt+D. Und **Gehe zu** verzichtet auf Alt: Ctrl+G statt der Mac-Kombination.

**Sheets**, solange das Raster den Fokus hat

| Kürzel (macOS) | Wirkung             | Windows / Linux |
| -------------- | ------------------- | --------------- |
| ⌥⌘0            | Außenrahmen         | Ctrl+Shift+7    |
| ⌥⌘−            | Kein Rahmen         | Ctrl+Shift+−    |

Windows ist keine Neufassung des Mac-Paares. Excel für Mac bietet Sheets **beide** Varianten — ⌘⇧7 und ⌥⌘0 sind zwei Tasten für denselben Außenrahmen —, daher behält der Befehl unter Windows den Ctrl+Shift-Platz, den er schon hatte, und die Option-Ebene entfällt einfach.

Beachten Sie: **⌥⌘0 bedeutet in Docs Normal und in Sheets Außenrahmen**. Beide treten nie im selben Editor auf, im Alltag gibt es also keine Kollision; ⌥⌘0 ist aber belegt und nicht als globales Kürzel verfügbar.

**Jeder Editor**: **⌥⌘R / Ctrl+F1** klappt das Menüband ein, wie oben beschrieben.

Damit bleibt ⌥⌘D unter macOS frei, falls ein künftiger Befehl sie braucht.
-->

## Wie es weitergeht

- Wo Dateien liegen: [Der Startbildschirm](help://home-screen).
- Viele offene Dateien verwalten: [Tabs und Fensterverwaltung](help://tabs-and-windows).
- Die KI die Arbeit erledigen lassen: [Das KI-Assistenten-Panel](help://ai-panel).
- Sprache, Design, Standard-Apps: [Einstellungen, Sprache, Design und MCP-Integrationen](help://settings-integrations).

Brauchen Sie Hilfe? Fragen Sie unter [officevega.com/feedback](https://officevega.com/feedback), folgen Sie Neuigkeiten im Telegram-Kanal [t.me/getmyai](https://t.me/getmyai) oder schreiben Sie an [mail@vega.chat](mailto:mail@vega.chat).

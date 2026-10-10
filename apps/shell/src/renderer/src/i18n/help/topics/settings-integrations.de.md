# Einstellungen, Sprache, Design und MCP-Integrationen

## Einstellungen öffnen

Die Kontenzeile unten links auf der Startseite öffnet das Einstellungsfenster (ist man abgemeldet, steht dort „Anmelden“). Es hat sechs Abschnitte: Konto, KI-Modell, KI-Medien & Suche, Allgemein, Integrationen und Info.

![Einstellungen ▸ Allgemein, wo Sprache, Design und AutoSpeichern liegen](img/settings-general.png)

Die Modellkonfiguration hat einen eigenen Artikel; unter **KI-Medien & Suche** schalten Sie je Anbieter Bilderzeugung, Bildanalyse, Videoanalyse, Websuche und lokale Dateisuche ein.

## Sprache

- Die Einstellungen bieten **21 Oberflächensprachen**: Englisch, vereinfachtes Chinesisch, Japanisch, Koreanisch, Französisch, Deutsch, Spanisch, Thai, Indonesisch, Russisch, Arabisch, Portugiesisch, Italienisch, Polnisch, Tschechisch, Niederländisch, Malaiisch, Hebräisch, Hindi, traditionelles Chinesisch, Vietnamesisch.
- Der Wechsel wirkt sofort und bleibt erhalten; die native Menüleiste wird mit der neuen Sprache neu aufgebaut.

## Design

Hell / Dunkel / System. „System“ folgt dem Erscheinungsbild des Betriebssystems, und die Editoren passen sich synchron und ohne Flackern an. Der Schalter färbt auch den KI-Bereich und die Startseite um, sodass die ganze App in einem Design bleibt: Hell für helle Räume, Dunkel für Nachtarbeit, System, um Windows zu folgen.

## Allgemein

- **Keine Tracking-Analytik**: OfficeVega wird ohne Google Analytics oder andere Tracker von Drittanbietern ausgeliefert — Dokumentinhalte, Dateinamen und Nutzungsereignisse werden nie erhoben oder irgendwohin gesendet.
- **Position der KI-Seitenleiste** (links oder rechts), **Textgröße im KI-Bereich** und **Rechtschreibprüfung im KI-Chat**.
- **KI-Bereich in neuen Dokumenten öffnen** — aus: Ein neues Dokument startet mit eingeklapptem Bereich, den man mit einem Klick öffnet.
- **Alle Dokumente automatisch speichern** schaltet AutoSpeichern in jedem Editor standardmäßig ein; für ein einzelnes Fenster lässt es sich weiterhin ausschalten.
- **Speicherort** mit einer Schaltfläche **Ändern** und **Standard-App für Office-Dokumente**, um .docx / .xlsx / .pptx für OfficeVega zu beanspruchen.

## KI-Medien & Suche

Keine Schalter — jede Fähigkeit wählt den Anbieter, der sie bereitstellt, und Schlüssel sowie Basis-URL eines Anbieters werden einmal eingegeben und gemeinsam genutzt:

- **Websuche**, **Bilderzeugung**, **Bildanalyse** und **Videoanalyse**, jeweils mit Anbieter, Modell, Schlüssel und Basis-URL. Wählen Sie **VEGA** als Anbieter, um sie über `api.vega.chat` mit Ihrem Anmeldeschlüssel zu leiten.
- **Lokale Dateisuche** läuft auf diesem Rechner. Darunter ist **Jev-Neusortierung** standardmäßig **aus**. Schalten Sie sie ein, werden die Auszüge der 20 besten lokalen Treffer — bis zu 1.200 Zeichen je Dokument, dazu die Datei- und Ordnernamen — an das Jev-Modell von TypeSafe gesendet, um nach Relevanz neu sortiert zu werden. Ist sie aus, verlässt nichts das Gerät.

## Info

- **Version**, die Projektseite [officevega.com](https://officevega.com) und die Releases-Seite [officevega.com/releases](https://officevega.com/releases).
- **Update-Kanal**: Stabil oder Beta. Die Änderung wirkt sofort und prüft auf ein Update; eine Beta-Installation wird nicht zurück auf Stabil gestuft.

## Standard-App-Zuordnungen

Die Einstellungen können OfficeVega als Programm für .docx / .xlsx / .pptx / .pdf und weitere Formate registrieren (Registrierung als Standard-App auf Systemebene; bestätigen Sie die Abfrage).

## Drittanbieter-Hinweise und Updates

- Hilfe ▸ Drittanbieter-Hinweise: das vollständige Verzeichnis der mit der App ausgelieferten Open-Source-Lizenzen.
- Hilfe ▸ Nach Updates suchen: startet eine manuelle Prüfung; liegt eine neuere Version vor, werden Sie zur Installation aufgefordert.

## VEGA-Anmeldung

- Der Anmeldeeintrag (in den Einstellungen oder in der Liste der Cloud-Projekte) nutzt ein **Gerätecode**-Verfahren: OfficeVega zeigt einen Code und öffnet die Anmeldung im Browser; danach geht es automatisch weiter.
- Die Anmeldung wird nur genutzt für die Liste der Cloud-Projekte und die gehosteten Modelle von VEGA unter `api.vega.chat`. Ohne Anmeldung funktionieren alle lokalen Funktionen und eigenen Modelle weiter.
- Die Abmeldung ist in den Einstellungen ein Klick.

## Support

Fragen, Ideen und Fehlerberichte: [officevega.com/feedback](https://officevega.com/feedback), Telegram-Kanal [t.me/getmyai](https://t.me/getmyai), E-Mail [mail@vega.chat](mailto:mail@vega.chat). Entwickler: [getmyai.io](https://getmyai.io) (Dmitry Filippov).

## MCP-Integration (für Fortgeschrittene / KI-Clients)

**Integrationen** ist der Bereich, der OfficeVega mit einem Coding-Agenten verbindet, und er hat einen eigenen Artikel: Coding-Agent anbinden. Die Kurzfassung: Wählen Sie einen Weg (die Kommandozeile oder MCP), folgen Sie dessen Abschnitt und starten Sie dann einen neuen Chat, in dem Sie Ihre Frage stellen.

![Einstellungen ▸ Integrationen: die drei Schritte, dann die Skill-Zeilen und die MCP-Optionen](img/settings-integrations.png)

Unter **Lokaler HTTP-Server** kann die App den Server selbst betreiben — mit einem Aktivierungsschalter und einem Port. **Erweitert** ergänzt die Health-Check-URL und die Protokolldatei. Der Server lauscht nur auf localhost.

## Befehlszeilen-Spickzettel

| Befehl             | Wirkung                       |
| ------------------ | ----------------------------- |
| `officevega <file>` | eine Datei öffnen            |
| `officevega mcp`    | den lokalen MCP-Server starten |
| `officevega --help` | alle Befehle und Optionen    |

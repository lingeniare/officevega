# Snel aan de slag: de interface en de basis

OfficeVega is een kantoorsuite die volledig op je eigen computer draait: één venster, één rij tabbladen, met zes editors — Docs (tekstverwerking), Sheets (spreadsheets), Slides (presentaties), PDF, Markdown en HTML. De bestanden zijn echte .docx / .xlsx / .pptx / .pdf-bestanden, volledig uitwisselbaar met Word, Excel en PowerPoint. Er is geen netwerk nodig.

## Overzicht van de interface

![Het startscherm](img/home-screen.png)

Het venster bestaat uit drie delen:

- **Tabbladenbalk (boven)**: elk geopend bestand is een tabblad. Het meest linkse Home-tabblad is er altijd en kan niet worden gesloten; de andere tabbladen zijn je documenten. Dubbelklik op een tabblad om de bestandsnaam ter plekke te wijzigen.
- **Inhoudsgebied**: de editor (of Home) die bij het actieve tabblad hoort.
- **Menubalk**: bovenaan het venster op Windows. De menu's File / Edit / View passen zich aan aan de actieve editor.

## Een document maken

Kies een van de volgende manieren:

- Klik op een snelmaakkaart in het onderdeel [Quick start](help://getting-started) op **Home** (AI Docs, AI Sheets, AI Slides, ...).
- Menu **File ▸ New**: Docs (ctrl+N), Sheets, Slides, Markdown, HTML of PDF.
- Sleep een bestand naar het venster, of dubbelklik erop in je bestandsbeheer (als OfficeVega de standaardapp is).

Een nieuw document opent zonder titel; het bestand op schijf wordt pas aangemaakt bij het eerste opslaan.

## Bestanden openen

- Menu **File ▸ Open** (ctrl+O) opent de systeemkiezer: .docx / .doc / .xlsx / .xls / .csv / .tsv / .pptx / .ppt / .pdf / .md / .html.
- Klik op een willekeurig item in de lijst **Recent** op Home.
- Ook `officevega <file>` in een terminal opent bestanden.

## Het opslagmodel

- **Handmatig opslaan**: ctrl+S, of File ▸ Save / Save As. Bij het eerste opslaan wordt om locatie en naam gevraagd.
- **Automatisch opslaan** gaat pas aan nadat je het bestand minstens één keer handmatig hebt opgeslagen — een PDF die je alleen hebt gelezen wordt nooit stilletjes overschreven. Automatisch opslaan gebeurt kort nadat de inhoud is gewijzigd.
- Een tabblad met niet-opgeslagen wijzigingen sluiten vraagt eerst om Save / Discard / Cancel.
- Elke schrijfactie is atomair (tijdelijk bestand + hernoemen), zodat een stroomstoring nooit een half bestand achterlaat.

## Veelgebruikte sneltoetsen

| Actie                   | Windows |
| ----------------------- | ------- |
| Nieuw document          | ctrl+N  |
| Openen                  | ctrl+O  |
| Opslaan                 | ctrl+S  |
| Tabblad sluiten         | ctrl+W  |
| Deze handleiding openen | F1      |
| Het lint samenvouwen    | Ctrl+F1 |

**Het lint samenvouwen** werkt in elke editor. De tabbalk blijft staan en de opdrachtbalk eronder verdwijnt. Het geselecteerde tabblad dient tegelijk als bedieningselement om het lint samen te vouwen; zolang het lint is samengevouwen, is er geen tabblad geselecteerd, en wie op een tabblad klikt, haalt de balk terug. Een dubbelklik op een tabblad doet hetzelfde. De stand waarin je het hebt achtergelaten, wordt per editor onthouden.

Sneltoetsen binnen elke editor (opmaakkwast, zoeken en vervangen, tabelbewerkingen, ...) staan in de bijbehorende hoofdstukken. Docs heeft bovendien een doorzoekbaar venster met sneltoetsen (**ctrl+/**) dat alle sneltoetsen van Docs bevat.

<!--
## De Option+Command-sneltoetsen

Option+Command is de laag die Word reserveert voor gestructureerde sprongen, en OfficeVega vult die op dezelfde manier. Docs neemt het grootste deel ervan in beslag, Sheets neemt er twee voor zichzelf om met Excel gelijk te blijven; één sneltoets werkt overal.

**Docs**

| Sneltoets (macOS) | Wat het doet        | Windows / Linux    |
| ----------------- | ------------------- | ------------------ |
| ⌥⌘1 / ⌥⌘2 / ⌥⌘3   | Kop 1 / 2 / 3       | Ctrl+Alt+1 / 2 / 3 |
| ⌥⌘0               | Standaardtekst      | Ctrl+Alt+0         |
| ⌥⌘M               | Alineavenster       | Ctrl+Alt+M         |
| ⌥⌘A               | Nieuwe opmerking    | Ctrl+Alt+A         |
| ⌥⌘F               | Voetnoot invoegen   | Ctrl+Alt+F         |
| ⌥⌘E               | Eindnoot invoegen   | Ctrl+Alt+D         |
| ⌥⌘G               | Ga naar             | Ctrl+G             |

Twee daarvan veranderen op Windows, om dezelfde reden waarom Word ze opsplitst. **macOS gebruikt ⌥⌘D** — die toont en verbergt het Dock —, waardoor de eindnoot op de Mac ⌥⌘E is en overal elders Ctrl+Alt+D. En **Ga naar** laat Alt vallen: Ctrl+G, terwijl de Mac-sneltoets die wel bevat.

**Sheets**, zolang het raster de focus heeft

| Sneltoets (macOS) | Wat het doet | Windows / Linux |
| ----------------- | ------------ | --------------- |
| ⌥⌘0               | Buitenranden | Ctrl+Shift+7    |
| ⌥⌘−               | Geen rand    | Ctrl+Shift+−    |

Windows is geen herschrijving van het Mac-paar. Excel voor Mac geeft Sheets **beide** — ⌘⇧7 en ⌥⌘0 zijn twee toetsen voor dezelfde buitenranden —, dus op Windows houdt het commando de Ctrl+Shift-plek die het al had, en de Option-laag ontbreekt gewoon.

Let op: **⌥⌘0 betekent Standaard in Docs en Buitenranden in Sheets**. Ze komen nooit in dezelfde editor voor, dus in het gebruik botst er niets, maar ⌥⌘0 is al bezet en is niet beschikbaar als globale sneltoets.

**Elke editor**: **⌥⌘R / Ctrl+F1** vouwt het lint samen, zoals hierboven beschreven.

Daarmee blijft ⌥⌘D vrij voor OfficeVega om op macOS te gebruiken, als een toekomstig commando hem nodig heeft.
-->

## Waar nu heen

- Waar je bestanden staan: [Het startscherm](help://home-screen).
- Veel geopende bestanden beheren: [Tabbladen en vensterbeheer](help://tabs-and-windows).
- Het werk door de AI laten doen: [Het AI-assistentpaneel](help://ai-panel).
- Taal, thema, standaardapps: [Instellingen, taal, thema en MCP-integraties](help://settings-integrations).

Hulp nodig? Vraag het op [officevega.com/feedback](https://officevega.com/feedback), volg het nieuws in het Telegram-kanaal [t.me/getmyai](https://t.me/getmyai), of schrijf naar [mail@vega.chat](mailto:mail@vega.chat).

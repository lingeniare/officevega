# Het AI-assistentpaneel

Elke editor kan het AI-paneel oproepen: selecteer iets, geef een instructie en bekijk het resultaat terwijl het verschijnt.

## Openen en gebruiken

![Het AI-paneel in Docs](img/ai-panel.png)

- Manieren om te beginnen: de **AI-knop** op het lint van elke editor, **Vraag AI** in contextmenu's, of Vraag AI op de markeringsbalk.
- Beschrijf de taak in gewone taal (herschrijf dit / maak van deze kolom percentages / herschik deze pagina...) en druk op Enter.
- Antwoorden verschijnen **terwijl ze worden gegenereerd**. Heeft de AI hulpmiddelen nodig (het document lezen, het bewerken), dan voert hij die uit en gaat hij door tot hij klaar is.
- **Stop**: onderbreek de huidige beurt op elk moment.

## Wat het kan

- **Docs**: herschrijven, uitbreiden, vertalen en samenvatten; tabellen en afbeeldingen invoegen; opmaak aanpassen. Elke beurt maakt eerst een momentopname.
- **Sheets**: formules, gegevens invullen, bulktransformaties, opmaak.
- **Slides**: de hele presentatie genereren, de indeling bijstellen, teksten herschrijven.
- **PDF**: vragen en antwoorden en samenvattingen op basis van geselecteerde tekst of pagina's.
- **Markdown / HTML**: herschrijven, uitbreiden, vertalen.

## Gespreksgeschiedenis

- Elk gesprek wordt automatisch opgeslagen en blijft op deze computer staan — open het paneel morgen en ga verder waar je gebleven was.
- Begin een nieuw gesprek met **New chat**, en wissel tussen eerdere gesprekken in de geschiedenislijst bovenaan het paneel.
- Hernoem een gesprek om het sneller terug te vinden; verwijder het om het definitief te wissen. Een gesprek verwijderen raakt je documenten nooit aan.

## Terugdraaien en veiligheid

- Het paneel van Docs houdt een **versielijst** bij: één momentopname per beurt. Je kunt naar elke versie teruggaan, en die terugzet is zelf met Ctrl+Z ongedaan te maken. Momentopnamen blijven bewaard als je het document opnieuw opent.
- AI-bewerkingen lopen via dezelfde bewerkingsroute als handmatige bewerkingen (ongedaan te maken, pas vastgelegd bij opslaan) — niets slaat je opslagbevestiging over.

## Privacy en anonimisering

- Instructies en de relevante documentinhoud gaan naar de **modelservice die je hebt ingesteld** (VEGA gehost of een eigen eindpunt, volgend hoofdstuk). Zonder instelling wordt er niets verstuurd.
- **Anonimisering (152-FZ)**: voordat er iets wordt verzonden, kan de app persoonsgegevens maskeren — namen, telefoonnummers, e-mailadressen, paspoortgegevens — zodat het model ze nooit ziet. Zet dit aan in Settings ▸ AI; gemaskeerde gedeelten worden na het antwoord automatisch in je document hersteld.
- **Geen tracking-analyse**: OfficeVega wordt zonder Google Analytics en zonder enige tracker van derden geleverd. Er is geen schakelaar voor gebruiksstatistieken, omdat er niets is om uit te zetten — documentinhoud en chats verlaten nooit de route die je hebt ingesteld.
- Lokale bestanden worden nergens anders heen geüpload; BYOK-sleutels worden opgeslagen in het instellingenbestand van de app op deze computer en alleen in aanvraagheaders verzonden.

# Instellingen, taal, thema en MCP-integraties

## Instellingen openen

De accountregel linksonder op Home opent het instellingenpaneel (als je niet bent aangemeld, staat er Sign in). Het paneel heeft zes secties: Account, AI Model, AI Media & Search, General, Integrations en About.

![Settings ▸ General, waar taal, thema, automatisch opslaan en de schakelaar voor gebruiksstatistieken staan](img/settings-general.png)

Modelconfiguratie heeft een eigen artikel. Onder **AI Media & Search** schakel je per provider beeldgeneratie, afbeeldingsanalyse, videoanalyse, webzoeken en het zoeken in lokale bestanden in.

## Taal

- De instellingen bieden **21 interfacetalen**: Engels, vereenvoudigd Chinees, Japans, Koreaans, Frans, Duits, Spaans, Thais, Indonesisch, Russisch, Arabisch, Portugees, Italiaans, Pools, Tsjechisch, Nederlands, Maleis, Hebreeuws, Hindi, traditioneel Chinees en Vietnamees.
- Wisselen gebeurt meteen en blijft bewaard; de systeemmenubalk wordt in de nieuwe taal opnieuw opgebouwd.

## Thema

Licht / Donker / Systeem. Systeem volgt het uiterlijk van het besturingssysteem en de editors passen zich mee aan, zonder flikkeren. Dezelfde schakelaar kleurt ook het AI-paneel en het startscherm, zodat de hele app één ontwerp houdt: kies Licht voor lichte ruimtes, Donker voor nachtelijk werk en Systeem om Windows te volgen.

## Algemeen

- **Geen tracking-analyse**: OfficeVega wordt zonder Google Analytics en zonder enige tracker van derden geleverd — documentinhoud, bestandsnamen en gebruiksgebeurtenissen worden nooit verzameld of ergens naartoe gestuurd.
- **Positie AI-zijbalk** (links of rechts), **Tekstgrootte AI-paneel** en **Spellingcontrole in AI-chat**.
- **AI-paneel openen in nieuwe documenten** — uit: een nieuw document begint met het paneel ingeklapt, één klik verderop.
- **Alle documenten automatisch opslaan** zet AutoSave standaard aan in elke editor; je kunt het voor één venster nog uitschakelen.
- **Opslaglocatie** met de knop **Change** en **Default app for Office documents** om .docx / .xlsx / .pptx aan OfficeVega toe te kennen.

## AI Media & Search

Geen schakelaars — elke functie kiest de provider die haar levert, en de sleutel en basis-URL van een provider vul je één keer in en worden gedeeld:

- **Web search**, **Image generation**, **Image analysis** en **Video analysis**, elk met een provider, een model, een sleutel en een basis-URL. Kies **VEGA** als provider om ze via `api.vega.chat` te laten lopen met je aanmeldsleutel.
- **Local file search** draait op deze computer. Daaronder staat **Jev search reranking**, dat **standaard uit** staat. Zet je het aan, dan worden de fragmenten van de 20 beste lokale resultaten — tot 1.200 tekens per document, plus de bestands- en mapnamen — naar het Jev-model van TypeSafe gestuurd om op relevantie te worden herordend. Staat het uit, dan verlaat er niets dit apparaat.

## Over

- **Version**, de projectsite [officevega.com](https://officevega.com) en de releasepagina [officevega.com/releases](https://officevega.com/releases).
- **Update Channel**: Stable of Beta. Wijzigen gaat meteen in en controleert op een update; een Beta-installatie wordt niet teruggezet naar Stable.

## Koppelen als standaardapp

Via de instellingen kun je OfficeVega registreren als app voor .docx / .xlsx / .pptx / .pdf en vergelijkbare bestanden (registratie van de standaardapp op systeemniveau; bevestig als het systeem daarom vraagt).

## Kennisgevingen van derden en updates

- Help ▸ Third-party notices: het volledige overzicht van opensourcelicenties dat bij de app wordt geleverd.
- Help ▸ Check for updates: start een handmatige controle; bij een nieuwere versie wordt gevraagd die te installeren.

## Aanmelden bij VEGA

- Het aanmeldpunt (in de instellingen of in de lijst met cloudprojecten) gebruikt een **apparaatcode**-flow: OfficeVega toont een code en opent de aanmeldpagina in de browser; daarna gaat het automatisch verder.
- Aanmelden wordt alleen gebruikt voor de lijst met cloudprojecten en de modellen van VEGA die op `api.vega.chat` draaien. Zonder aanmelden blijven alle lokale functies en eigen modellen werken.
- Afmelden kan met één klik in de instellingen.

## Ondersteuning

Vragen, ideeën en bugmeldingen: [officevega.com/feedback](https://officevega.com/feedback), Telegram-kanaal [t.me/getmyai](https://t.me/getmyai), e-mail [mail@vega.chat](mailto:mail@vega.chat). Ontwikkelaar: [getmyai.io](https://getmyai.io) (Dmitri Filippov).

## MCP-integratie (voor gevorderde gebruikers / AI-clients)

**Integrations** is het paneel dat OfficeVega met een coding agent verbindt, en daarvoor is er een eigen artikel: Een coding agent verbinden. In het kort: kies een route (de opdrachtregel of MCP), volg dat onderdeel, start daarna een nieuw gesprek en stel je vraag.

![Settings ▸ Integrations: de drie stappen, daarna de skill-rijen en de MCP-opties](img/settings-integrations.png)

Onder **Lokale HTTP-server** kan de app de server ook zelf draaien — een inschakelschakelaar en een poort. **Geavanceerd** voegt de URL voor de statuscontrole en het logbestand toe. De server luistert alleen op localhost.

## Opdrachtregel in één oogopslag

| Opdracht              | Wat het doet                 |
| --------------------- | ---------------------------- |
| `officevega <file>`   | opent een bestand            |
| `officevega mcp`      | start de lokale MCP-server   |
| `officevega --help`   | alle opdrachten en opties    |

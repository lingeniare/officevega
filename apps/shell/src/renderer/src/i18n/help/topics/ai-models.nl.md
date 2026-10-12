# AI-modellen en instellingen

## Providers en modellen

Modellen en sleutels stel je in via Instellingen (de accountregel linksonder op Home):

![Het venster Instellingen](img/settings-general.png)

- **VEGA op zijn servers**: meld je aan (met de apparaatcode-flow) en gebruik het — zonder configuratie. Verzoeken gaan naar `https://api.vega.chat`, een OpenRouter-compatibel eindpunt, dus elke client in OpenRouter-stijl kan ermee verbinden.
- **Eigen eindpunten (BYOK)**: Instellingen ▸ AI-model vraagt een basis-URL en een API-sleutel per protocol — OpenAI-compatibel, Anthropic, Gemini, DeepSeek, DashScope (qwen) en meer. Sleutels worden opgeslagen in het instellingenbestand van de app op deze machine en alleen in aanvraagheaders verzonden. Atlas Cloud behoort tot de ingebouwde protocollen.
- Per functie kun je een ander model kiezen: chat/genereren, afbeeldingen genereren, afbeeldingsanalyse.
- **Verbinding testen**: controleert vóór het opslaan of het eindpunt bereikbaar is en of het model zichtbaar is.
- Basis-URL's mogen een pad en een querystring bevatten (gateway-stijl); eindpuntpaden worden correct toegevoegd.

## Een model kiezen

- De modelkiezer staat bovenaan het AI-paneel en in Instellingen ▸ AI Model — één keuze voor chat, plus aparte keuzes voor afbeeldingen genereren en afbeeldingsanalyse waar de provider die ondersteunt.
- Begin met het standaard VEGA-model: het past bij de meeste kantoortaken (herschrijven, tabellen, formules, samenvattingen). Ga naar een groter model voor moeilijk redeneerwerk of lange documenten, en naar een kleiner, goedkoper model voor snelle concepten.
- Een lopend gesprek houdt het oude model tot de volgende beurt; nieuwe gesprekken gebruiken meteen de nieuwe keuze.

## Prijzen en gebruik

- VEGA-facturering is pay-as-you-go per model. De volledige prijslijst staat op [api.vega.chat/aimodels](https://api.vega.chat/aimodels) — controleer de in- en uitvoerprijs van een model vóór een grote klus.
- Het huidige saldo en de uitgaven staan op het [VEGA-dashboard](https://api.vega.chat/dashboard), dat je ook opent vanuit de saldoregel in het accountmenu.
- Zonder aanmelding werken alleen de gratis ingebouwde opties; meld je aan om elk model op de prijslijst te ontgrendelen.

## CLI-integratie (Codex-klasse)

- Instellingen accepteren het pad naar een lokaal CLI-programma (niet-ASCII-thuismappen en een ~-voorvoegsel werken; ~ wordt automatisch uitgebreid). Modellen detecteren vraagt de CLI welke modellen beschikbaar zijn.
- De validatie controleert alleen of het bestand bestaat — geen beperkingen op de tekenset.

## Wanneer wijzigingen ingaan

- Wijzigingen aan model en eindpunt gaan meteen in; een lopend gesprek houdt de oude configuratie tot de volgende beurt.

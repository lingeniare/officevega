# Modely AI a nastavení

## Poskytovatelé a modely

Modely a klíče se nastavují v Nastavení (řádek účtu vlevo dole na domovské stránce):

![Okno Nastavení](img/settings-general.png)

- **VEGA na jeho serverech**: přihlaste se (postupem s kódem zařízení) a používejte — bez jakéhokoli nastavení. Požadavky směřují na `https://api.vega.chat`, což je koncový bod kompatibilní s OpenRouterem, takže se k němu může připojit libovolný klient ve stylu OpenRouteru.
- **Vlastní koncové body (BYOK)**: Settings ▸ AI přijímá základní URL a klíč API pro každý protokol — kompatibilní s OpenAI, Anthropic, Gemini, DeepSeek, DashScope (qwen) a dalšími. Klíče se ukládají do souboru nastavení aplikace na tomto počítači a odesílají se pouze v hlavičkách požadavků.
- Pro každou schopnost lze zvolit jiný model: chat a generování, generování obrázků, analýza obrázků.
- **Test připojení**: před uložením ověří dostupnost koncového bodu a viditelnost modelu.
- Základní URL může obsahovat cestu a dotaz (ve stylu brány); cesty koncových bodů se správně připojují.

## Výběr modelu

- Výběr modelu je nahoře v panelu AI a v Settings ▸ AI Model — jedna volba pro chat a samostatné volby pro generování obrázků a analýzu obrázků tam, kde je poskytovatel podporuje.
- Začněte výchozím modelem VEGA: hodí se pro většinu kancelářských úkolů (přepisování, tabulky, vzorce, shrnutí). Pro náročné uvažování nebo dlouhé dokumenty přejděte na větší model, pro rychlé koncepty na menší a levnější.
- Probíhající konverzace si ponechá původní model až do svého dalšího kroku; nové chaty hned použijí nový výběr.

## Ceny a využití

- Účtování VEGA je pay-as-you-go podle modelu. Úplný ceník je na [api.vega.chat/aimodels](https://api.vega.chat/aimodels) — před velkou úlohou zkontrolujte cenu vstupu a výstupu modelu.
- Aktuální zůstatek a výdaje jsou na [přehledu VEGA](https://api.vega.chat/dashboard), který se otevírá také z řádku zůstatku v nabídce účtu.
- Bez přihlášení fungují jen bezplatné vestavěné možnosti; přihlaste se, abyste odemkli všechny modely z ceníku.

## Integrace CLI (třída Codex)

- Nastavení přijímá cestu k místnímu programu CLI (domovské složky s neASCII znaky a předpona ~ fungují; ~ se rozbalí automaticky). Tlačítko **Zjistit modely** se dotáže CLI na dostupné modely.
- Ověření kontroluje pouze existenci souboru — žádné omezení znakové sady.

## Kdy se změny projeví

- Změny modelu a koncového bodu platí okamžitě; probíhající konverzace si drží původní nastavení až do svého dalšího kroku.

# Nastavení, jazyk, motiv a integrace MCP

## Otevření nastavení

Řádek účtu vlevo dole na domovské stránce otevře panel nastavení (když nejste přihlášeni, zobrazuje Sign in). Má šest částí: Account, AI Model, AI Media & Search, General, Integrations a About.

![Settings ▸ General, kde jsou jazyk, motiv, AutoSave a přepínač statistik používání](img/settings-general.png)

Konfigurace modelů má vlastní článek. V části **AI Media & Search** zapínáte pro každého poskytovatele generování obrázků, analýzu obrázků, analýzu videa, webové vyhledávání a hledání místních souborů.

## Jazyk

- Nastavení nabízí **21 jazyků rozhraní**: angličtina, zjednodušená čínština, japonština, korejština, francouzština, němčina, španělština, thajština, indonéština, ruština, arabština, portugalština, italština, polština, čeština, nizozemština, malajština, hebrejština, hindština, tradiční čínština a vietnamština.
- Změna se projeví okamžitě a zůstane zachována; nativní pruh nabídek se znovu sestaví v novém jazyce.

## Motiv

Light / Dark / System. Volba System sleduje vzhled operačního systému a editory se přebarví současně, bez blikání. Stejný přepínač obarvuje také panel AI a domovskou stránku, takže celá aplikace zůstává v jednom designu: Light pro světlé místnosti, Dark pro práci v noci a System pro sledování Windows.

## Obecné

- **Žádná sledovací analytika**: OfficeVega se dodává bez Google Analytics a bez jakéhokoli sledovacího nástroje třetí strany — obsah dokumentů, názvy souborů a události používání se nikdy neshromažďují ani nikam neodesílají.
- **Pozice postranního panelu AI** (vlevo nebo vpravo), **Velikost textu panelu AI** a **Kontrola pravopisu v chatu AI**.
- **Otevírat panel AI v nových dokumentech** — vypnuto: nový dokument začíná se složeným panelem, který je na jedno kliknutí.
- **Automaticky ukládat všechny dokumenty** zapne ve výchozím stavu automatické ukládání v každém editoru; pro jedno okno jej můžete vypnout.
- **Umístění uložení** s tlačítkem **Change** a **Default app for Office documents**, aby OfficeVega otevíral soubory .docx / .xlsx / .pptx.

## AI Media & Search

Nejde o přepínače — každá schopnost vybírá poskytovatele, který ji obsluhuje, a klíč i základní URL poskytovatele se zadají jednou a sdílejí se:

- **Web search**, **Image generation**, **Image analysis** a **Video analysis**, každá s poskytovatelem, modelem, klíčem a základní URL. Zvolte **VEGA** jako poskytovatele, aby se směřovaly přes `api.vega.chat` s vaším přihlašovacím klíčem.
- **Lokální hledání souborů** běží na tomto stroji. Pod ním je **Jev přeřazení výsledků** ve výchozím stavu **vypnuté**. Zapnete-li ho, výtahy top 20 lokálních zásahů — až 1 200 znaků na dokument plus názvy souborů a složek — míří na zvolený rozhodovací endpoint (VEGA, Jev přes OpenRouter nebo TypeSafe, Perplexity, Liquid AI d1, Cloudflare, lokální engine nebo vlastní URL) a přeřadí se podle relevance. Vypnuté ze zařízení nic neodchází.

## O aplikaci

- **Version**, odkaz na web projektu [officevega.com](https://officevega.com) a stránka verzí [officevega.com/releases](https://officevega.com/releases).
- **Update Channel**: Stable nebo Beta. Změna se projeví hned a spustí kontrolu aktualizací; instalaci Beta nevrátí zpět na Stable.

## Přiřazení jako výchozí aplikace

Nastavení může zaregistrovat OfficeVega jako obsluhu souborů .docx / .xlsx / .pptx / .pdf a podobných (registrace výchozí aplikace na úrovni systému; potvrďte, když o to systém požádá).

## Informace o softwaru třetích stran a aktualizace

- Help ▸ Third-party notices: úplný přehled licencí open source dodávaných s aplikací.
- Help ▸ Check for updates: spustí ruční kontrolu; novější verze nabídne instalaci.

## Přihlášení do VEGA

- Přihlášení (v nastavení nebo v seznamu cloudových projektů) používá postup s **kódem zařízení**: OfficeVega zobrazí kód a otevře přihlašovací stránku v prohlížeči; po dokončení postup pokračuje automaticky.
- Přihlášení slouží pouze k: seznamu cloudových projektů a hostovaným modelům VEGA na `api.vega.chat`. Bez něj fungují dál všechny místní funkce i vlastní modely.
- Odhlášení je jedno kliknutí v nastavení.

## Podpora

Dotazy, nápady a hlášení chyb: [officevega.com/feedback](https://officevega.com/feedback), Telegram kanál [t.me/getmyai](https://t.me/getmyai), e-mail [mail@vega.chat](mailto:mail@vega.chat). Vývojář: [getmyai.io](https://getmyai.io) (Dmitrij Filippov).

## Integrace MCP (pro pokročilé uživatele a klienty AI)

**Integrations** je panel, který propojuje OfficeVega s programovacím agentem, a má vlastní článek: Připojení programovacího agenta. Stručně — vyberte cestu (příkazová řádka, nebo MCP), řiďte se touto částí a pak začněte nový chat a zeptejte se.

![Settings ▸ Integrations: tři kroky, pak řádky dovedností a možnosti MCP](img/settings-integrations.png)

Pod **Local HTTP server** může aplikace server spustit sama — přepínač zapnutí a port — a část **Advanced** přidá adresu pro kontrolu stavu a soubor protokolu, místo aby je nechala na asistentovi. Naslouchá pouze na localhostu.

## Přehled příkazů

| Příkaz               | Co dělá                     |
| -------------------- | --------------------------- |
| `officevega <file>`  | otevře soubor               |
| `officevega mcp`     | spustí místní server MCP    |
| `officevega --help`  | všechny příkazy a přepínače |

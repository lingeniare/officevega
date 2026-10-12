# Rychlý start: rozhraní a základy

OfficeVega je kancelářský balík, který běží celý na vašem počítači: jedno okno, jeden řádek karet a v něm šest editorů — Docs (textový editor), Sheets (tabulky), Slides (prezentace), PDF, Markdown a HTML. Soubory jsou skutečné soubory .docx / .xlsx / .pptx / .pdf, plně zaměnitelné s Wordem, Excelem a PowerPointem. Není potřeba připojení k síti.

## Přehled rozhraní

![Obrazovka domovské stránky](img/home-screen.png)

Okno má tři části:

- **Pruh karet (nahoře)**: každý otevřený soubor je karta. Karta Home vlevo je vždy přítomna a nelze ji zavřít; ostatní karty jsou vaše dokumenty. Dvojklikem na kartu přejmenujete její soubor přímo na místě.
- **Obsahová plocha**: editor (nebo Home) patřící aktivní kartě.
- **Pruh nabídek**: nahoře v okně ve Windows. Nabídky File / Edit / View se přizpůsobují aktivnímu editoru.

## Vytvoření dokumentu

Zvolte kterýkoli z těchto způsobů:

- Klikněte na kartu rychlého vytvoření v sekci [Quick start](help://getting-started) na **Home** (AI Docs, AI Sheets, AI Slides, ...).
- Nabídka **File ▸ New**: Docs (ctrl+N), Sheets, Slides, Markdown, HTML nebo PDF.
- Přetáhněte soubor do okna, nebo na něj dvakrát klikněte ve správci souborů (pokud je OfficeVega výchozí aplikací).

Nový dokument se otevře bez názvu; soubor na disku vznikne až při prvním uložení.

## Otevírání souborů

- Nabídka **File ▸ Open** (ctrl+O) otevře systémový výběr souborů: .docx / .doc / .xlsx / .xls / .csv / .tsv / .pptx / .ppt / .pdf / .md / .html.
- Klikněte na kteroukoli položku v seznamu **Recent** na Home.
- Příkaz `officevega <file>` v terminálu také otevírá soubory.

## Model ukládání

- **Ruční uložení**: ctrl+S, nebo File ▸ Save / Save As. Při prvním uložení se aplikace zeptá na umístění a název.
- **Automatické ukládání** se zapne teprve poté, co soubor uložíte ručně alespoň jednou — PDF, které jen čtete, se nikdy tiše nepřepíše. Automatické ukládání se spustí krátce po změně obsahu.
- Zavřete-li kartu s neuloženými změnami, nejdřív se zeptá: Save / Discard / Cancel.
- Každý zápis je atomický (dočasný soubor + přejmenování), takže výpadek napájení nenechá napůl zapsaný soubor.

## Běžné klávesové zkratky

| Akce                  | Windows |
| --------------------- | ------- |
| Nový dokument         | ctrl+N  |
| Otevřít               | ctrl+O  |
| Uložit                | ctrl+S  |
| Zavřít kartu          | ctrl+W  |
| Otevřít tuto příručku | F1      |
| Sbalit pás karet      | Ctrl+F1 |

**Sbalení pásu karet** funguje v každém editoru. Řádek karet zůstane na místě a pás příkazů pod ním se skryje; vybraná karta zároveň slouží jako ovládací prvek sbalení, takže dokud je pás karet sbalený, není vybraná žádná karta a stiskem libovolné karty se pás znovu ukáže. Dvojklik na kartu udělá totéž. Způsob, jakým jste to nechali, se pamatuje pro každý editor zvlášť. Docs přidává střední hustotu: **⌥⌘K** / Ctrl+Alt+K stáhne pás jen na ikony, pamatuje se stejně.

Zkratky uvnitř jednotlivých editorů (formátovací štětec, najít a nahradit, práce s tabulkami, ...) najdete v příslušných kapitolách. Docs navíc nabízí prohledávatelný dialog klávesových zkratek (**ctrl+/**), který pokrývá všechny jeho zkratky.

<!--
## Zkratky Option+Command

Option+Command je vrstva, kterou Word vyhrazuje pro strukturované skoky, a OfficeVega ji vyplňuje stejným způsobem. Docs zabírá většinu z nich, Sheets si bere dvě vlastní kvůli shodě s Excelem a jedna zkratka funguje všude.

**Docs**

| Zkratka (macOS)  | Co dělá                   | Windows / Linux    |
| ---------------- | ------------------------- | ------------------ |
| ⌥⌘1 / ⌥⌘2 / ⌥⌘3  | Nadpis 1 / 2 / 3          | Ctrl+Alt+1 / 2 / 3 |
| ⌥⌘0              | Normální text             | Ctrl+Alt+0         |
| ⌥⌘M              | Dialog odstavce           | Ctrl+Alt+M         |
| ⌥⌘A              | Nový komentář             | Ctrl+Alt+A         |
| ⌥⌘F              | Vložit poznámku pod čarou | Ctrl+Alt+F         |
| ⌥⌘E              | Vložit vysvětlivku        | Ctrl+Alt+D         |
| ⌥⌘G              | Přejít na                 | Ctrl+G             |

Dvě z nich se na Windows mění, ze stejného důvodu, pro který je Word rozděluje. **macOS má ⌥⌘D** — zobrazuje a skrývá Dock —, takže vysvětlivka je na Macu ⌥⌘E a jinde Ctrl+Alt+D. A **Přejít na** vynechává Alt: Ctrl+G, zatímco zkratka na Macu ho obsahuje.

**Sheets**, když má mřížka fokus

| Zkratka (macOS) | Co dělá           | Windows / Linux |
| --------------- | ----------------- | --------------- |
| ⌥⌘0             | Vnější ohraničení | Ctrl+Shift+7    |
| ⌥⌘−             | Bez ohraničení    | Ctrl+Shift+−    |

Verze pro Windows není přepisem dvojice z Macu. Excel pro Mac dává Sheets **obě** — ⌘⇧7 a ⌥⌘0 jsou dvě klávesy pro totéž vnější ohraničení — takže příkaz na Windows si ponechá pozici Ctrl+Shift, kterou už měl, a vrstva Option prostě chybí.

Všimněte si, že **⌥⌘0 znamená Normální v Docs a Vnější ohraničení v Sheets**. Tyto dvě funkce se nikdy neobjeví ve stejném editoru, takže se v praxi nekříží, ale ⌥⌘0 je obsazená a není dostupná jako globální zkratka.

**Každý editor**: **⌥⌘R / Ctrl+F1** sbalí pás karet, jak je popsáno výše.

Díky tomu zůstává ⌥⌘D volné pro OfficeVega na macOS, kdyby ho některý budoucí příkaz potřeboval.
-->

## Kam dál

- Kde soubory jsou: [Home screen](help://home-screen).
- Správa mnoha otevřených souborů: [Tabs and window management](help://tabs-and-windows).
- Nechte práci na AI: [AI assistant panel](help://ai-panel).
- Jazyk, motiv, výchozí aplikace: [Settings, language, theme and MCP integrations](help://settings-integrations).

Potřebujete pomoc? Zeptejte se na [officevega.com/feedback](https://officevega.com/feedback), sledujte novinky v Telegram kanálu [t.me/getmyai](https://t.me/getmyai), nebo napište na [mail@vega.chat](mailto:mail@vega.chat).

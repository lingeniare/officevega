# Panel AI asistenta

Každý editor umí vyvolat panel AI: vyberte něco, zadejte pokyn a sledujte výsledek, který se zobrazuje postupně.

## Otevření a používání

![Panel AI v Docs](img/ai-panel.png)

- Způsoby otevření: tlačítko **AI** na pásu každého editoru, **Zeptat se AI** v kontextových nabídkách nebo Zeptat se AI na panelu označování.
- Popište úkol běžnými slovy (přepiš tohle / udělej z tohoto sloupce procenta / přeskládej tuto stránku...) a stiskněte Enter.
- Odpovědi se vykreslují **postupně**. Když AI potřebuje nástroje (přečíst dokument, upravit jej), použije je a pokračuje, dokud nedokončí.
- **Zastavit**: kdykoli přeruší právě probíhající krok.
- **Fronta**: zatímco odpověď běží, Enter zařadí zprávu do fronty, místo aby ji zahodil — pruh nad polem je počítá; rozbalte ho pro úpravu, odebrání, přeřazení, pauzu nebo vymazání. Další zpráva se pošle sama koncem tahu; Esc tahu i nadále ukončuje.

## Co umí

- **Docs**: přepsat, rozšířit, přeložit a shrnout; vkládat tabulky a obrázky; upravit formátování. Každý krok nejprve uloží snímek stavu.
- **Sheets**: vzorce, vyplňování dat, hromadné úpravy, formátování.
- **Slides**: vytvoření celé prezentace, úprava rozložení, přepis textů.
- **PDF**: otázky a shrnutí nad vybraným textem nebo stránkami.
- **Markdown / HTML**: přepsat, rozšířit, přeložit.
- **Domů ▸ Ask AI** odpovídá z vašich souborů s hvězdičkou a cituje je — panel znalostní báze má vlastní sekci v kapitole Domů a AI panel Docs nese tutéž dovednost.

## Historie chatu

- Každá konverzace se ukládá automaticky a zůstává na tomto počítači — otevřete panel zítra a pokračujte tam, kde jste skončili.
- Novou konverzaci začnete tlačítkem **New chat**; mezi dřívějšími chaty přepínáte v seznamu historie nahoře v panelu.
- Chat můžete přejmenovat, aby se lépe hledal; smazáním jej odstraníte navždy. Smazání chatu se nikdy nedotkne vašich dokumentů.

## Vrácení zpět a bezpečnost

- Panel v Docs vede **seznam verzí**: jeden snímek na každý krok. Můžete se vrátit k libovolnému z nich a samotný návrat lze vrátit zpět pomocí Ctrl+Z. Snímky přežijí i opětovné otevření dokumentu.
- Změny od AI procházejí stejnou cestou úprav jako ruční změny (lze je vrátit zpět a vyžadují uložení) — nic neobchází vaše potvrzení uložení.

## Skrýt výběr před AI

- V Slides, HTML a Markdown lze výběr schovat před očima modelu: pravý klik ▸ **Skrýt výběr před AI**, pojmenujte zástupný text a model čte `{{název}}` místo něj. (Markdown položku zapíná přepínačem přeškrtnutého oka na pásu; ta HTML žije v panelu zdroje.)
- Soubor si ponechá skutečný text — uložení, export i tisk zůstávají nedotčené a značka přežije znovuotevření. Tatáž položka skrytí zruší (Markdown má navíc **Znovu ukázat výběr AI**).
- HTML skrývá obsah prvků, hodnoty atributů a řetězcové literály ve skriptech; vykreslená stránka se nikdy nemění.
- Slides skrývá i celé obrázky, videa a audio a snímek se skrytým obsahem nikdy neodchází jako snímek obrazovky: automatická kontrola rozvržení stránku přeskočí a oznámí to.
- Platí to jen pro AI v aplikaci — CLI, nástroje MCP a bezhlavý export čtou soubor přímo a text stále vidí.

## Soukromí a anonymizace

- Pokyny a příslušný obsah dokumentu putují do **služby modelu, kterou jste nastavili** (hostované VEGA nebo vlastní koncový bod, viz další kapitola). Bez nastavení se nic neodesílá.
- **Anonymizace (152-FZ)**: před odesláním může aplikace zamaskovat osobní údaje — jména, telefonní čísla, e-maily, údaje z pasu — aby je model nikdy neviděl. Zapněte to v Settings ▸ AI; zamaskované části se po odpovědi automaticky vrátí do dokumentu.
- **Žádná sledovací analytika**: OfficeVega se dodává bez Google Analytics a bez jakéhokoli sledovacího nástroje třetí strany. Není zde přepínač statistik používání, protože není co vypínat — obsah dokumentů a chatů neopouští trasu, kterou jste nastavili.
- Místní soubory se nikam jinam neodesílají; klíče BYOK se ukládají do souboru nastavení aplikace na tomto počítači a odesílají se pouze v hlavičkách požadavků.

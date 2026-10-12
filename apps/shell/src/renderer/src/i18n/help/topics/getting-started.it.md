# Avvio rapido: l'interfaccia e le basi

OfficeVega è una suite per ufficio che funziona interamente sulla tua macchina: una sola finestra, una fila di schede, con sei editor — Docs (elaborazione testi), Sheets (fogli di calcolo), Slides (presentazioni), PDF, Markdown e HTML. I file sono veri file .docx / .xlsx / .pptx / .pdf, completamente intercambiabili con Word, Excel e PowerPoint. Non serve alcuna connessione di rete.

## Panoramica dell'interfaccia

![La schermata Home](img/home-screen.png)

La finestra è composta da tre parti:

- **Barra delle schede (in alto)**: ogni file aperto è una scheda. La scheda Home, all'estrema sinistra, è sempre presente e non può essere chiusa; le altre schede sono i tuoi documenti. Fai doppio clic su una scheda per rinominare il file direttamente lì.
- **Area di contenuto**: l'editor (o Home) della scheda attiva.
- **Barra dei menu**: in cima alla finestra su Windows. I menu File / Modifica / Visualizza si adattano all'editor attivo.

## Creare un documento

Uno qualsiasi di questi modi:

- Fai clic su una scheda di creazione rapida nella sezione [Avvio rapido](help://getting-started) di **Home** (AI Docs, AI Sheets, AI Slides, ...).
- Menu **File ▸ Nuovo**: Docs (ctrl+N), Sheets, Slides, Markdown, HTML o PDF.
- Trascina un file sulla finestra, oppure fai doppio clic su di esso nel gestore di file (se OfficeVega è l'app predefinita).

Un nuovo documento si apre senza titolo; il file su disco viene creato solo al primo salvataggio.

## Apertura dei file

- Il menu **File ▸ Apri…** (ctrl+O) apre il selettore di sistema: .docx / .doc / .xlsx / .xls / .csv / .tsv / .pptx / .ppt / .pdf / .md / .html.
- Fai clic su una voce qualsiasi dell'elenco **Recenti** di Home.
- Anche `officevega <file>` da un terminale apre i file.

## Il modello di salvataggio

- **Salvataggio manuale**: ctrl+S, oppure File ▸ Salva / Salva con nome…. Al primo salvataggio ti verranno chiesti percorso e nome.
- **Il salvataggio automatico** si attiva solo dopo che hai salvato il file manualmente almeno una volta: un PDF che hai soltanto letto non viene mai riscritto di nascosto. Il salvataggio automatico interviene poco dopo una modifica del contenuto.
- Se chiudi una scheda con modifiche non salvate, ti viene prima chiesto di scegliere tra Salva / Scarta / Annulla.
- Ogni scrittura è atomica (file temporaneo e rinomina), così un'interruzione di corrente non può lasciare un file a metà.

## Scorciatoie comuni

| Azione                        | Windows |
| ----------------------------- | ------- |
| Nuovo documento               | ctrl+N  |
| Apri                          | ctrl+O  |
| Salva                         | ctrl+S  |
| Chiudi scheda                 | ctrl+W  |
| Apri questo manuale           | F1      |
| Riduci la barra multifunzione | Ctrl+F1 |

**Ridurre la barra multifunzione** funziona in ogni editor. La riga di schede resta al suo posto e la banda dei comandi sottostante viene nascosta; la scheda selezionata fa anche da controllo di riduzione, quindi mentre la barra multifunzione è ridotta nessuna scheda è selezionata e premere una scheda qualsiasi riporta la banda. Un doppio clic su una scheda fa lo stesso. Il modo in cui l'ha lasciata viene ricordato per ogni editor. Docs aggiunge una densità intermedia: **⌥⌘K** / Ctrl+Alt+K comprime la barra alle sole icone, ricordata allo stesso modo.

Le scorciatoie interne a ogni editor (copia formato, trova e sostituisci, operazioni sulle tabelle, ...) si trovano nei rispettivi capitoli; Docs dispone inoltre di una finestra di dialogo ricercabile con tutte le scorciatoie da tastiera (**ctrl+/**) che copre ogni combinazione.

<!--
## Le scorciatoie Option+Comando

Option+Comando è il livello che Word riserva ai salti strutturati, e OfficeVega lo riempie allo stesso modo. Docs ne usa la maggior parte, Sheets ne prende due per la compatibilità con Excel; una scorciatoia vale ovunque.

**Docs**

| Scorciatoia (macOS) | A cosa serve                   | Windows / Linux    |
| ------------------- | ------------------------------ | ------------------ |
| ⌥⌘1 / ⌥⌘2 / ⌥⌘3     | Titolo 1 / 2 / 3               | Ctrl+Alt+1 / 2 / 3 |
| ⌥⌘0                 | Normale                        | Ctrl+Alt+0         |
| ⌥⌘M                 | Paragrafo                      | Ctrl+Alt+M         |
| ⌥⌘A                 | Nuovo commento                 | Ctrl+Alt+A         |
| ⌥⌘F                 | Inserisci nota a piè di pagina | Ctrl+Alt+F         |
| ⌥⌘E                 | Inserisci nota di chiusura     | Ctrl+Alt+D         |
| ⌥⌘G                 | Vai a                          | Ctrl+G             |

Due di esse cambiano su Windows, per la stessa ragione per cui Word le separa. **macOS usa ⌥⌘D** — mostra e nasconde il Dock —, quindi la nota di chiusura è ⌥⌘E sul Mac e Ctrl+Alt+D ovunque altrove. E **Vai a** rinuncia al tasto Alt: Ctrl+G, mentre la scorciatoia del Mac lo include.

**Sheets**, mentre la griglia ha il focus

| Scorciatoia (macOS) | A cosa serve  | Windows / Linux |
| ------------------- | ------------- | --------------- |
| ⌥⌘0                 | Bordi esterni | Ctrl+Shift+7    |
| ⌥⌘−                 | Nessun bordo  | Ctrl+Shift+−    |

Windows non è una riscrittura della coppia del Mac. Excel per Mac offre a Sheets **entrambe** le scorciatoie — ⌘⇧7 e ⌥⌘0 sono due tasti per gli stessi bordi esterni —, quindi su Windows il comando conserva la combinazione Ctrl+Shift che aveva già e il livello Option semplicemente non c'è.

Attenzione: **⌥⌘0 significa Normale in Docs e Bordi esterni in Sheets**. Non compaiono mai nello stesso editor, quindi nell'uso non c'è alcuna collisione, ma ⌥⌘0 è già occupata e non è disponibile come scorciatoia globale.

**Ogni editor**: **⌥⌘R / Ctrl+F1** riduce la barra multifunzione, come descritto sopra.

Così ⌥⌘D resta libero per OfficeVega su macOS, nel caso un comando futuro ne avesse bisogno.
-->

## Dove andare poi

- Dove si trovano i file: [La schermata Home](help://home-screen).
- Gestire molti file aperti: [Schede e gestione delle finestre](help://tabs-and-windows).
- Far fare il lavoro all'IA: [Il pannello dell'assistente IA](help://ai-panel).
- Lingua, tema, app predefinite: [Impostazioni, lingua, tema e integrazioni MCP](help://settings-integrations).

Hai bisogno di aiuto? Chiedi su [officevega.com/feedback](https://officevega.com/feedback), segui le novità sul canale Telegram [t.me/getmyai](https://t.me/getmyai) oppure scrivi a [mail@vega.chat](mailto:mail@vega.chat).

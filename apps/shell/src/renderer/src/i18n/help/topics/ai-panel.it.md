# Il pannello dell'assistente IA

Ogni editor può richiamare il pannello IA: seleziona qualcosa, dai un'istruzione e guarda il risultato comparire man mano.

## Come aprirlo e usarlo

![Il pannello IA in Docs](img/ai-panel.png)

- Punti d'ingresso: il **pulsante IA** nella barra multifunzione di ogni editor, **Chiedi all'IA** nei menu contestuali, oppure Chiedi all'IA sulla barra di annotazione.
- Descrivi l'attività in linguaggio naturale (riscrivi questo / trasforma questa colonna in percentuali / riorganizza l'impaginazione di questa pagina...) e premi Invio.
- Le risposte vengono renderizzate **in streaming**; quando l'IA ha bisogno di strumenti (leggere il documento, modificarlo) li usa e prosegue fino alla fine.
- **Interrompi**: interrompe il turno in corso in qualsiasi momento.
- **Coda**: mentre arriva una risposta, Invio mette in coda il messaggio invece di scartarlo — una striscia sopra il campo di input li conta; aprila per modificare, rimuovere, riordinare, sospendere o svuotare. Il messaggio successivo parte da solo a fine turno; Esc ferma comunque il turno.

## Cosa sa fare

- **Docs**: riscrivere, espandere, tradurre, riassumere, inserire tabelle e immagini, modificare la formattazione; ogni turno crea prima uno snapshot.
- **Sheets**: formule, riempimento dei dati, trasformazioni in blocco, formattazione.
- **Slides**: generazione dell'intera presentazione, regolazione del layout, riscrittura dei testi.
- **PDF**: domande, risposte e riassunti sul testo o sulle pagine selezionate.
- **Markdown / HTML**: riscrivere, estendere, tradurre.
- **Home ▸ Ask AI** risponde dai tuoi file preferiti e li cita — il pannello della base di conoscenza ha una sua sezione nel capitolo Home, e il pannello IA di Docs porta la stessa capacità.

## Cronologia delle chat

- Ogni conversazione viene salvata automaticamente e resta su questa macchina: riapri il pannello domani e riprendi da dove eri rimasto.
- Avvia una nuova chat con **Nuova chat**; per passare a una chat precedente usa l'elenco della cronologia in cima al pannello.
- Rinomina una chat per ritrovarla più in fretta; eliminala per rimuoverla definitivamente. Eliminare una chat non tocca mai i tuoi documenti.

## Ripristino e sicurezza

- Il pannello di Docs mantiene un **elenco delle versioni**: uno snapshot per turno. Puoi tornare a una qualsiasi di esse, e il ripristino stesso può essere annullato con Ctrl+Z. Gli snapshot restano disponibili anche dopo la riapertura del documento.
- Le modifiche dell'IA passano dalla stessa pipeline di modifica di quelle manuali (annullabili, subordinate al salvataggio): nulla aggira la tua conferma di salvataggio.

## Nascondere una selezione all'IA

- In Slides, HTML e Markdown una selezione può essere tolta dagli occhi del modello: clic destro ▸ **Nascondi la selezione all'IA**, dai un nome al segnaposto, e il modello legge `{{nome}}` al suo posto. (Markdown abilita la voce con l'interruttore occhio-barrato della barra; quella di HTML sta nel pannello sorgente.)
- Il file conserva il testo vero — salvataggio, esportazione e stampa restano intatti, e il segno sopravvive alla riapertura. La stessa voce annulla la soppressione (Markdown ha anche **Mostra di nuovo la selezione all'IA**).
- HTML nasconde contenuti di elementi, valori di attributi e letterali stringa degli script; la pagina renderizzata non cambia mai.
- Slides nasconde anche intere immagini, video e audio, e una diapositiva con contenuto nascosto non viene mai inviata come screenshot: il controllo automatico del layout salta la pagina e lo dichiara.
- Vale solo per l'IA dell'app — CLI, strumenti MCP ed esportazione headless leggono il file direttamente e continuano a vedere il testo.

## Privacy e anonimizzazione

- Le istruzioni e il contenuto pertinente del documento vengono inviati al **servizio di modelli che hai configurato** (VEGA ospitato o un endpoint personalizzato, capitolo successivo); senza configurazione non viene inviato nulla.
- **Anonimizzazione (152-FZ)**: prima dell'invio, l'app può mascherare i dati personali — nomi, numeri di telefono, email, dati del passaporto — così il modello non li vede mai. Attivala in Impostazioni ▸ IA; i passaggi mascherati vengono ripristinati automaticamente nel documento.
- **Nessun tracciamento analitico**: OfficeVega viene distribuito senza Google Analytics né altri tracker di terze parti. Non esiste un interruttore per le statistiche di utilizzo perché non c'è nulla da disattivare: documenti e contenuti delle chat non lasciano mai il percorso che hai configurato.
- I file locali non vengono caricati da nessun'altra parte; le chiavi BYOK sono memorizzate nel file delle impostazioni dell'app su questa macchina e inviate solo nelle intestazioni delle richieste.

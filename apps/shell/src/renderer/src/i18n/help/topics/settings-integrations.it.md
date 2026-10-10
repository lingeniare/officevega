# Impostazioni, lingua, tema e integrazioni MCP

## Apertura delle impostazioni

La riga dell'account in basso a sinistra in Home apre il pannello delle impostazioni (quando non hai effettuato l'accesso riporta Accedi). Ha sei sezioni: Account, Modello IA, Media e ricerca IA, Generale, Integrazioni e Informazioni.

![Impostazioni ▸ Generale, dove si trovano lingua, tema e salvataggio automatico](img/settings-general.png)

La configurazione dei modelli ha un articolo tutto suo; in **Media e ricerca IA** attivi, per ogni provider, generazione di immagini, analisi delle immagini, analisi video, ricerca web e ricerca dei file locali.

## Lingua

- Le impostazioni offrono **21 lingue per l'interfaccia**: inglese, cinese semplificato, giapponese, coreano, francese, tedesco, spagnolo, thai, indonesiano, russo, arabo, portoghese, italiano, polacco, ceco, olandese, malese, ebraico, hindi, cinese tradizionale, vietnamita.
- Il cambio ha effetto immediato e viene ricordato; la barra dei menu nativa viene ricostruita nella nuova lingua.

## Tema

Chiaro / Scuro / Segui il sistema. L'opzione Segui il sistema adotta l'aspetto del sistema operativo e gli editor si adeguano in sincronia, senza sfarfallii. Lo stesso interruttore ricolora anche il pannello IA e la schermata Home, così l'intera app resta in un unico stile: Chiaro per gli ambienti luminosi, Scuro per il lavoro notturno, Segui il sistema per seguire Windows.

## Generale

- **Nessun tracciamento analitico**: OfficeVega viene distribuito senza Google Analytics né altri tracker di terze parti — i contenuti dei documenti, i nomi dei file e gli eventi di utilizzo non vengono mai raccolti né inviati a nessuno.
- **Posizione della barra laterale IA** (sinistra o destra), **Dimensione del testo del pannello IA** e **Controllo ortografico nella chat IA**.
- **Apri il pannello IA nei nuovi documenti** — disattivato, un nuovo documento si apre con il pannello chiuso, a un clic di distanza.
- **Salva automaticamente tutti i documenti** attiva il salvataggio automatico per impostazione predefinita in ogni editor; puoi comunque disattivarlo per una singola finestra.
- **Posizione di salvataggio** con il pulsante **Cambia** e **App predefinita per i documenti Office** per assegnare .docx / .xlsx / .pptx a OfficeVega.

## Media e ricerca IA

Non sono interruttori: ogni capacità sceglie il fornitore che la gestisce, e la chiave e l'URL di base di un fornitore si inseriscono una sola volta e vengono condivisi:

- **Ricerca web**, **Generazione di immagini**, **Analisi di immagini** e **Analisi video**, ciascuna con un provider, un modello, una chiave e un URL di base. Scegli **VEGA** come provider per instradarle attraverso `api.vega.chat` con la tua chiave di accesso.
- **La ricerca dei file locali** viene eseguita su questa macchina. Sotto c'è il **riordino con Jev**, **disattivato per impostazione predefinita**. Se lo attivi, gli estratti dei 20 risultati locali più pertinenti — fino a 1.200 caratteri per documento, più i nomi di file e cartelle — vengono inviati al modello Jev di TypeSafe per essere riordinati per pertinenza. Se resta disattivato, nulla lascia il dispositivo.

## Informazioni

- **Versione**, il sito del progetto [officevega.com](https://officevega.com) e la pagina delle release [officevega.com/releases](https://officevega.com/releases).
- **Canale di aggiornamento**: Stabile o Beta. Il cambio ha effetto immediato e controlla la presenza di un aggiornamento; non riporta un'installazione Beta alla versione Stabile.

## Associazioni come app predefinita

Le impostazioni possono registrare OfficeVega come gestore dei file .docx / .xlsx / .pptx / .pdf e simili (registrazione dell'app predefinita a livello di sistema; conferma quando richiesto).

## Note sul software di terze parti e aggiornamenti

- Aiuto ▸ Note sul software di terze parti: l'elenco completo delle licenze open source incluse nell'app.
- Aiuto ▸ Controlla aggiornamenti…: avvia un controllo manuale; se c'è una versione più recente ti propone di installarla.

## Accesso a VEGA

- Il punto d'ingresso per l'accesso (nelle impostazioni o nell'elenco dei progetti cloud) usa un flusso con **codice dispositivo**: OfficeVega mostra un codice e apre la pagina di accesso nel browser; una volta completato, l'operazione prosegue automaticamente.
- L'accesso serve soltanto per l'elenco dei progetti cloud e per i modelli ospitati da VEGA su `api.vega.chat`. Senza di esso, ogni funzione locale e i modelli personalizzati continuano a funzionare.
- La disconnessione si fa con un clic nelle impostazioni.

## Supporto

Domande, idee e segnalazioni di bug: [officevega.com/feedback](https://officevega.com/feedback), canale Telegram [t.me/getmyai](https://t.me/getmyai), email [mail@vega.chat](mailto:mail@vega.chat). Sviluppatore: [getmyai.io](https://getmyai.io) (Dmitry Filippov).

## Integrazione MCP (per utenti avanzati / client IA)

**Integrazioni** è il riquadro che collega OfficeVega a un agente di programmazione, e ha un articolo tutto suo: Collegare un agente di programmazione. In breve: scegli una strada (la riga di comando oppure MCP), segui quella sezione, poi apri una nuova chat e fai la domanda.

![Impostazioni ▸ Integrazioni: i tre passaggi, poi le righe delle skill e le opzioni MCP](img/settings-integrations.png)

Sotto **Server HTTP locale** l'app può anche eseguire il server per conto proprio, con un interruttore di attivazione e una porta; **Avanzate** aggiunge l'URL di controllo dello stato e il file di log. Il server ascolta solo su localhost.

## Riepilogo rapido dei comandi

| Comando             | Cosa fa                      |
| ------------------- | ---------------------------- |
| `officevega <file>` | apre un file                 |
| `officevega mcp`    | avvia il server MCP locale   |
| `officevega --help` | tutti i comandi e le opzioni |

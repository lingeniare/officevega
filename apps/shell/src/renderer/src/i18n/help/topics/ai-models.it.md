# Modelli IA e impostazioni

## Provider e modelli

Modelli e chiavi si configurano nelle impostazioni (la riga dell'account in basso a sinistra in Home):

![La finestra Impostazioni](img/settings-general.png)

- **VEGA sui suoi server**: accedi (flusso con codice dispositivo) e usalo — nessuna configurazione richiesta. Le richieste vanno a `https://api.vega.chat`, un endpoint compatibile con OpenRouter, quindi qualsiasi client in stile OpenRouter può puntarci.
- **Endpoint personalizzati (BYOK)**: Impostazioni ▸ IA accetta un URL di base e una chiave API per ogni protocollo — compatibile con OpenAI, Anthropic, Gemini, DeepSeek, DashScope (qwen) e altro. Le chiavi sono memorizzate nel file delle impostazioni dell'app su questa macchina e inviate solo nelle intestazioni delle richieste. Atlas Cloud figura tra i protocolli integrati.
- Puoi scegliere un modello diverso per ciascuna capacità: chat/generazione, generazione di immagini, analisi delle immagini.
- **Prova connessione**: verifica che l'endpoint sia raggiungibile e che il modello sia visibile prima di salvare.
- Gli URL di base possono contenere un percorso e una stringa di query (stile gateway); i percorsi degli endpoint vengono aggiunti correttamente.

## Scegliere un modello

- Il selettore dei modelli si trova in cima al pannello IA e in Impostazioni ▸ Modello IA: una scelta per la chat e scelte separate per generazione e analisi delle immagini, dove il provider le supporta.
- Inizia con il modello VEGA predefinito: va bene per la maggior parte delle attività d'ufficio (riscrittura, tabelle, formule, riassunti). Passa a un modello più grande per ragionamenti complessi o documenti lunghi, e a uno più piccolo ed economico per bozze rapide.
- Una conversazione in corso mantiene il vecchio modello fino al turno successivo; le nuove chat usano subito la nuova scelta.

## Prezzi e utilizzo

- La fatturazione VEGA è a consumo, modello per modello. L'elenco completo dei prezzi è su [api.vega.chat/aimodels](https://api.vega.chat/aimodels): controlla il prezzo di input e output di un modello prima di un lavoro importante.
- Saldo e spesa correnti sono nella [dashboard VEGA](https://api.vega.chat/dashboard), che si apre anche dalla riga del saldo nel menu dell'account.
- Senza accesso funzionano solo le opzioni gratuite integrate; accedi per sbloccare tutti i modelli dell'elenco prezzi.

## Integrazione con la CLI (classe Codex)

- Le impostazioni accettano il percorso di un programma CLI locale (le directory home non ASCII e il prefisso ~ funzionano; ~ viene espanso automaticamente). Rileva modelli interroga la CLI sui modelli disponibili.
- La convalida verifica solo che il percorso esista — nessuna restrizione sul set di caratteri.

## Quando hanno effetto le modifiche

- Le modifiche a modello ed endpoint hanno effetto immediato; una conversazione in corso mantiene la vecchia configurazione fino al turno successivo.

# Installare OfficeVega

Ogni build viene pubblicato sulla [pagina Releases](https://officevega.com/releases). Provengono tutti da `main`; i programmi di installazione per Windows sono firmati.

## Scegli il file giusto per il tuo computer

| Piattaforma                           | Requisiti                                             | File                                    |
| ------------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| **Windows** — la maggior parte dei PC | Windows 10+, Intel/AMD                                | programma di installazione `-x64.exe`   |
| **Windows** su Arm                    | Windows 11 su Arm (Snapdragon X e simili)             | programma di installazione `-arm64.exe` |
<!-- altre piattaforme arriveranno più avanti; per ora solo Windows
| **macOS** — Apple Silicon             | macOS 11+                                             | `.dmg` (arm64)                          |
| **macOS** — Intel                     | macOS 11+                                             | `.dmg` (x64)                            |
| **Linux** — Debian / Ubuntu           | x86_64, glibc 2.34+ (Ubuntu 22.04 o successivo)       | `.deb`                                  |
| **Linux** — Fedora / RHEL / openSUSE  | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                                  |
| **Linux** — qualsiasi altra cosa      | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`                             |
-->

Le versioni precedenti restano sulla pagina Releases.

<!--
## Su macOS

Apri il file `.dmg` e trascina **OfficeVega** in Applicazioni. Su una build Intel, il primo avvio ti chiede di confermare l'apertura: fai clic con il tasto destro sull'app in Applicazioni ▸ Apri. Non è un download danneggiato: è Gatekeeper che incontra un'immagine disco che sembra non firmata.
-->

## Su Windows

Esegui il programma di installazione `.exe`. Inserisce OfficeVega nel menu Start e registra `.docx`, `.xlsx`, `.pptx`, `.pdf` e simili, così un doppio clic su un file lo apre.

<!--
## Su Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # famiglia Fedora / RHEL
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — funziona da dove si trova, senza alcun passaggio di installazione:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

Richiede il runtime FUSE 2. Se preferisci non installarlo, avvialo con `--appimage-extract-and-run`: la sandbox funziona dalla directory estratta.
-->

## La build che stai eseguendo

**Impostazioni ▸ Informazioni** mostra la build che hai, il canale che segue e dove si trova il progetto. Quando una build più recente viene pubblicata su quel canale, lo stesso pannello offre l'aggiornamento.

![Impostazioni ▸ Informazioni, con la versione installata, il canale di aggiornamento seguito dall'app e il collegamento al sito del progetto](img/install.png)

<!--
## Altre tre vie

Tutte e tre incapsulano i file pubblicati invece di ricompilare l'app, così restano allineate ai binari ufficiali.

- **Flatpak** — installa il `.deb` tramite il meccanismo `extra-data` di Flatpak e lo esegue sotto Zypak, che adatta la sandbox di Electron. La struttura `/app` è di sola lettura, quindi gli aggiornamenti passano da Flatpak e non dalla finestra di aggiornamento dell'app.
- **Nix** — un'espressione di pacchetto che si compila da una copia del repository con `nix-build packaging/nix`; vedi `packaging/nix`.
- **Docker** — un'immagine senza interfaccia per la conversione in blocco (`packaging/docker`). Converte un'intera cartella di documenti Office, Markdown e HTML in PDF attraverso la pipeline di esportazione dell'app, quindi il risultato è lo stesso di File ▸ Esporta. È un'utilità da riga di comando, non un server.
-->

## La riga di comando è inclusa

Ogni installazione include il comando `officevega`, che usa gli stessi motori della finestra: così i due non si contraddicono mai su un file. Si trova dentro il pacchetto dell'app; `officevega install-cli` lo aggiunge al tuo `PATH`. Per sapere cosa può fare, vedi **Riga di comando e agenti**.

## Supporto

- Sito web: [officevega.com](https://officevega.com), release: [officevega.com/releases](https://officevega.com/releases).
- Aiuto e feedback: [officevega.com/feedback](https://officevega.com/feedback), canale Telegram: [t.me/getmyai](https://t.me/getmyai).
- Sviluppatore: [getmyai.io](https://getmyai.io) (Dmitry Filippov), email: [mail@vega.chat](mailto:mail@vega.chat).

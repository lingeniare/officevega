# OfficeVega installeren

Elke build staat op de [Releases-pagina](https://officevega.com/releases). Ze komen allemaal uit `main`; de installatiebestanden voor Windows zijn ondertekend.

## Kies het bestand voor je computer

| Platform                             | Vereisten                                             | Bestand                   |
| ------------------------------------ | ----------------------------------------------------- | ------------------------- |
| **Windows** — de meeste pc's         | Windows 10+, Intel/AMD                                | installatiebestand `-x64.exe`   |
| **Windows** op Arm                   | Windows 11 op Arm (Snapdragon X en vergelijkbaar)     | installatiebestand `-arm64.exe` |
<!-- andere platformen volgen later; voorlopig alleen Windows
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)            |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)              |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 of nieuwer)         | `.deb`                    |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                    |
| **Linux** — overig                   | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`               |
-->

Oudere versies blijven op de Releases-pagina staan.

<!--
## Op macOS

Open het `.dmg` en sleep **OfficeVega** naar Programma's. Bij een Intel-build vraagt de eerste keer starten om bevestiging: klik met de rechtermuisknop op de app in Programma's ▸ Open. Dat is Gatekeeper die een schijfkopie tegenkomt die niet ondertekend lijkt, geen beschadigde download.
-->

## Op Windows

Voer het installatiebestand `.exe` uit. Dat zet OfficeVega in het Startmenu en registreert `.docx`, `.xlsx`, `.pptx`, `.pdf` en vergelijkbare bestanden, zodat een dubbelklik op een bestand het opent.

<!--
## Op Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — draait waar het staat, zonder installatiestap:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

Het heeft de FUSE 2-runtime nodig. Wil je die niet installeren, start het dan met `--appimage-extract-and-run`; de sandbox werkt dan vanuit de uitgepakte map.
-->

## De build die je draait

**Settings ▸ About** is de plek waar de app meldt welke build je hebt, welk kanaal hij volgt en waar het project staat. Zodra er een nieuwere build op dat kanaal verschijnt, biedt hetzelfde paneel die update aan.

![Settings ▸ About, met de geïnstalleerde versie, het updatekanaal dat de app volgt en de link naar de projectsite](img/install.png)

<!--
## Nog drie routes

Alle drie verpakken ze de gepubliceerde artefacten in plaats van de app opnieuw te bouwen, dus ze volgen de officiële binaire bestanden.

- **Flatpak** — installeert de `.deb` via het `extra-data`-mechanisme van Flatpak en draait die onder Zypak, dat de eigen sandbox van Electron aanpast. De `/app`-structuur is alleen-lezen, dus updates lopen via Flatpak en niet via het updatevenster in de app.
- **Nix** — een pakketuitdrukking die je vanuit een checkout bouwt met `nix-build packaging/nix`; zie `packaging/nix`.
- **Docker** — een headless image voor batchconversie (`packaging/docker`). Het zet een hele boom aan Office-, Markdown- en HTML-documenten om naar PDF via de eigen exportpijplijn van de app, dus de uitvoer is wat Bestand ▸ Exporteren zou opleveren. Het is een CLI-hulpmiddel, geen server.
-->

## De opdrachtregel zit erbij

Elke installatie bevat het commando `officevega`, dat met dezelfde engines praat als het venster, zodat de twee nooit over een bestand het oneens zijn. Het zit in de app-bundel; `officevega install-cli` zet het in je `PATH`. Wat het allemaal kan, lees je in **Opdrachtregel en agents**.

## Ondersteuning

- Website: [officevega.com](https://officevega.com), releases: [officevega.com/releases](https://officevega.com/releases).
- Hulp en feedback: [officevega.com/feedback](https://officevega.com/feedback), Telegram-kanaal: [t.me/getmyai](https://t.me/getmyai).
- Ontwikkelaar: [getmyai.io](https://getmyai.io) (Dmitri Filippov), e-mail: [mail@vega.chat](mailto:mail@vega.chat).

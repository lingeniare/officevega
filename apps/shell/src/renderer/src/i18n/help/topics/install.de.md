# OfficeVega installieren

Jeder Build wird auf der [Releases-Seite](https://officevega.com/releases) veröffentlicht. Alle stammen aus `main`; die Windows-Installer sind signiert.

## Die Datei für Ihren Rechner wählen

| Plattform                            | Voraussetzungen                                       | Datei                              |
| ------------------------------------ | ----------------------------------------------------- | ---------------------------------- |
| **Windows** — die meisten PCs        | Windows 10+, Intel/AMD                                | Installer `-x64.exe`               |
| **Windows** auf Arm                  | Windows 11 auf Arm (Snapdragon X und ähnliche)        | Installer `-arm64.exe`             |
<!-- weitere Plattformen folgen später; vorerst nur Windows
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)                     |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)                       |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 oder neuer)         | `.deb`                             |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                             |
| **Linux** — alles andere             | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`                        |
-->

Ältere Versionen bleiben auf der Releases-Seite.

<!--
## Unter macOS

Öffnen Sie die `.dmg` und ziehen Sie **OfficeVega** in den Ordner Programme. Beim Intel-Build fragt der erste Start nach einer Bestätigung: Rechtsklick auf die App unter Programme ▸ Öffnen. Das ist Gatekeeper, der ein scheinbar nicht signiertes Datenträgerabbild prüft, und kein beschädigter Download.
-->

## Unter Windows

Starten Sie das `.exe`-Installationsprogramm. Es legt OfficeVega im Startmenü ab und registriert `.docx`, `.xlsx`, `.pptx`, `.pdf` und weitere Formate, sodass ein Doppelklick auf eine Datei sie öffnet.

<!--
## Unter Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Familie Fedora / RHEL
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — läuft direkt am Speicherort, ohne Installationsschritt:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

Es braucht die FUSE-2-Laufzeitumgebung. Möchten Sie sie nicht installieren, starten Sie mit `--appimage-extract-and-run`; die Sandbox arbeitet dann aus dem entpackten Verzeichnis.
-->

## Der Build, den Sie verwenden

**Einstellungen ▸ Info** zeigt, welchen Build Sie haben, welchem Kanal die App folgt und wo das Projekt zu finden ist. Wird auf diesem Kanal ein neuerer Build veröffentlicht, bietet dieselbe Ansicht das Update an.

![Einstellungen ▸ Info mit der installierten Version, dem Update-Kanal der App und dem Link zur Projektseite](img/install.png)

<!--
## Drei weitere Wege

Alle drei verpacken die veröffentlichten Dateien, statt die App neu zu bauen, sodass sie den offiziellen Programmdateien folgen.

- **Flatpak** — installiert die `.deb` über den Mechanismus `extra-data` von Flatpak und startet sie unter Zypak, das die Sandbox von Electron anpasst. Der Ordner `/app` ist nur lesbar, deshalb laufen Updates über Flatpak statt über den Update-Dialog der App.
- **Nix** — ein Paketausdruck, den Sie aus einem Checkout mit `nix-build packaging/nix` bauen; siehe `packaging/nix`.
- **Docker** — ein Headless-Image für die Stapelkonvertierung (`packaging/docker`). Es wandelt einen ganzen Ordner mit Office-, Markdown- und HTML-Dokumenten über die eigene Exportpipeline der App in PDF um, sodass das Ergebnis dem von Datei ▸ Exportieren entspricht. Es ist ein Kommandozeilenwerkzeug, kein Server.
-->

## Die Kommandozeile ist schon dabei

Jede Installation enthält den Befehl `officevega`. Er arbeitet mit denselben Engines wie das Fenster, daher widersprechen sich beide nie bei einer Datei. Er liegt im App-Paket; `officevega install-cli` legt ihn in Ihren `PATH`. Was er kann, steht unter **Kommandozeile und Agenten**.

## Support

- Website: [officevega.com](https://officevega.com), Releases: [officevega.com/releases](https://officevega.com/releases).
- Hilfe und Feedback: [officevega.com/feedback](https://officevega.com/feedback), Telegram-Kanal: [t.me/getmyai](https://t.me/getmyai).
- Entwickler: [getmyai.io](https://getmyai.io) (Dmitry Filippov), E-Mail: [mail@vega.chat](mailto:mail@vega.chat).

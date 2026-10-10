# Instalace OfficeVega

Každé sestavení je zveřejněno na [stránce Releases](https://officevega.com/releases). Všechna pocházejí z `main` a instalátory pro Windows jsou podepsané.

## Vyberte soubor pro svůj počítač

| Platforma                            | Požadavky                                             | Soubor                  |
| ------------------------------------ | ----------------------------------------------------- | ----------------------- |
| **Windows** — většina počítačů       | Windows 10+, Intel/AMD                                | instalátor `-x64.exe`   |
| **Windows** s architekturou Arm      | Windows 11 s Arm (Snapdragon X a podobné)             | instalátor `-arm64.exe` |
<!-- ostatní platformy přidáme později; zatím pouze Windows
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)          |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)            |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 nebo novější)       | `.deb`                  |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                  |
| **Linux** — cokoliv jiného           | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`             |
-->

Starší verze zůstávají na stránce Releases.

<!--
## V systému macOS

Otevřete soubor `.dmg` a přetáhněte **OfficeVega** do složky Aplikace. U sestavení Intel vás při prvním spuštění požádá o potvrzení otevření: klikněte na aplikaci v Aplikacích pravým tlačítkem ▸ Otevřít. Je to Gatekeeper, který reaguje na obraz disku působící jako nepodepsaný, nikoli na poškozené stažení.
-->

## V systému Windows

Spusťte instalátor `.exe`. Přidá OfficeVega do nabídky Start a zaregistruje `.docx`, `.xlsx`, `.pptx`, `.pdf` a podobné typy, takže dvojklik na soubor jej otevře.

<!--
## V systému Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — běží tam, kde je, bez instalačního kroku:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

Potřebuje běhové prostředí FUSE 2. Pokud jej nechcete instalovat, spusťte jej s volbou `--appimage-extract-and-run`; izolace pak poběží z rozbalené složky.
-->

## Sestavení, které právě běží

**Settings ▸ About** je místo, kde aplikace ukazuje, jaké sestavení máte, který kanál sleduje a kde projekt sídlí. Jakmile se na tom kanálu objeví novější sestavení, stejný panel nabídne aktualizaci.

![Settings ▸ About — zobrazuje nainstalovanou verzi, kanál aktualizací, který aplikace sleduje, a odkaz na web projektu](img/install.png)

<!--
## Tři další cesty

Všechny tři obalují zveřejněné artefakty místo toho, aby aplikaci znovu sestavovaly, takže sledují oficiální binární soubory.

- **Flatpak** — nainstaluje `.deb` pomocí mechanismu `extra-data` ve Flatpaku a spustí jej pod Zypakem, který přizpůsobuje vlastní izolaci Electronu. Strom `/app` je jen pro čtení, takže aktualizace probíhají přes Flatpak, ne přes dialog aktualizace v aplikaci.
- **Nix** — výraz balíčku, který sestavíte ze zdrojového stromu příkazem `nix-build packaging/nix`; viz `packaging/nix`.
- **Docker** — obraz pro dávkový převod bez rozhraní (`packaging/docker`). Převede celý strom dokumentů Office, Markdown a HTML do PDF přes exportní kanál samotné aplikace, takže výstup je stejný, jaký by dalo Soubor ▸ Exportovat. Je to nástroj příkazové řádky, ne server.
-->

## Příkazová řádka je součástí

Každá instalace obsahuje příkaz `officevega`, který komunikuje se stejnými enginy jako okno, takže se oba nikdy neshodnou v tom, jaký soubor je. Je uvnitř balíčku aplikace; `officevega install-cli` jej umístí do vaší `PATH`. Co umí, najdete v kapitole **Příkazová řádka a agenti**.

## Podpora

- Web: [officevega.com](https://officevega.com), verze: [officevega.com/releases](https://officevega.com/releases).
- Nápověda a zpětná vazba: [officevega.com/feedback](https://officevega.com/feedback), kanál na Telegramu: [t.me/getmyai](https://t.me/getmyai).
- Vývojář: [getmyai.io](https://getmyai.io) (Dmitrij Filippov), e-mail: [mail@vega.chat](mailto:mail@vega.chat).

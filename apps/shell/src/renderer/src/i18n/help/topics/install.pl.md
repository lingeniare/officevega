# Instalacja OfficeVega

Każda kompilacja jest publikowana na [stronie Releases](https://officevega.com/releases). Wszystkie pochodzą z `main`, a instalatory dla Windows są podpisane.

## Wybierz plik dla swojego komputera

| Platforma                            | Wymagania                                             | Plik                    |
| ------------------------------------ | ----------------------------------------------------- | ----------------------- |
| **Windows** — większość komputerów   | Windows 10+, Intel/AMD                                | instalator `-x64.exe`   |
| **Windows** na Arm                   | Windows 11 na Arm (Snapdragon X i podobne)            | instalator `-arm64.exe` |
<!-- inne platformy pojawią się później; na razie tylko Windows
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)          |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)            |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 lub nowszy)         | `.deb`                  |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                  |
| **Linux** — inne                     | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`             |
-->

Starsze wersje pozostają na stronie Releases.

<!--
## W systemie macOS

Otwórz plik `.dmg` i przeciągnij **OfficeVega** do katalogu Aplikacje. W kompilacji Intel przy pierwszym uruchomieniu trzeba potwierdzić otwarcie: kliknij aplikację prawym przyciskiem w Aplikacjach ▸ Otwórz. To Gatekeeper reaguje na obraz dysku, który wygląda na niepodpisany, a nie na uszkodzone pobranie.
-->

## W systemie Windows

Uruchom instalator `.exe`. Dodaje OfficeVega do menu Start i rejestruje `.docx`, `.xlsx`, `.pptx`, `.pdf` oraz podobne typy, więc dwukrotne kliknięcie pliku otwiera go w aplikacji.

<!--
## W systemie Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — działa tam, gdzie leży, bez żadnego etapu instalacji:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

Wymaga środowiska uruchomieniowego FUSE 2. Jeśli wolisz go nie instalować, uruchom go z opcją `--appimage-extract-and-run`; wtedy piaskownica działa z rozpakowanego katalogu.
-->

## Kompilacja, którą uruchamiasz

**Settings ▸ About** to miejsce, w którym aplikacja pokazuje, jaką kompilację masz, z jakiego kanału korzysta i gdzie znajduje się projekt. Gdy w tym kanale pojawi się nowsza kompilacja, ten sam panel zaproponuje aktualizację.

![Settings ▸ About — zainstalowana wersja, kanał aktualizacji, z którego korzysta aplikacja, oraz link do strony projektu](img/install.png)

<!--
## Trzy inne sposoby

Wszystkie trzy opakowują opublikowane pliki zamiast przebudowywać aplikację, więc pozostają zgodne z oficjalnymi plikami binarnymi.

- **Flatpak** — instaluje `.deb` przez mechanizm `extra-data` Flatpaka i uruchamia go pod Zypakiem, który dostosowuje własną piaskownicę Electrona. Drzewo `/app` jest tylko do odczytu, więc aktualizacje przechodzą przez Flatpaka, a nie przez okno aktualizacji w aplikacji.
- **Nix** — wyrażenie pakietu, które budujesz ze źródeł poleceniem `nix-build packaging/nix`; zobacz `packaging/nix`.
- **Docker** — obraz do konwersji wsadowej bez interfejsu (`packaging/docker`). Konwertuje całe drzewo dokumentów Office, Markdown i HTML do PDF przez potok eksportu samej aplikacji, więc wynik jest taki sam, jak po wybraniu Plik ▸ Eksportuj. To narzędzie wiersza poleceń, a nie serwer.
-->

## Wiersz poleceń jest w zestawie

Każda instalacja zawiera polecenie `officevega`, które korzysta z tych samych silników co okno, więc oba nigdy nie różnią się w ocenie pliku. Polecenie znajduje się w pakiecie aplikacji; `officevega install-cli` dodaje je do `PATH`. Informacje o tym, co potrafi, znajdziesz w rozdziale **Wiersz poleceń i agenci**.

## Pomoc techniczna

- Strona: [officevega.com](https://officevega.com), wydania: [officevega.com/releases](https://officevega.com/releases).
- Pomoc i uwagi: [officevega.com/feedback](https://officevega.com/feedback), kanał na Telegramie: [t.me/getmyai](https://t.me/getmyai).
- Twórca: [getmyai.io](https://getmyai.io) (Dmitrij Filippow), e-mail: [mail@vega.chat](mailto:mail@vega.chat).

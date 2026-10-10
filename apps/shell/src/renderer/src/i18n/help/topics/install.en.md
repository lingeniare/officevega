# Installing OfficeVega

Every build is published on the [Releases page](https://officevega.com/releases). All of them come from `main`; the Windows installers are signed.

## Pick the file for your machine

| Platform                             | Requirements                                          | File                   |
| ------------------------------------ | ----------------------------------------------------- | ---------------------- |
| **Windows** — most PCs               | Windows 10+, Intel/AMD                                | `-x64.exe` installer   |
| **Windows** on Arm                   | Windows 11 on Arm (Snapdragon X and similar)          | `-arm64.exe` installer |
<!-- other platforms are coming later; Windows only for now
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)         |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)           |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 or newer)           | `.deb`                 |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                 |
| **Linux** — anything else            | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`            |
-->

Older versions stay on the Releases page.

<!--
## On macOS

Open the `.dmg` and drag **OfficeVega** into Applications. On an Intel build the first launch asks you to confirm opening it: right-click the app in Applications ▸ Open. That is Gatekeeper meeting an unsigned-seeming disk image, not a damaged download.
-->

## On Windows

Run the `.exe` installer. It puts OfficeVega in the Start menu and registers `.docx`, `.xlsx`, `.pptx`, `.pdf` and friends so double-clicking a file opens it.

<!--
## On Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — runs where it is, with no install step:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

It needs the FUSE 2 runtime. If you would rather not install it, run it with `--appimage-extract-and-run` and the sandbox works from the extracted directory.
-->

## The build you are running

**Settings ▸ About** is where the app reports the build you have, the channel it follows and where the project lives. When a newer build is published on that channel, the same pane offers the update.

![Settings ▸ About, showing the installed version, the update channel the app follows, and the project site link](img/install.png)

<!--
## Three more routes

All three wrap the published artifacts rather than rebuilding the app, so they track the official binaries.

- **Flatpak** — installs the `.deb` through Flatpak's `extra-data` mechanism and runs it under Zypak, which adapts Electron's own sandbox. The `/app` tree is read-only, so updates go through Flatpak rather than the in-app update dialog.
- **Nix** — a package expression you build from a checkout with `nix-build packaging/nix`; see `packaging/nix`.
- **Docker** — a headless batch-conversion image (`packaging/docker`). It converts a whole tree of Office, Markdown and HTML documents to PDF through the app's own export pipeline, so the output is what File ▸ Export would produce. It is a CLI utility, not a server.
-->

## The command line comes with it

Every install ships an `officevega` command that talks to the same engines the window does, so the two never disagree about a file. It lives inside the app bundle; `officevega install-cli` puts it on your `PATH`. See **Command line and agents** for what it can do.

## Support

- Website: [officevega.com](https://officevega.com), releases: [officevega.com/releases](https://officevega.com/releases).
- Help and feedback: [officevega.com/feedback](https://officevega.com/feedback), Telegram channel: [t.me/getmyai](https://t.me/getmyai).
- Developer: [getmyai.io](https://getmyai.io) (Dmitry Filippov), email: [mail@vega.chat](mailto:mail@vega.chat).

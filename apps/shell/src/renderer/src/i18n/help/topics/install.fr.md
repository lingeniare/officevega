# Installer OfficeVega

Chaque build est publié sur la [page Releases](https://officevega.com/releases). Tous proviennent de `main` ; les installeurs Windows sont signés.

## Choisir le fichier pour votre machine

| Plateforme                           | Prérequis                                             | Fichier                   |
| ------------------------------------ | ----------------------------------------------------- | ------------------------- |
| **Windows** — la plupart des PC      | Windows 10+, Intel/AMD                                | installateur `-x64.exe`   |
| **Windows** sur Arm                  | Windows 11 sur Arm (Snapdragon X et similaires)       | installateur `-arm64.exe` |
<!-- d'autres plateformes arriveront plus tard ; pour l'instant Windows uniquement
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)            |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)              |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 ou plus récent)     | `.deb`                    |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                    |
| **Linux** — tout le reste            | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`               |
-->

Les versions antérieures restent sur la page Releases.

<!--
## Sous macOS

Ouvrez le `.dmg` et faites glisser **OfficeVega** dans Applications. Sur une version Intel, le premier lancement demande de confirmer l'ouverture : clic droit sur l'application dans Applications ▸ Ouvrir. C'est Gatekeeper qui rencontre une image disque sans signature apparente, et non un téléchargement endommagé.
-->

## Sous Windows

Lancez l'installeur `.exe`. Il place OfficeVega dans le menu Démarrer et enregistre `.docx`, `.xlsx`, `.pptx`, `.pdf` et formats voisins, si bien qu'un double-clic sur un fichier l'ouvre.

<!--
## Sous Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # famille Fedora / RHEL
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — s'exécute sur place, sans étape d'installation :

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

Il lui faut l'environnement d'exécution FUSE 2. Si vous préférez ne pas l'installer, lancez-le avec `--appimage-extract-and-run` : le bac à sable fonctionne alors depuis le répertoire extrait.
-->

## Le build que vous exécutez

**Paramètres ▸ À propos** indique le build que vous avez, le canal qu'il suit et où se trouve le projet. Lorsqu'un build plus récent est publié sur ce canal, le même volet propose la mise à jour.

![Paramètres ▸ À propos, avec la version installée, le canal de mise à jour suivi par l'application et le lien vers le site du projet](img/install.png)

<!--
## Trois autres voies

Les trois encapsulent les fichiers publiés au lieu de reconstruire l'application : elles suivent donc les binaires officiels.

- **Flatpak** — installe le `.deb` via le mécanisme `extra-data` de Flatpak et l'exécute sous Zypak, qui adapte le bac à sable d'Electron. L'arborescence `/app` est en lecture seule : les mises à jour passent donc par Flatpak et non par la boîte de dialogue de mise à jour de l'application.
- **Nix** — une expression de paquet que vous compilez depuis une copie du dépôt avec `nix-build packaging/nix` ; voir `packaging/nix`.
- **Docker** — une image de conversion par lots sans interface (`packaging/docker`). Elle convertit un dossier entier de documents Office, Markdown et HTML en PDF via la chaîne d'export de l'application : le résultat est donc celui de Fichier ▸ Exporter. C'est un utilitaire en ligne de commande, pas un serveur.
-->

## La ligne de commande est incluse

Chaque installation livre une commande `officevega` qui parle aux mêmes moteurs que la fenêtre : les deux ne peuvent donc pas se contredire sur un fichier. Elle se trouve dans le paquet de l'application ; `officevega install-cli` la place dans votre `PATH`. Pour ce qu'elle sait faire, voir **Ligne de commande et agents**.

## Assistance

- Site web : [officevega.com](https://officevega.com), versions : [officevega.com/releases](https://officevega.com/releases).
- Aide et retours : [officevega.com/feedback](https://officevega.com/feedback), chaîne Telegram : [t.me/getmyai](https://t.me/getmyai).
- Développeur : [getmyai.io](https://getmyai.io) (Dmitry Filippov), e-mail : [mail@vega.chat](mailto:mail@vega.chat).

# Instalar o OfficeVega

Todas as versões são publicadas na [página de lançamentos](https://officevega.com/releases). Todas vêm de `main`, e os instaladores para Windows estão assinados.

## Escolher o ficheiro para a sua máquina

| Plataforma                           | Requisitos                                            | Ficheiro                |
| ------------------------------------ | ----------------------------------------------------- | ----------------------- |
| **Windows** — a maioria dos PC       | Windows 10+, Intel/AMD                                | instalador `-x64.exe`   |
| **Windows** em Arm                   | Windows 11 em Arm (Snapdragon X e semelhantes)        | instalador `-arm64.exe` |
<!-- as outras plataformas chegam mais tarde; por agora só Windows
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)          |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)            |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 ou mais recente)    | `.deb`                  |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                  |
| **Linux** — qualquer outra           | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`             |
-->

As versões mais antigas permanecem na página de lançamentos.

<!--
## No macOS

Abra o `.dmg` e arraste o **OfficeVega** para as Aplicações. Numa compilação Intel, o primeiro arranque pede-lhe que confirme a abertura: clique com o botão direito na aplicação em Aplicações ▸ Abrir. Isto é o Gatekeeper a encontrar uma imagem de disco que parece não ter assinatura, e não uma transferência danificada.
-->

## No Windows

Execute o instalador `.exe`. Ele coloca o OfficeVega no menu Iniciar e regista `.docx`, `.xlsx`, `.pptx`, `.pdf` e afins, para que um duplo clique num ficheiro o abra.

<!--
## No Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # família Fedora / RHEL
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage**: corre onde está, sem passo de instalação:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

Precisa do runtime FUSE 2. Se preferir não o instalar, execute-o com `--appimage-extract-and-run` e a sandbox funciona a partir do diretório extraído.
-->

## A versão que está a executar

**Definições ▸ Sobre** é onde a aplicação mostra a versão que tem, o canal que segue e onde está o projeto. Quando é publicada uma versão mais recente nesse canal, o mesmo painel oferece a atualização.

![Definições ▸ Sobre, a mostrar a versão instalada, o canal de atualização que a aplicação segue e a ligação ao site do projeto](img/install.png)

<!--
## Mais três vias

As três embrulham os ficheiros publicados em vez de recompilar a aplicação, por isso seguem os binários oficiais.

- **Flatpak**: instala o `.deb` através do mecanismo `extra-data` do Flatpak e executa-o sob o Zypak, que adapta a sandbox própria do Electron. A árvore `/app` é só de leitura, por isso as atualizações passam pelo Flatpak e não pela janela de atualização da aplicação.
- **Nix**: uma expressão de pacote que compila a partir de uma cópia do repositório com `nix-build packaging/nix`; consulte `packaging/nix`.
- **Docker**: uma imagem de conversão em lote sem interface (`packaging/docker`). Converte uma árvore inteira de documentos Office, Markdown e HTML para PDF através da própria cadeia de exportação da aplicação, por isso o resultado é o que Ficheiro ▸ Exportar produziria. É um utilitário de linha de comandos, não um servidor.
-->

## A linha de comandos vem incluída

Todas as instalações incluem um comando `officevega` que usa os mesmos motores que a janela, por isso os dois nunca discordam sobre um ficheiro. Fica dentro do pacote da aplicação; o `officevega install-cli` coloca-o no seu `PATH`. Consulte **Linha de comandos e agentes** para saber o que ele consegue fazer.

## Suporte

- Site: [officevega.com](https://officevega.com), lançamentos: [officevega.com/releases](https://officevega.com/releases).
- Ajuda e feedback: [officevega.com/feedback](https://officevega.com/feedback), canal do Telegram: [t.me/getmyai](https://t.me/getmyai).
- Programador: [getmyai.io](https://getmyai.io) (Dmitry Filippov), email: [mail@vega.chat](mailto:mail@vega.chat).

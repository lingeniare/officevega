# Instalar OfficeVega

Cada versión publicada está en la [página de versiones](https://officevega.com/releases). Todas salen de `main`; los instaladores de Windows están firmados.

## Elija el archivo para su equipo

| Plataforma                           | Requisitos                                            | Archivo                 |
| ------------------------------------ | ----------------------------------------------------- | ----------------------- |
| **Windows** — la mayoría de los PC   | Windows 10+, Intel/AMD                                | instalador `-x64.exe`   |
| **Windows** en Arm                   | Windows 11 en Arm (Snapdragon X y similares)          | instalador `-arm64.exe` |
<!-- las demás plataformas llegarán más adelante; por ahora solo Windows
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)          |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)            |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 o posterior)        | `.deb`                  |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                  |
| **Linux** — cualquier otro           | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`             |
-->

Las versiones anteriores siguen en la página de versiones.

<!--
## En macOS

Abra el `.dmg` y arrastre **OfficeVega** a Aplicaciones. En una compilación para Intel, el primer arranque le pide confirmar la apertura: haga clic derecho en la aplicación dentro de Aplicaciones ▸ Abrir. Es Gatekeeper al encontrarse con una imagen de disco que parece no estar firmada, no una descarga dañada.
-->

## En Windows

Ejecute el instalador `.exe`. Coloca OfficeVega en el menú Inicio y registra `.docx`, `.xlsx`, `.pptx`, `.pdf` y formatos similares como aplicaciones predeterminadas, de modo que al hacer doble clic en un archivo este se abra en OfficeVega.

<!--
## En Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # familia Fedora / RHEL
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage**: se ejecuta donde esté, sin ningún paso de instalación:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

Necesita el entorno de ejecución de FUSE 2. Si prefiere no instalarlo, ejecútelo con `--appimage-extract-and-run` y el sandbox funcionará desde el directorio extraído.
-->

## La versión que está ejecutando

**Configuración ▸ Acerca de** es donde la aplicación muestra la versión que tiene, el canal que sigue y dónde está el proyecto. Cuando se publica una versión más reciente en ese canal, el mismo panel ofrece la actualización.

![Configuración ▸ Acerca de, con la versión instalada, el canal de actualización que sigue la aplicación y el enlace al sitio del proyecto](img/install.png)

<!--
## Tres vías más

Las tres envuelven los archivos publicados en lugar de recompilar la aplicación, así que siguen a los binarios oficiales.

- **Flatpak**: instala el `.deb` mediante el mecanismo `extra-data` de Flatpak y lo ejecuta bajo Zypak, que adapta el propio sandbox de Electron. El árbol `/app` es de solo lectura, así que las actualizaciones pasan por Flatpak y no por el diálogo de actualización de la aplicación.
- **Nix**: una expresión de paquete que usted compila desde una copia local del repositorio con `nix-build packaging/nix`; véase `packaging/nix`.
- **Docker**: una imagen de conversión por lotes sin interfaz (`packaging/docker`). Convierte un árbol entero de documentos de Office, Markdown y HTML a PDF mediante la propia canalización de exportación de la aplicación, así que el resultado es el mismo que produciría Archivo ▸ Exportar. Es una utilidad de línea de comandos, no un servidor.
-->

## La línea de comandos viene incluida

Cada instalación incluye un comando `officevega` que usa los mismos motores que la ventana, de modo que ambos nunca discrepan sobre un archivo. Está dentro del paquete de la aplicación; `officevega install-cli` lo añade a su `PATH`. Vea **Línea de comandos y agentes** para saber qué puede hacer.

## Soporte

- Sitio web: [officevega.com](https://officevega.com), versiones: [officevega.com/releases](https://officevega.com/releases).
- Ayuda y comentarios: [officevega.com/feedback](https://officevega.com/feedback), canal de Telegram: [t.me/getmyai](https://t.me/getmyai).
- Desarrollador: [getmyai.io](https://getmyai.io) (Dmitry Filippov), correo: [mail@vega.chat](mailto:mail@vega.chat).

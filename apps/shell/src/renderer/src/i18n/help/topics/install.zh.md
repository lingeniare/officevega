# 安装 OfficeVega

每个构建都发布在 [Releases 页面](https://officevega.com/releases)。它们全部出自 `main`；Windows 的安装包已签名。

## 选择适合你机器的文件

| 平台                                 | 需求                                                   | 文件                |
| ------------------------------------ | ------------------------------------------------------ | ------------------- |
| **Windows** — 大多数 PC              | Windows 10+、Intel/AMD                                 | `-x64.exe` 安装包   |
| **Windows** on Arm                   | Arm 版 Windows 11（Snapdragon X 等）                   | `-arm64.exe` 安装包 |
<!-- 其他平台以后再推出，目前只支持 Windows
| **macOS** — Apple Silicon            | macOS 11+                                              | `.dmg` (arm64)      |
| **macOS** — Intel                    | macOS 11+                                              | `.dmg` (x64)        |
| **Linux** — Debian / Ubuntu          | x86_64、glibc 2.34+（Ubuntu 22.04 或更新）             | `.deb`              |
| **Linux** — Fedora / RHEL / openSUSE | x86_64、glibc 2.34+（Fedora 35+、RHEL 9+、Leap 15.6+） | `.rpm`              |
| **Linux** — 其他                     | x86_64、glibc 2.34+、FUSE 2                            | `.AppImage`         |
-->

旧版本仍保留在 Releases 页面上。

<!--
## 在 macOS 上

打开 `.dmg`，把 **OfficeVega** 拖进「应用程序」文件夹。Intel 版首次启动时会请你确认打开：在「应用程序」里右键点这个应用 ▸ 打开。这只是 Gatekeeper 遇到一个看起来未签名的磁盘映像，并不是下载损坏。
-->

## 在 Windows 上

运行 `.exe` 安装程序。它会把 OfficeVega 放进开始菜单，并注册 `.docx`、`.xlsx`、`.pptx`、`.pdf` 等格式，双击文件就会用 OfficeVega 打开。

<!--
## 在 Linux 上

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Fedora / RHEL 系列
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — 免安装，放在哪儿就在哪儿运行：

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

它需要 FUSE 2 运行时。如果不想安装它，可以用 `--appimage-extract-and-run` 来运行，沙箱会从解压出来的目录工作。
-->

## 你正在运行的构建

**设置 ▸ 关于** 用来显示你正在使用的构建版本、它跟随的更新渠道，以及项目的所在位置。当该渠道上发布了更新的构建时，同一个面板会提供更新。

![设置 ▸ 关于，显示已安装的版本、应用跟随的更新渠道，以及项目网站链接](img/install.png)

<!--
## 另外三种方式

这三种方式都只是包装已发布的构建产物，而不是重新编译应用，所以跟随的是官方二进制文件。

- **Flatpak** — 通过 Flatpak 的 `extra-data` 机制安装 `.deb`，并在 Zypak 下运行。Zypak 会适配 Electron 自带的沙箱。`/app` 目录是只读的，所以更新要通过 Flatpak 进行，而不是应用内的更新对话框。
- **Nix** — 一个包表达式，用 `nix-build packaging/nix` 从源码检出构建；详见 `packaging/nix`。
- **Docker** — 一个无界面的批量转换镜像（`packaging/docker`）。它通过应用自己的导出流程，把整个目录树里的 Office、Markdown 和 HTML 文档转换为 PDF，输出结果与 文件 ▸ 导出 完全相同。它是一个命令行工具，不是服务器。
-->

## 命令行随包附带

每个安装版本都带有一个 `officevega` 命令，它和窗口使用的是同一套引擎，因此两者对同一个文件不会给出不同的结果。它位于应用包内；执行 `officevega install-cli` 会把它加入你的 `PATH`。它能做什么，请见**命令行与代理**。

## 支持

- 官网：[officevega.com](https://officevega.com)，发布页：[officevega.com/releases](https://officevega.com/releases)。
- 帮助与反馈：[officevega.com/feedback](https://officevega.com/feedback)，Telegram 频道：[t.me/getmyai](https://t.me/getmyai)。
- 开发者：[getmyai.io](https://getmyai.io)（德米特里·菲利波夫），邮箱：[mail@vega.chat](mailto:mail@vega.chat)。
